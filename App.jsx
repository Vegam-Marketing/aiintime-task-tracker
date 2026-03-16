import { useState, useCallback, useEffect, useRef, useMemo } from "react";

const SOURCE_META = {
  Luma:       { bg: "#1a1a2e", color: "#e0aaff", dot: "#c77dff", label: "via Luma" },
  Meetup:     { bg: "#1a2e1a", color: "#95d5b2", dot: "#52b788", label: "via Meetup" },
  Conference: { bg: "#2e1a1a", color: "#ffb3b3", dot: "#ff6b6b", label: "via Conference" },
  Eventbrite: { bg: "#2e2a1a", color: "#ffd166", dot: "#f4a261", label: "via Eventbrite" },
  Other:      { bg: "#1e1e2e", color: "#a0a0b8", dot: "#7c7c96", label: "via Web" },
};

const TIER_META = {
  1: { label: "★ Must Attend", color: "#ff6b6b", bg: "#2e1a1a" },
  2: { label: "◆ Recommended", color: "#f4a261", bg: "#2e2a1a" },
  3: { label: "○ Worth a Look", color: "#7c7c96", bg: "#1e1e2e" },
};

const STATUS_OPTIONS = ["Upcoming", "Registered", "Attended", "Skipped", "Watching"];
const STATUS_COLORS = {
  Upcoming:   { bg: "#1a2e1a", color: "#95d5b2", accent: "#52b788" },
  Registered: { bg: "#1a1a2e", color: "#a0c4ff", accent: "#6c8dff" },
  Attended:   { bg: "#0d2618", color: "#74c69d", accent: "#40916c" },
  Skipped:    { bg: "#1e1e2e", color: "#7c7c96", accent: "#5c5c72" },
  Watching:   { bg: "#2e2a1a", color: "#ffd166", accent: "#f4a261" },
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function parseEventDate(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime()) && d.getFullYear() > 2000) return d;
  } catch {}
  try {
    const m = dateStr.match(/(\w+)\s+(\d{1,2}),?\s*(\d{4})/);
    if (m) { const d = new Date(`${m[1]} ${m[2]}, ${m[3]}`); if (!isNaN(d.getTime())) return d; }
  } catch {}
  try {
    const m = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) { const d = new Date(+m[3], +m[1]-1, +m[2]); if (!isNaN(d.getTime())) return d; }
  } catch {}
  return null;
}

function sameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dayKey(d) { return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }

function Pill({ children, bg, color, dot, small }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: bg, color, fontSize: small ? 9 : 10, fontWeight: 700,
      padding: small ? "2px 6px" : "3px 8px", borderRadius: 6,
      whiteSpace: "nowrap", letterSpacing: 0.3, border: `1px solid ${color}22`,
    }}>
      {dot && <span style={{ width: 5, height: 5, borderRadius: "50%", background: dot, display: "inline-block", flexShrink: 0 }} />}
      {children}
    </span>
  );
}

function SourceBadge({ source }) {
  const src = SOURCE_META[source] || SOURCE_META.Other;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: src.bg, color: src.color,
      fontSize: 10, fontWeight: 700, padding: "4px 9px",
      borderRadius: 6, border: `1px solid ${src.color}30`,
      letterSpacing: 0.3, whiteSpace: "nowrap",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: src.dot, display: "inline-block" }} />
      {src.label}
    </span>
  );
}

/* ══════════════════════════════════════════════
   CALENDAR COMPONENT
   ══════════════════════════════════════════════ */
function Calendar({ events, selectedDate, onSelectDate, onClear }) {
  const [viewDate, setViewDate] = useState(() => {
    if (selectedDate) return new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    return new Date();
  });

  const eventDates = useMemo(() => {
    const map = {};
    events.forEach(ev => {
      const d = parseEventDate(ev.date);
      if (d) {
        const k = dayKey(d);
        if (!map[k]) map[k] = [];
        map[k].push(ev);
      }
    });
    return map;
  }, [events]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const prev = () => setViewDate(new Date(year, month - 1, 1));
  const next = () => setViewDate(new Date(year, month + 1, 1));

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const totalEvents = Object.values(eventDates).reduce((s, a) => s + a.length, 0);
  const datesWithEvents = Object.keys(eventDates).length;

  return (
    <div style={{
      background: "#111118", border: "1px solid #222233", borderRadius: 12,
      padding: "16px 18px", marginBottom: 14,
    }}>
      {/* Summary bar */}
      <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ background: "#161625", borderRadius: 8, padding: "8px 14px", flex: "1 1 auto", textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#e0aaff" }}>{totalEvents}</div>
          <div style={{ fontSize: 8, color: "#5c5c72", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Total Events</div>
        </div>
        <div style={{ background: "#161625", borderRadius: 8, padding: "8px 14px", flex: "1 1 auto", textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#a0c4ff" }}>{datesWithEvents}</div>
          <div style={{ fontSize: 8, color: "#5c5c72", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Event Days</div>
        </div>
        {Object.entries(SOURCE_META).map(([name, meta]) => {
          const count = events.filter(e => e.source === name).length;
          if (!count) return null;
          return (
            <div key={name} style={{ background: "#161625", borderRadius: 8, padding: "8px 14px", flex: "1 1 auto", textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: meta.color }}>{count}</div>
              <div style={{ fontSize: 8, color: "#5c5c72", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{name}</div>
            </div>
          );
        })}
      </div>

      {/* Month nav */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <button onClick={prev} style={{
          background: "#1a1a28", border: "1px solid #2a2a3e", borderRadius: 6,
          color: "#7c7c96", padding: "5px 12px", cursor: "pointer", fontSize: 14, fontFamily: "inherit",
        }}>‹</button>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#eeeef2", letterSpacing: 0.5 }}>
          {MONTHS[month]} {year}
        </div>
        <button onClick={next} style={{
          background: "#1a1a28", border: "1px solid #2a2a3e", borderRadius: 6,
          color: "#7c7c96", padding: "5px 12px", cursor: "pointer", fontSize: 14, fontFamily: "inherit",
        }}>›</button>
      </div>

      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 4 }}>
        {DAYS_SHORT.map(d => (
          <div key={d} style={{
            textAlign: "center", fontSize: 9, fontWeight: 700, color: "#5c5c72",
            padding: "4px 0", letterSpacing: 1, textTransform: "uppercase",
          }}>{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} />;
          const cellDate = new Date(year, month, day);
          const k = dayKey(cellDate);
          const eventsOnDay = eventDates[k] || [];
          const hasEvents = eventsOnDay.length > 0;
          const isSelected = selectedDate && sameDay(cellDate, selectedDate);
          const isToday = sameDay(cellDate, today);

          return (
            <button key={i}
              onClick={() => { if (isSelected) onClear(); else if (hasEvents) onSelectDate(cellDate); }}
              style={{
                position: "relative",
                background: isSelected ? "#c77dff" : isToday ? "#1a1a2e" : hasEvents ? "#161625" : "transparent",
                border: isToday && !isSelected ? "1px solid #c77dff44" : isSelected ? "1px solid #c77dff" : "1px solid transparent",
                borderRadius: 8, padding: "7px 2px 5px", cursor: hasEvents ? "pointer" : "default",
                color: isSelected ? "#0d0d14" : hasEvents ? "#eeeef2" : "#3a3a4e",
                fontSize: 12, fontWeight: hasEvents ? 700 : 500,
                fontFamily: "inherit", textAlign: "center", transition: "all 0.15s",
                minHeight: 44, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
              }}>
              {day}
              {hasEvents && (
                <div style={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}>
                  {eventsOnDay.slice(0, 4).map((ev, j) => {
                    const s = SOURCE_META[ev.source] || SOURCE_META.Other;
                    return <span key={j} style={{ width: 5, height: 5, borderRadius: "50%", background: isSelected ? "#0d0d14" : s.dot }} />;
                  })}
                  {eventsOnDay.length > 4 && (
                    <span style={{ fontSize: 7, color: isSelected ? "#0d0d14" : "#7c7c96", fontWeight: 800, lineHeight: "5px" }}>+{eventsOnDay.length - 4}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected date bar */}
      {selectedDate && (
        <div style={{
          marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "9px 12px", background: "#161625", borderRadius: 8, border: "1px solid #c77dff33",
        }}>
          <div style={{ fontSize: 12, color: "#e0aaff", fontWeight: 700 }}>
            {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            <span style={{ color: "#7c7c96", fontWeight: 500, marginLeft: 10, fontSize: 11 }}>
              {(eventDates[dayKey(selectedDate)] || []).length} event(s)
            </span>
          </div>
          <button onClick={onClear} style={{
            background: "#1e1e2e", border: "1px solid #333", borderRadius: 6,
            padding: "4px 12px", fontSize: 10, color: "#7c7c96", cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
          }}>Clear</button>
        </div>
      )}
    </div>
  );
}


/* ══════════════════════════════════════════════
   EVENT CARD
   ══════════════════════════════════════════════ */
function EventCard({ ev, teamName, onUpdate, onRemove, showAdd, onAdd }) {
  const [open, setOpen] = useState(false);
  const [editNote, setEditNote] = useState(false);
  const [noteText, setNoteText] = useState(ev.teamNote || "");
  const src = SOURCE_META[ev.source] || SOURCE_META.Other;
  const tier = TIER_META[ev.tier] || TIER_META[3];
  const stc = STATUS_COLORS[ev.status || "Upcoming"] || STATUS_COLORS.Upcoming;

  return (
    <div
      style={{
        background: "#111118", borderRadius: 12, overflow: "hidden",
        border: "1px solid #222233", marginBottom: 10, transition: "border-color 0.2s",
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = tier.color + "55")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "#222233")}
    >
      <div style={{ height: 2, background: `linear-gradient(90deg, ${tier.color}, transparent)`, opacity: 0.6 }} />
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
              <Pill bg={src.bg} color={src.color} dot={src.dot}>{ev.source}</Pill>
              {ev.type && <Pill bg="#1e1e2e" color="#a0a0b8">{ev.type}</Pill>}
              <Pill bg={tier.bg} color={tier.color}>{tier.label}</Pill>
              <Pill bg={stc.bg} color={stc.color}>{ev.status || "Upcoming"}</Pill>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#eeeef2", lineHeight: 1.35, marginBottom: 5 }}>{ev.name}</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11.5, color: "#7c7c96" }}>
              {ev.date && <span>📅 {ev.date}</span>}
              {ev.time && <span>⏰ {ev.time}</span>}
              {ev.location && <span>📍 {ev.location}</span>}
            </div>
            {ev.organizer && <div style={{ fontSize: 11, color: "#5c5c72", marginTop: 3 }}>Hosted by {ev.organizer}</div>}
          </div>
          {onUpdate && typeof onUpdate === "function" && onRemove && (
            <select value={ev.status || "Upcoming"}
              onChange={e => onUpdate(ev.id, { status: e.target.value, updatedBy: teamName, updatedAt: new Date().toLocaleDateString() })}
              style={{
                border: `1px solid ${stc.accent}44`, borderRadius: 8, background: stc.bg,
                color: stc.color, fontSize: 11, fontWeight: 700, padding: "5px 7px",
                cursor: "pointer", outline: "none", flexShrink: 0,
              }}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>

        {ev.relevance && (
          <div style={{
            marginTop: 8, background: "#161625", borderRadius: 8, padding: "7px 11px",
            fontSize: 11.5, color: "#a0c4ff", lineHeight: 1.55, borderLeft: "3px solid #6c8dff33",
          }}>{ev.relevance}</div>
        )}

        {ev.teamNote && !editNote && (
          <div style={{
            marginTop: 8, background: "#1e1b15", border: "1px solid #33301a",
            borderRadius: 8, padding: "7px 11px", fontSize: 11, color: "#ffd166",
          }}>
            <strong>{ev.noteBy}</strong> <span style={{ color: "#7c7c60" }}>· {ev.noteAt}</span>
            <div style={{ marginTop: 2, color: "#ccc099" }}>{ev.teamNote}</div>
          </div>
        )}

        {editNote && (
          <div style={{ marginTop: 8 }}>
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
              placeholder="Add a team note..." rows={2}
              style={{
                width: "100%", background: "#0d0d14", border: "1px solid #333", borderRadius: 8,
                padding: "8px 11px", fontSize: 12, color: "#eee", resize: "vertical",
                outline: "none", boxSizing: "border-box", fontFamily: "inherit",
              }} />
            <div style={{ display: "flex", gap: 6, marginTop: 5 }}>
              <button onClick={() => { onUpdate(ev.id, { teamNote: noteText, noteBy: teamName, noteAt: new Date().toLocaleDateString() }); setEditNote(false); }}
                style={{ background: "#e0aaff", color: "#0d0d14", border: "none", borderRadius: 7, padding: "5px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Save</button>
              <button onClick={() => { setEditNote(false); setNoteText(ev.teamNote || ""); }}
                style={{ background: "#1e1e2e", border: "1px solid #333", borderRadius: 7, padding: "5px 14px", fontSize: 11, cursor: "pointer", color: "#7c7c96" }}>Cancel</button>
            </div>
          </div>
        )}

        {open && ev.description && (
          <p style={{ margin: "9px 0 0", fontSize: 12, color: "#8888a0", lineHeight: 1.65 }}>{ev.description}</p>
        )}

        {open && ev.topics && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 7 }}>
            {ev.topics.split(",").map(t => t.trim()).filter(Boolean).map(t => (
              <Pill key={t} bg="#0d2618" color="#74c69d" small>{t}</Pill>
            ))}
          </div>
        )}

        {/* ─── ACTION ROW ─── */}
        <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {ev.url ? (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 0, borderRadius: 7, overflow: "hidden", border: `1px solid ${src.color}30` }}>
              <a href={ev.url} target="_blank" rel="noreferrer" style={{
                fontSize: 11, fontWeight: 700, color: "#a0c4ff", textDecoration: "none",
                background: "#1a1a2e", padding: "5px 10px", display: "inline-flex", alignItems: "center",
              }}>Open Event ↗</a>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                background: src.bg, color: src.color, fontSize: 10, fontWeight: 700,
                padding: "5px 9px", borderLeft: `1px solid ${src.color}20`,
              }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: src.dot, display: "inline-block" }} />
                {src.label}
              </span>
            </div>
          ) : (
            <SourceBadge source={ev.source} />
          )}

          {onUpdate && typeof onUpdate === "function" && onRemove && (
            <button onClick={() => setEditNote(o => !o)} style={{
              fontSize: 11, background: "#1e1b15", border: "1px solid #33301a",
              borderRadius: 6, padding: "4px 10px", cursor: "pointer", color: "#ffd166", fontWeight: 600,
            }}>{ev.teamNote ? "Edit Note" : "Add Note"}</button>
          )}
          <button onClick={() => setOpen(o => !o)} style={{
            fontSize: 11, background: "none", border: "none", color: "#5c5c72", cursor: "pointer", padding: "4px 6px",
          }}>{open ? "▲ Less" : "▼ More"}</button>
          {showAdd && (
            <button onClick={() => onAdd(ev)} style={{
              marginLeft: "auto", fontSize: 11, background: "linear-gradient(135deg,#c77dff,#e0aaff)",
              color: "#0d0d14", border: "none", borderRadius: 7, padding: "5px 14px",
              fontWeight: 800, cursor: "pointer", letterSpacing: 0.3,
            }}>+ Track This</button>
          )}
          {onRemove && (
            <button onClick={() => onRemove(ev.id)} style={{
              marginLeft: showAdd ? "0" : "auto", fontSize: 11, background: "none",
              border: "none", color: "#ff6b6b55", cursor: "pointer", padding: "4px 6px",
            }}>✕ Remove</button>
          )}
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════════ */
export default function App() {
  const [screen, setScreen] = useState("name");
  const [myName, setMyName] = useState("");
  const [nameInput, setNameInput] = useState("");

  const [city, setCity] = useState("");
  const [keywords, setKeywords] = useState("");
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");
  const [results, setResults] = useState([]);
  const [tracker, setTracker] = useState([]);
  const [trackerLoading, setTrackerLoading] = useState(true);
  const [tab, setTab] = useState("tracker");

  const [sf, setSf] = useState("All");
  const [tf, setTf] = useState("All");
  const [stf, setStf] = useState("All");
  const [qf, setQf] = useState("");
  const [calDate, setCalDate] = useState(null);
  const searchRef = useRef(null);

  useEffect(() => { loadTracker(); }, []);

  async function loadTracker() {
    setTrackerLoading(true);
    try {
      const raw = localStorage.getItem("usa_event_tracker_v3");
      if (raw) setTracker(JSON.parse(raw));
    } catch (e) { console.log("Storage init"); }
    setTrackerLoading(false);
  }

  async function persist(list) {
    setTracker(list);
    try { localStorage.setItem("usa_event_tracker_v3", JSON.stringify(list)); }
    catch (e) { console.log("Storage unavailable"); }
  }

  async function updateEv(id, changes) {
    await persist(tracker.map(e => e.id === id ? { ...e, ...changes } : e));
  }

  async function removeEv(id) {
    await persist(tracker.filter(e => e.id !== id));
  }

  async function addToTracker(ev) {
    if (tracker.some(e => e.id === ev.id)) return;
    const item = { ...ev, inTracker: true, addedBy: myName, addedAt: new Date().toLocaleDateString(), status: "Upcoming" };
    await persist([...tracker, item]);
    setResults(prev => prev.map(e => (e.id === ev.id ? { ...e, inTracker: true } : e)));
  }

  const addAllToTracker = async () => {
    const newOnes = results
      .filter(e => !tracker.some(t => t.id === e.id))
      .map(e => ({ ...e, inTracker: true, addedBy: myName, addedAt: new Date().toLocaleDateString(), status: "Upcoming" }));
    if (newOnes.length) {
      await persist([...tracker, ...newOnes]);
      setResults(prev => prev.map(e => ({ ...e, inTracker: true })));
    }
  };

  const runSearch = useCallback(async () => {
    if (!city.trim()) { setError("Please enter a city or region."); return; }
    setLoading(true); setError(""); setLogs([]); setResults([]); setTab("results");
    const log = m => setLogs(p => [...p, m]);
    log(`Searching events in ${city.trim()}...`);
    const kw = keywords.trim() || "tech AI startup";

    const prompt = `You are an event discovery agent. Search the web for real upcoming in-person tech events.

Find upcoming in-person tech and AI events in ${city.trim()} related to: ${kw}.
Search meetup.com, lu.ma, eventbrite.com, and conference listing sites.

Return ONLY a valid JSON array with 6-12 events. Each object must have exactly these fields:
- "name": event name
- "date": date in "Month Day, Year" format (e.g. "April 15, 2026")
- "time": start time
- "location": venue and city
- "organizer": who hosts it
- "source": one of "Luma", "Meetup", "Conference", "Eventbrite", or "Other"
- "type": one of "Meetup", "Conference", "Hackathon", "Networking", "Workshop", "Summit"
- "description": 2-3 sentence description
- "topics": comma-separated topic tags
- "url": link to the event page
- "tier": 1 for must-attend AI/agentic events, 2 for recommended GenAI/ML, 3 for general tech
- "relevance": one sentence on why this event matters

IMPORTANT: Return ONLY the JSON array. No markdown, no code fences, no explanation. Just [ ... ]`;

    try {
      log("Querying Gemini with Google Search...");
      const API_URL = import.meta.env.VITE_API_URL || "/api/search";
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      log("Processing search results...");

      // Log grounding sources if available
      if (data.sources && data.sources.length > 0) {
        data.sources.slice(0, 5).forEach(s => {
          if (s.title) log(`🔎 ${s.title}`);
        });
      }

      const text = data.text || "";
      if (!text.trim()) throw new Error("No response from Gemini. Try again.");

      log("Parsing results...");
      let parsed = [];
      const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      try { parsed = JSON.parse(clean); }
      catch {
        const m = clean.match(/\[[\s\S]*\]/);
        if (m) parsed = JSON.parse(m[0]);
      }
      if (!Array.isArray(parsed) || !parsed.length) throw new Error("No events found. Try a different city or broader keywords.");

      const out = parsed.map((e, i) => ({ ...e, id: `ev_${Date.now()}_${i}`, inTracker: tracker.some(t => t.name === e.name) }));
      setResults(out);
      log(`Found ${out.length} events`);
    } catch (e) { log(`Error: ${e.message}`); setError(e.message); }
    setLoading(false);
  }, [city, keywords, tracker]);

  const filterByDate = (list) => {
    if (!calDate) return list;
    return list.filter(ev => { const d = parseEventDate(ev.date); return d && sameDay(d, calDate); });
  };

  const filtered = filterByDate(tracker.filter(e => {
    if (sf !== "All" && e.source !== sf) return false;
    if (tf !== "All" && String(e.tier) !== tf) return false;
    if (stf !== "All" && (e.status || "Upcoming") !== stf) return false;
    const q = qf.toLowerCase();
    if (q && !e.name?.toLowerCase().includes(q) && !e.topics?.toLowerCase().includes(q) && !e.location?.toLowerCase().includes(q)) return false;
    return true;
  }));

  const exportCSV = list => {
    if (!list.length) return;
    const cols = ["Name","Date","Time","Location","Source","Type","Tier","Status","Organizer","Relevance","URL","Added By","Team Note"];
    const rows = list.map(e => [e.name,e.date,e.time,e.location,e.source,e.type,e.tier,e.status,e.organizer,e.relevance,e.url,e.addedBy,e.teamNote].map(v => `"${String(v||"").replace(/"/g,"'")}"`).join(","));
    const csv = [cols.map(c => `"${c}"`).join(","), ...rows].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `Events_${city || "USA"}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const TabBtn = ({ id, label, count, dot }) => (
    <button onClick={() => setTab(id)} style={{
      padding: "10px 16px", border: "none", cursor: "pointer", background: "transparent",
      fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
      color: tab === id ? "#e0aaff" : "#5c5c72",
      borderBottom: tab === id ? "2px solid #c77dff" : "2px solid transparent",
      transition: "all 0.15s", letterSpacing: 0.5, fontFamily: "inherit",
    }}>
      {label}
      {count !== undefined && (
        <span style={{
          marginLeft: 5, background: tab === id ? "#c77dff22" : "#222233",
          borderRadius: 99, padding: "1px 7px", fontSize: 10, color: tab === id ? "#e0aaff" : "#5c5c72",
        }}>{count}</span>
      )}
    </button>
  );

  /* ══════ WELCOME SCREEN ══════ */
  if (screen === "name") return (
    <div style={{
      fontFamily: "'JetBrains Mono','SF Mono',monospace", background: "#08080f",
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 30% 20%,#c77dff08 0%,transparent 50%),radial-gradient(ellipse at 70% 80%,#6c8dff06 0%,transparent 50%)" }} />
      <div style={{ position: "absolute", inset: 0, opacity: 0.025, backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
      <div style={{
        background: "#111118", border: "1px solid #222233", borderRadius: 16,
        padding: "48px 36px", maxWidth: 400, width: "100%", textAlign: "center",
        position: "relative", boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: "#c77dff", textTransform: "uppercase", marginBottom: 20 }}>Event Radar</div>
        <h2 style={{ margin: "0 0 8px", color: "#eeeef2", fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>USA Tech Events</h2>
        <p style={{ color: "#7c7c96", fontSize: 12.5, margin: "0 0 28px", lineHeight: 1.7 }}>
          Find and track live tech, AI, and startup events<br />across any US city in real time.
        </p>
        <input value={nameInput} onChange={e => setNameInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && nameInput.trim()) { setMyName(nameInput.trim()); setScreen("app"); } }}
          placeholder="Your name" autoFocus
          style={{
            width: "100%", background: "#0d0d14", border: "1px solid #2a2a3e", borderRadius: 10,
            padding: "13px 16px", fontSize: 14, color: "#eee", outline: "none", boxSizing: "border-box",
            marginBottom: 12, textAlign: "center", fontFamily: "inherit", transition: "border-color 0.2s",
          }}
          onFocus={e => (e.target.style.borderColor = "#c77dff")}
          onBlur={e => (e.target.style.borderColor = "#2a2a3e")}
        />
        <button onClick={() => { if (nameInput.trim()) { setMyName(nameInput.trim()); setScreen("app"); } }}
          style={{
            width: "100%", background: "linear-gradient(135deg,#c77dff,#e0aaff)", color: "#0d0d14",
            border: "none", borderRadius: 10, padding: "13px", fontSize: 14, fontWeight: 800, cursor: "pointer", letterSpacing: 0.5,
          }}>
          Launch Tracker →
        </button>
      </div>
    </div>
  );

  /* ══════ MAIN APP ══════ */
  const allEventsForCalendar = [...tracker, ...results.filter(r => !tracker.some(t => t.name === r.name))];

  return (
    <div style={{ fontFamily: "'JetBrains Mono','SF Mono',monospace", background: "#08080f", minHeight: "100vh", color: "#eeeef2" }}>

      {/* HEADER */}
      <div style={{ background: "#0d0d14", borderBottom: "1px solid #1a1a28", padding: "16px 20px 0", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.015, backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        <div style={{ maxWidth: 920, margin: "0 auto", position: "relative" }}>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, color: "#c77dff", textTransform: "uppercase" }}>◈ Event Radar</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#111118", border: "1px solid #222233", borderRadius: 8, padding: "5px 10px" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#52b788" }} />
                <span style={{ fontSize: 11, color: "#7c7c96", fontWeight: 600 }}>{myName}</span>
              </div>
              <button onClick={() => setScreen("name")} style={{ background: "#111118", border: "1px solid #222233", color: "#5c5c72", borderRadius: 8, padding: "5px 10px", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>Switch</button>
            </div>
          </div>

          {/* SEARCH */}
          <div style={{ background: "#111118", border: "1px solid #222233", borderRadius: 12, padding: "14px" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 160px" }}>
                <div style={{ fontSize: 9, color: "#c77dff", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 5 }}>City / Region</div>
                <input ref={searchRef} value={city} onChange={e => setCity(e.target.value)} onKeyDown={e => e.key === "Enter" && runSearch()}
                  placeholder="e.g. San Francisco, CA"
                  style={{ width: "100%", background: "#0d0d14", border: "1px solid #2a2a3e", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#eee", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
              </div>
              <div style={{ flex: "2 1 220px" }}>
                <div style={{ fontSize: 9, color: "#c77dff", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 5 }}>
                  Keywords <span style={{ color: "#5c5c72", fontWeight: 400 }}>(optional)</span>
                </div>
                <input value={keywords} onChange={e => setKeywords(e.target.value)} onKeyDown={e => e.key === "Enter" && runSearch()}
                  placeholder="AI, startup, GenAI, web3..."
                  style={{ width: "100%", background: "#0d0d14", border: "1px solid #2a2a3e", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#eee", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
              </div>
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <button onClick={runSearch} disabled={loading} style={{
                  background: loading ? "#2a2a3e" : "linear-gradient(135deg,#c77dff,#e0aaff)",
                  color: loading ? "#7c7c96" : "#0d0d14", border: "none", borderRadius: 8,
                  padding: "10px 22px", fontSize: 13, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer",
                  height: 42, whiteSpace: "nowrap", letterSpacing: 0.5, fontFamily: "inherit",
                }}>{loading ? "Searching..." : "Search"}</button>
              </div>
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: "#5c5c72", lineHeight: 1.6 }}>
              Try any US city — New York, Austin, Seattle, Miami, Denver, Nashville, Atlanta, Portland...
            </div>
          </div>

          {/* TABS */}
          <div style={{ display: "flex", marginTop: 14, borderBottom: "1px solid #1a1a28", overflowX: "auto" }}>
            <TabBtn id="tracker" label="Tracked" count={tracker.length} />
            <TabBtn id="calendar" label="📅 Calendar" />
            <TabBtn id="results" label="Results" count={results.length || undefined} />
            <TabBtn id="log" label="Agent Log" />
          </div>
        </div>
      </div>

      {/* ═══ CONTENT ═══ */}
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "16px 20px" }}>

        {/* TRACKER TAB */}
        {tab === "tracker" && (
          <>
            <div style={{
              background: "#111118", borderRadius: 10, padding: "10px 13px", marginBottom: 14,
              display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center", border: "1px solid #222233",
            }}>
              <input value={qf} onChange={e => setQf(e.target.value)} placeholder="Filter..."
                style={{ flex: "1 1 120px", background: "#0d0d14", border: "1px solid #2a2a3e", borderRadius: 7, padding: "7px 10px", fontSize: 12, outline: "none", color: "#eee", fontFamily: "inherit" }} />
              {[
                { v: sf, s: setSf, opts: ["All","Luma","Meetup","Conference","Eventbrite","Other"], label: "Source" },
                { v: tf, s: setTf, opts: ["All","1","2","3"], label: "Tier" },
                { v: stf, s: setStf, opts: ["All",...STATUS_OPTIONS], label: "Status" },
              ].map(f => (
                <select key={f.label} value={f.v} onChange={e => f.s(e.target.value)}
                  style={{ background: "#0d0d14", border: "1px solid #2a2a3e", borderRadius: 7, padding: "7px 8px", fontSize: 11, cursor: "pointer", color: "#a0a0b8", fontFamily: "inherit" }}>
                  {f.opts.map(o => <option key={o} value={o}>{o === "All" ? f.label : o}</option>)}
                </select>
              ))}
              <span style={{ fontSize: 10, color: "#5c5c72" }}>{filtered.length} events</span>
              <button onClick={() => exportCSV(filtered)} style={{
                background: "#1a1a2e", color: "#a0c4ff", border: "1px solid #2a2a4e",
                borderRadius: 7, padding: "6px 11px", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }}>Export CSV</button>
              <button onClick={loadTracker} style={{
                background: "#111118", border: "1px solid #222233", borderRadius: 7,
                padding: "6px 9px", fontSize: 11, cursor: "pointer", color: "#5c5c72", fontFamily: "inherit",
              }} title="Refresh">↻</button>
            </div>

            {tracker.length > 0 && (
              <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                {Object.entries(STATUS_COLORS).map(([s, c]) => {
                  const n = tracker.filter(e => (e.status || "Upcoming") === s).length;
                  if (!n) return null;
                  return (
                    <div key={s} style={{
                      background: "#111118", border: `1px solid ${c.accent}33`, borderRadius: 10,
                      padding: "9px 16px", display: "flex", flexDirection: "column", alignItems: "center",
                      minWidth: 70, flex: "1 1 auto",
                    }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: c.color }}>{n}</div>
                      <div style={{ fontSize: 8, color: "#5c5c72", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{s}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {trackerLoading ? (
              <div style={{ textAlign: "center", padding: 40, color: "#5c5c72", fontSize: 12 }}>Loading...</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "50px 20px" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#7c7c96", marginBottom: 6 }}>
                  {tracker.length === 0 ? "No tracked events yet" : "No events match your filters"}
                </div>
                <div style={{ fontSize: 12, color: "#5c5c72", maxWidth: 340, margin: "0 auto", lineHeight: 1.7 }}>
                  Search for events, then click <strong style={{ color: "#e0aaff" }}>+ Track This</strong> to add them here.
                </div>
              </div>
            ) : filtered.map(ev => (
              <EventCard key={ev.id} ev={ev} teamName={myName} onUpdate={updateEv} onRemove={removeEv} />
            ))}
          </>
        )}

        {/* CALENDAR TAB */}
        {tab === "calendar" && (
          <>
            <Calendar events={allEventsForCalendar} selectedDate={calDate} onSelectDate={setCalDate} onClear={() => setCalDate(null)} />

            {calDate ? (
              <>
                {filterByDate(tracker).length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#c77dff", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Tracked Events</div>
                    {filterByDate(tracker).map(ev => (
                      <EventCard key={ev.id} ev={ev} teamName={myName} onUpdate={updateEv} onRemove={removeEv} />
                    ))}
                  </div>
                )}
                {filterByDate(results.filter(r => !tracker.some(t => t.name === r.name))).length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#a0c4ff", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Search Results</div>
                    {filterByDate(results.filter(r => !tracker.some(t => t.name === r.name))).map(ev => (
                      <EventCard key={ev.id} ev={ev} teamName={myName} onUpdate={null} onRemove={null} showAdd={!ev.inTracker} onAdd={addToTracker} />
                    ))}
                  </div>
                )}
                {filterByDate(allEventsForCalendar).length === 0 && (
                  <div style={{ textAlign: "center", padding: "30px 20px", color: "#5c5c72", fontSize: 12 }}>No events on this date.</div>
                )}
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "24px 20px" }}>
                <div style={{ fontSize: 13, color: "#7c7c96", lineHeight: 1.7 }}>
                  {allEventsForCalendar.length > 0
                    ? "Click on a highlighted date to view events for that day."
                    : "No events yet — search for events in a city to populate the calendar."}
                </div>
                {allEventsForCalendar.length > 0 && (
                  <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 12, flexWrap: "wrap" }}>
                    {Object.entries(SOURCE_META).map(([name, meta]) => {
                      const count = allEventsForCalendar.filter(e => e.source === name).length;
                      if (!count) return null;
                      return (
                        <div key={name} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#5c5c72" }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: meta.dot, display: "inline-block" }} />
                          {name}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* RESULTS TAB */}
        {tab === "results" && (
          <>
            {loading && (
              <div style={{ textAlign: "center", padding: "48px 20px" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#eeeef2", marginBottom: 6 }}>Scanning live event platforms...</div>
                <div style={{ fontSize: 11, color: "#5c5c72", marginBottom: 16 }}>Gemini + Google Search → Meetup · Luma · Eventbrite · Conferences</div>
                <div style={{
                  maxWidth: 420, margin: "0 auto", background: "#111118", border: "1px solid #222233",
                  borderRadius: 10, padding: "12px 16px", fontSize: 11, color: "#5c5c72", fontFamily: "inherit", textAlign: "left",
                }}>
                  {logs.map((l, i) => (
                    <div key={i} style={{
                      marginBottom: 3,
                      color: l.startsWith("Found") ? "#52b788" : l.startsWith("Error") ? "#ff6b6b" : l.startsWith("🔎") ? "#c77dff" : "#5c5c72",
                    }}>{l}</div>
                  ))}
                  <span style={{ display: "inline-block", width: 8, height: 14, background: "#c77dff", animation: "blink 1s steps(1) infinite", verticalAlign: "text-bottom" }} />
                  <style>{`@keyframes blink{0%,50%{opacity:1}51%,100%{opacity:0}}`}</style>
                </div>
              </div>
            )}

            {error && !loading && (
              <div style={{ background: "#1e1215", border: "1px solid #3d1a1a", borderRadius: 10, padding: "12px 16px", color: "#ff6b6b", fontSize: 12, marginBottom: 12 }}>{error}</div>
            )}

            {!loading && results.length === 0 && !error && (
              <div style={{ textAlign: "center", padding: "50px 20px", color: "#5c5c72" }}>
                <div style={{ fontSize: 13, lineHeight: 1.7 }}>Enter a city and keywords above to discover events.</div>
              </div>
            )}

            {!loading && results.length > 0 && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#7c7c96" }}>{results.length} events in {city}</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => { setTab("calendar"); setCalDate(null); }} style={{
                      background: "#1a1a2e", color: "#e0aaff", border: "1px solid #2a2a4e", borderRadius: 8,
                      padding: "7px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                    }}>📅 View on Calendar</button>
                    <button onClick={addAllToTracker} style={{
                      background: "#c77dff", color: "#0d0d14", border: "none", borderRadius: 8,
                      padding: "7px 14px", fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", letterSpacing: 0.5,
                    }}>+ Track All</button>
                  </div>
                </div>
                {results.map(ev => (
                  <div key={ev.id}>
                    <EventCard ev={ev} teamName={myName} onUpdate={null} onRemove={null} showAdd={!ev.inTracker} onAdd={addToTracker} />
                    {ev.inTracker && (
                      <div style={{
                        marginTop: -10, marginBottom: 10, textAlign: "center", background: "#0d2618",
                        borderBottomLeftRadius: 12, borderBottomRightRadius: 12, padding: "6px",
                        fontSize: 10, color: "#52b788", fontWeight: 700, letterSpacing: 0.5,
                      }}>✓ Tracked</div>
                    )}
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {/* LOG TAB */}
        {tab === "log" && (
          <div style={{
            background: "#111118", border: "1px solid #222233", borderRadius: 12,
            padding: "16px 18px", fontSize: 11, color: "#5c5c72", minHeight: 160, fontFamily: "inherit",
          }}>
            <div style={{ color: "#c77dff", fontWeight: 700, marginBottom: 10, fontSize: 11, letterSpacing: 1, textTransform: "uppercase" }}>Agent Activity</div>
            {logs.length === 0 ? (
              <div style={{ color: "#3a3a4e" }}>No activity — run a search to see live agent steps.</div>
            ) : logs.map((l, i) => (
              <div key={i} style={{
                marginBottom: 3,
                color: l.startsWith("Found") ? "#52b788" : l.startsWith("Error") ? "#ff6b6b" : l.startsWith("🔎") ? "#c77dff" : "#5c5c72",
              }}>
                <span style={{ color: "#3a3a4e", marginRight: 6 }}>{String(i + 1).padStart(2, "0")}</span>{l}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
