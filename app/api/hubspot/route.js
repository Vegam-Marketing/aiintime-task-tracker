import { NextResponse } from "next/server";

const HUBSPOT_API = "https://api.hubapi.com/crm/v3/objects/contacts/search";

async function searchContacts(token, filters) {
  const body = {
    filterGroups: [{ filters }],
    limit: 1,
    properties: ["firstname"],
  };

  const res = await fetch(HUBSPOT_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("HubSpot API error:", err);
    throw new Error(`HubSpot API ${res.status}`);
  }

  const data = await res.json();
  return data.total || 0;
}

export async function POST(req) {
  try {
    const { dateFrom, dateTo, eventNames } = await req.json();

    const token = process.env.HUBSPOT_ACCESS_TOKEN;
    if (!token) return NextResponse.json({ error: "HUBSPOT_ACCESS_TOKEN not configured in Vercel env vars" }, { status: 500 });

    // Date filters on createdate
    const dateFilters = [];
    if (dateFrom) dateFilters.push({ propertyName: "createdate", operator: "GTE", value: new Date(dateFrom).getTime().toString() });
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      dateFilters.push({ propertyName: "createdate", operator: "LTE", value: end.getTime().toString() });
    }

    // Event name filter
    const eventFilter = eventNames && eventNames.length > 0
      ? [{ propertyName: "event_name", operator: "IN", values: eventNames }]
      : [];

    const baseFilters = [...eventFilter, ...dateFilters];

    // 1: Contacts Created in date range
    const createdCount = await searchContacts(token, [...baseFilters]);

    // 2: Contacts Contacted (Last Call Outcome exists)
    const contactedCount = await searchContacts(token, [
      ...baseFilters,
      { propertyName: "jc_last_call_outcome", operator: "HAS_PROPERTY" },
    ]);

    // 3: Calls Answered (Last Call Outcome = Connected)
    const connectedCount = await searchContacts(token, [
      ...baseFilters,
      { propertyName: "jc_last_call_outcome", operator: "EQ", value: "Connected" },
    ]);

    // 4: Leads Generated (Disposition = Interested - Appointment Set)
    const leadsCount = await searchContacts(token, [
      ...baseFilters,
      { propertyName: "jc_last_call_disposition_sd", operator: "EQ", value: "Interested - Appointment Set" },
    ]);

    return NextResponse.json({
      created: createdCount,
      contacted: contactedCount,
      connected: connectedCount,
      leads: leadsCount,
      dateFrom,
      dateTo,
      eventNames: eventNames || [],
    });
  } catch (err) {
    console.error("HubSpot error:", err);
    return NextResponse.json({ error: err.message || "HubSpot query failed" }, { status: 500 });
  }
}
