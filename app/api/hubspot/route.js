import { NextResponse } from "next/server";

const HUBSPOT_API = "https://api.hubapi.com/crm/v3/objects/contacts/search";

async function searchContacts(token, filters, limit = 1, properties = ["firstname"], offset = 0) {
  const body = {
    filterGroups: [{ filters }],
    limit,
    properties,
    after: offset > 0 ? offset : undefined,
  };

  const res = await fetch(HUBSPOT_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("HubSpot API error:", err);
    throw new Error(`HubSpot API ${res.status}`);
  }

  return await res.json();
}

export async function POST(req) {
  try {
    const { dateFrom, dateTo, eventNames, metric } = await req.json();

    const token = process.env.HUBSPOT_ACCESS_TOKEN;
    if (!token) return NextResponse.json({ error: "HUBSPOT_ACCESS_TOKEN not configured" }, { status: 500 });

    const portalId = process.env.HUBSPOT_PORTAL_ID || "243237215";

    const dateFilters = [];
    if (dateFrom) dateFilters.push({ propertyName: "createdate", operator: "GTE", value: new Date(dateFrom).getTime().toString() });
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      dateFilters.push({ propertyName: "createdate", operator: "LTE", value: end.getTime().toString() });
    }

    const eventFilter = eventNames && eventNames.length > 0
      ? [{ propertyName: "event_name", operator: "IN", values: eventNames }]
      : [];

    const baseFilters = [...eventFilter, ...dateFilters];

    // If metric is specified, return contact list for that metric
    if (metric) {
      let filters = [...baseFilters];
      if (metric === "contacted") filters.push({ propertyName: "jc_last_call_outcome", operator: "HAS_PROPERTY" });
      else if (metric === "connected") filters.push({ propertyName: "jc_last_call_outcome", operator: "EQ", value: "Connected" });
      else if (metric === "leads") filters.push({ propertyName: "jc_last_call_disposition_sd", operator: "EQ", value: "Interested - Appointment Set" });

      const data = await searchContacts(token, filters, 100, [
        "firstname", "lastname", "email", "company", "event_name",
        "jc_last_call_outcome", "jc_last_call_disposition_sd", "createdate"
      ]);

      const contacts = (data.results || []).map((c) => ({
        id: c.id,
        name: [c.properties.firstname, c.properties.lastname].filter(Boolean).join(" ") || c.properties.email || "Unknown",
        email: c.properties.email || "",
        company: c.properties.company || "",
        event: c.properties.event_name || "",
        callOutcome: c.properties.jc_last_call_outcome || "",
        disposition: c.properties.jc_last_call_disposition_sd || "",
        created: c.properties.createdate || "",
        url: `https://app.hubspot.com/contacts/${portalId}/record/0-1/${c.id}`,
      }));

      return NextResponse.json({ contacts, total: data.total || 0 });
    }

    // Default: return counts
    const [createdRes, contactedRes, connectedRes, leadsRes] = await Promise.all([
      searchContacts(token, [...baseFilters]),
      searchContacts(token, [...baseFilters, { propertyName: "jc_last_call_outcome", operator: "HAS_PROPERTY" }]),
      searchContacts(token, [...baseFilters, { propertyName: "jc_last_call_outcome", operator: "EQ", value: "Connected" }]),
      searchContacts(token, [...baseFilters, { propertyName: "jc_last_call_disposition_sd", operator: "EQ", value: "Interested - Appointment Set" }]),
    ]);

    return NextResponse.json({
      created: createdRes.total || 0,
      contacted: contactedRes.total || 0,
      connected: connectedRes.total || 0,
      leads: leadsRes.total || 0,
      portalId,
    });
  } catch (err) {
    console.error("HubSpot error:", err);
    return NextResponse.json({ error: err.message || "HubSpot query failed" }, { status: 500 });
  }
}
