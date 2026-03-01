"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";

const OWNERS = ["John", "Jinks", "Revathy", "Roshan", "Abilash"];
const OWNER_COLORS = {
  John: { bg: "#10B981", light: "#D1FAE5", text: "#065F46" },
  Jinks: { bg: "#8B5CF6", light: "#EDE9FE", text: "#5B21B6" },
  Revathy: { bg: "#0EA5E9", light: "#E0F2FE", text: "#075985" },
  Roshan: { bg: "#F59E0B", light: "#FEF3C7", text: "#92400E" },
  Abilash: { bg: "#EC4899", light: "#FCE7F3", text: "#9D174D" },
};

const parseDate = (str) => {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const fmt = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d, n) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};
const diffDays = (a, b) => Math.round((a - b) / 86400000);
const getMonday = (d) => {
  const r = new Date(d);
  const day = r.getDay();
  r.setDate(r.getDate() - (day === 0 ? 6 : day - 1));
  return r;
};

const today = new Date();
const mon = getMonday(today);

const STATUS_OPTIONS = ["Not Started", "In Progress", "Done", "Blocked"];
const STATUS_STYLE = {
  "Not Started": { bg: "#F1F5F9", text: "#475569" },
  "In Progress": { bg: "#DBEAFE", text: "#1E40AF" },
  Done: { bg: "#D1FAE5", text: "#065F46" },
  Blocked: { bg: "#FEE2E2", text: "#991B1B" },
};

// ─── Gantt Chart Component ──────────────────────────────────────────
function GanttChart({ tasks, calendarStart, calendarDays, onUpdateTask }) {
  const calStart = parseDate(calendarStart);
  const dates = [];
  for (let i = 0; i < calendarDays; i++) dates.push(fmt(addDays(calStart, i)));

  const dayWidth = Math.max(44, Math.floor(780 / calendarDays));
  const rowHeight = 36;
  const labelWidth = 200;

  const [drag, setDrag] = useState(null);

  const snapToDay = useCallback((px) => Math.round(px / dayWidth), [dayWidth]);

  const handleMouseDown = useCallback((e, taskId, mode, origStart, origEnd) => {
    e.preventDefault();
    e.stopPropagation();
    setDrag({ taskId, mode, startX: e.clientX, origStart, origEnd });
  }, []);

  useEffect(() => {
    if (!drag) return;
    const handleMouseMove = (e) => {
      const dx = e.clientX - drag.startX;
      const dayDelta = snapToDay(dx);
      const origS = parseDate(drag.origStart);
      const origE = parseDate(drag.origEnd);
      if (drag.mode === "move") {
        onUpdateTask(drag.taskId, "start", fmt(addDays(origS, dayDelta)));
        onUpdateTask(drag.taskId, "end", fmt(addDays(origE, dayDelta)));
      } else if (drag.mode === "left") {
        const ns = addDays(origS, dayDelta);
        if (ns <= origE) onUpdateTask(drag.taskId, "start", fmt(ns));
      } else if (drag.mode === "right") {
        const ne = addDays(origE, dayDelta);
        if (ne >= origS) onUpdateTask(drag.taskId, "end", fmt(ne));
      }
    };
    const handleMouseUp = () => setDrag(null);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [drag, snapToDay, onUpdateTask]);

  const dayLabels = dates.map((d) => {
    const dt = parseDate(d);
    return {
      date: d,
      day: dt.toLocaleDateString("en-US", { weekday: "narrow" }),
      num: dt.getDate(),
      month: dt.toLocaleDateString("en-US", { month: "short" }),
      isWeekend: dt.getDay() === 0 || dt.getDay() === 6,
      isToday: fmt(today) === d,
    };
  });

  const months = [];
  let currentMonth = null;
  dayLabels.forEach((d) => {
    const key = d.month;
    if (key !== currentMonth) {
      months.push({ label: `${d.month} ${parseDate(d.date).getFullYear()}`, span: 1 });
      currentMonth = key;
    } else {
      months[months.length - 1].span++;
    }
  });

  if (tasks.length === 0)
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#94A3B8", fontSize: 14 }}>
        Add tasks above to see the Gantt chart
      </div>
    );

  const todayIdx = dayLabels.findIndex((d) => d.isToday);

  const handleStyle = (side) => ({
    position: "absolute",
    top: 0,
    [side]: 0,
    width: 8,
    height: "100%",
    cursor: side === "left" ? "w-resize" : "e-resize",
    borderRadius: side === "left" ? "5px 0 0 5px" : "0 5px 5px 0",
    background: "transparent",
    zIndex: 4,
  });

  return (
    <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid #E2E8F0", userSelect: drag ? "none" : "auto" }}>
      <div style={{ display: "flex", minWidth: labelWidth + calendarDays * dayWidth }}>
        <div style={{ width: labelWidth, minWidth: labelWidth, borderRight: "2px solid #E2E8F0", background: "#F8FAFC" }}>
          <div style={{ height: 24, borderBottom: "1px solid #E2E8F0" }} />
          <div style={{ height: 40, display: "flex", alignItems: "center", padding: "0 12px", borderBottom: "2px solid #E2E8F0", fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.8 }}>
            Task / Owner
          </div>
          {tasks.map((t) => (
            <div key={t.id} style={{ height: rowHeight, display: "flex", alignItems: "center", padding: "0 10px", borderBottom: "1px solid #F1F5F9", gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: OWNER_COLORS[t.owner]?.bg || "#94A3B8", flexShrink: 0 }} />
              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 11, fontWeight: 500, color: "#334155" }}>
                {t.task || "Untitled"}
              </div>
            </div>
          ))}
        </div>

        <div style={{ flex: 1, minWidth: calendarDays * dayWidth }}>
          <div style={{ display: "flex", height: 24, borderBottom: "1px solid #E2E8F0", background: "#F8FAFC" }}>
            {months.map((m, i) => (
              <div key={i} style={{ width: m.span * dayWidth, minWidth: m.span * dayWidth, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#475569", borderRight: "1px solid #E2E8F0" }}>
                {m.label}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", height: 40, borderBottom: "2px solid #E2E8F0" }}>
            {dayLabels.map((d, i) => (
              <div key={i} style={{ width: dayWidth, minWidth: dayWidth, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRight: "1px solid #F1F5F9", background: d.isToday ? "#EEF2FF" : d.isWeekend ? "#F8FAFC" : "#fff", position: "relative" }}>
                <span style={{ fontWeight: 600, color: d.isToday ? "#4F46E5" : d.isWeekend ? "#CBD5E1" : "#64748B", fontSize: 9 }}>
                  {d.day} {d.month}
                </span>
                <span style={{ fontWeight: 700, color: d.isToday ? "#4F46E5" : d.isWeekend ? "#CBD5E1" : "#334155", fontSize: 12 }}>
                  {d.num}
                </span>
                {d.isToday && <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: 4, height: 4, borderRadius: "50%", background: "#4F46E5" }} />}
              </div>
            ))}
          </div>

          {tasks.map((t) => {
            const startD = parseDate(t.start);
            const endD = parseDate(t.end);
            const startOffset = diffDays(startD, calStart);
            const endOffset = diffDays(endD, calStart);
            const visStart = Math.max(0, startOffset);
            const visEnd = Math.min(calendarDays - 1, endOffset);
            const barDays = visEnd - visStart + 1;
            const isVisible = visEnd >= 0 && visStart < calendarDays && barDays > 0;
            const ownerColor = OWNER_COLORS[t.owner] || { bg: "#94A3B8" };
            const isBlocked = t.status === "Blocked";
            const isDone = t.status === "Done";
            const extendsLeft = startOffset < 0;
            const extendsRight = endOffset >= calendarDays;
            const isDragging = drag?.taskId === t.id;

            return (
              <div key={t.id} style={{ height: rowHeight, position: "relative", borderBottom: "1px solid #F1F5F9", display: "flex" }}>
                {dayLabels.map((d, i) => (
                  <div key={i} style={{ width: dayWidth, minWidth: dayWidth, borderRight: "1px solid #F8FAFC", background: d.isToday ? "#EEF2FF22" : d.isWeekend ? "#FAFBFC" : "transparent" }} />
                ))}
                {todayIdx >= 0 && (
                  <div style={{ position: "absolute", top: 0, bottom: 0, left: todayIdx * dayWidth + dayWidth / 2, width: 1, background: "#4F46E544", zIndex: 1 }} />
                )}
                {isVisible && (
                  <div
                    onMouseDown={(e) => handleMouseDown(e, t.id, "move", t.start, t.end)}
                    style={{
                      position: "absolute", top: 5, left: visStart * dayWidth + 2, width: barDays * dayWidth - 4, height: rowHeight - 10,
                      borderRadius: 5,
                      borderTopLeftRadius: extendsLeft ? 0 : 5, borderBottomLeftRadius: extendsLeft ? 0 : 5,
                      borderTopRightRadius: extendsRight ? 0 : 5, borderBottomRightRadius: extendsRight ? 0 : 5,
                      background: isBlocked
                        ? `repeating-linear-gradient(135deg, ${ownerColor.bg}CC, ${ownerColor.bg}CC 4px, ${ownerColor.bg}88 4px, ${ownerColor.bg}88 8px)`
                        : isDone ? `${ownerColor.bg}55`
                        : `linear-gradient(90deg, ${ownerColor.bg}DD, ${ownerColor.bg}AA)`,
                      display: "flex", alignItems: "center", padding: "0 10px", overflow: "hidden",
                      boxShadow: isDragging ? `0 4px 14px ${ownerColor.bg}55` : `0 1px 3px ${ownerColor.bg}33`,
                      border: isBlocked ? "1px solid #EF444466" : isDone ? `1px dashed ${ownerColor.bg}88` : isDragging ? `2px solid ${ownerColor.bg}` : "none",
                      cursor: "grab", zIndex: isDragging ? 10 : 2,
                    }}
                  >
                    {!extendsLeft && (
                      <div
                        onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, t.id, "left", t.start, t.end); }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = `${ownerColor.bg}44`)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        style={handleStyle("left")}
                      />
                    )}
                    <span style={{ fontSize: 9, fontWeight: 600, color: isDone ? ownerColor.bg : "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textDecoration: isDone ? "line-through" : "none", pointerEvents: "none" }}>
                      {t.owner}{barDays * dayWidth > 110 ? ` — ${t.task}` : ""}
                    </span>
                    {isBlocked && <span style={{ marginLeft: 3, fontSize: 9, pointerEvents: "none" }}>⚠️</span>}
                    {extendsRight && <span style={{ marginLeft: "auto", fontSize: 10, color: isDone ? ownerColor.bg : "#fff", pointerEvents: "none" }}>→</span>}
                    {!extendsRight && (
                      <div
                        onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, t.id, "right", t.start, t.end); }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = `${ownerColor.bg}44`)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        style={handleStyle("right")}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function TaskTracker() {
  const [tasks, setTasks] = useState([]);
  const [nextId, setNextId] = useState(1);
  const [filterOwner, setFilterOwner] = useState("All");
  const [view, setView] = useState("both");
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const dragNode = useRef(null);
  const [calStart, setCalStart] = useState(fmt(mon));
  const [calSpan, setCalSpan] = useState(14);

  // Persistence states
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("saved"); // saved | saving | error
  const saveTimeout = useRef(null);
  const isFirstLoad = useRef(true);

  // ─── Load tasks from API on mount ───
  useEffect(() => {
    fetch("/api/tasks")
      .then((r) => r.json())
      .then((data) => {
        if (data.tasks && data.tasks.length > 0) {
          setTasks(data.tasks);
          setNextId(data.nextId || data.tasks.length + 1);
        } else {
          // First time — seed with defaults
          const defaults = getDefaultTasks();
          setTasks(defaults);
          setNextId(defaults.length + 1);
        }
        setLoading(false);
        isFirstLoad.current = false;
      })
      .catch((err) => {
        console.error("Failed to load tasks:", err);
        const defaults = getDefaultTasks();
        setTasks(defaults);
        setNextId(defaults.length + 1);
        setLoading(false);
        isFirstLoad.current = false;
      });
  }, []);

  // ─── Auto-save with debounce (1.5s after last change) ───
  useEffect(() => {
    if (isFirstLoad.current || loading) return;

    setSaveStatus("saving");
    if (saveTimeout.current) clearTimeout(saveTimeout.current);

    saveTimeout.current = setTimeout(() => {
      fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks }),
      })
        .then((r) => {
          if (r.ok) setSaveStatus("saved");
          else setSaveStatus("error");
        })
        .catch(() => setSaveStatus("error"));
    }, 1500);

    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [tasks, loading]);

  // ─── Navigation ───
  const goToday = () => setCalStart(fmt(getMonday(today)));
  const goPrev = () => setCalStart(fmt(addDays(parseDate(calStart), -7)));
  const goNext = () => setCalStart(fmt(addDays(parseDate(calStart), 7)));

  const updateTask = useCallback((id, field, value) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  }, []);

  const addTask = () => {
    setTasks((prev) => [
      ...prev,
      { id: nextId, task: "", start: fmt(mon), end: fmt(mon), owner: OWNERS[0], bottleneck: "", status: "Not Started" },
    ]);
    setNextId((n) => n + 1);
  };

  const deleteTask = (id) => setTasks((prev) => prev.filter((t) => t.id !== id));

  // Table row drag
  const handleDragStart = useCallback((e, index) => {
    setDragIndex(index);
    dragNode.current = e.target.closest("tr");
    e.dataTransfer.effectAllowed = "move";
    setTimeout(() => { if (dragNode.current) dragNode.current.style.opacity = "0.4"; }, 0);
  }, []);
  const handleDragEnter = useCallback((e, index) => { e.preventDefault(); if (dragIndex === null || dragIndex === index) return; setDragOverIndex(index); }, [dragIndex]);
  const handleDragOver = useCallback((e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }, []);
  const handleDrop = useCallback((e, dropIndex) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) return;
    setTasks((prev) => { const u = [...prev]; const [d] = u.splice(dragIndex, 1); u.splice(dropIndex, 0, d); return u; });
    setDragIndex(null); setDragOverIndex(null);
  }, [dragIndex]);
  const handleDragEnd = useCallback(() => { if (dragNode.current) dragNode.current.style.opacity = "1"; setDragIndex(null); setDragOverIndex(null); dragNode.current = null; }, []);

  const filtered = filterOwner === "All" ? tasks : tasks.filter((t) => t.owner === filterOwner);
  const stats = { total: filtered.length, done: filtered.filter((t) => t.status === "Done").length, blocked: filtered.filter((t) => t.status === "Blocked").length, inProgress: filtered.filter((t) => t.status === "In Progress").length };

  const calStartDate = parseDate(calStart);
  const calEndDate = addDays(calStartDate, calSpan - 1);
  const rangeLabel = `${calStartDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} — ${calEndDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  // ─── Loading screen ───
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8FAFC", fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#1E293B", marginBottom: 8 }}>Loading tasks...</div>
          <div style={{ fontSize: 14, color: "#94A3B8" }}>Connecting to Google Sheets</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "'DM Sans', -apple-system, sans-serif", padding: "24px 20px" }}>
      {/* Header */}
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0F172A", letterSpacing: -0.5 }}>
              Weekly Task Tracker<span style={{ color: "#94A3B8", fontWeight: 400, fontSize: 16 }}> / aiintime.com</span>
            </h1>
            {/* Save indicator */}
            <span style={{
              fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 12,
              background: saveStatus === "saved" ? "#D1FAE5" : saveStatus === "saving" ? "#FEF3C7" : "#FEE2E2",
              color: saveStatus === "saved" ? "#065F46" : saveStatus === "saving" ? "#92400E" : "#991B1B",
              transition: "all 0.3s",
            }}>
              {saveStatus === "saved" ? "✓ Saved" : saveStatus === "saving" ? "Saving..." : "⚠ Error"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
            {[
              { label: `${stats.total} Total`, bg: "#F1F5F9", color: "#475569" },
              { label: `${stats.inProgress} In Progress`, bg: "#DBEAFE", color: "#1E40AF" },
              { label: `${stats.done} Done`, bg: "#D1FAE5", color: "#065F46" },
              { label: `${stats.blocked} Blocked`, bg: "#FEE2E2", color: "#991B1B" },
            ].map((s) => (
              <span key={s.label} style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: s.bg, color: s.color }}>{s.label}</span>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12, fontWeight: 500, background: "#fff", cursor: "pointer", outline: "none" }}>
            <option value="All">All Owners</option>
            {OWNERS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <div style={{ display: "flex", borderRadius: 8, border: "1px solid #E2E8F0", overflow: "hidden" }}>
            {[["both", "Table + Gantt"], ["table", "Table"], ["gantt", "Gantt"]].map(([val, label]) => (
              <button key={val} onClick={() => setView(val)} style={{ padding: "6px 12px", fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer", background: view === val ? "#1E293B" : "#fff", color: view === val ? "#fff" : "#64748B" }}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      {(view === "both" || view === "table") && (
        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.05)", marginBottom: 20, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 960, fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#1E293B" }}>
                {["", "#", "Task", "Owner", "Start", "End", "Status", "Bottleneck / Notes", ""].map((h, i) => (
                  <th key={i} style={{ padding: "10px 8px", textAlign: "left", color: "#E2E8F0", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, whiteSpace: "nowrap", width: i === 0 ? 32 : i === 1 ? 36 : undefined }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => {
                const sStyle = STATUS_STYLE[t.status];
                const globalIndex = tasks.findIndex((x) => x.id === t.id);
                const isDragOver = dragOverIndex === globalIndex && dragIndex !== globalIndex;
                return (
                  <tr key={t.id} draggable={filterOwner === "All"} onDragStart={(e) => handleDragStart(e, globalIndex)} onDragEnter={(e) => handleDragEnter(e, globalIndex)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, globalIndex)} onDragEnd={handleDragEnd}
                    style={{ borderBottom: "1px solid #F1F5F9", background: isDragOver ? "#EEF2FF" : i % 2 === 0 ? "#fff" : "#FAFBFC", borderTop: isDragOver ? "2px solid #6366F1" : "none" }}>
                    <td style={{ padding: "6px 4px 6px 8px", width: 32, cursor: filterOwner === "All" ? "grab" : "default" }}>
                      {filterOwner === "All" && <span style={{ color: "#CBD5E1", fontSize: 16, userSelect: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>⠿</span>}
                    </td>
                    <td style={{ padding: "6px 4px", width: 36, fontSize: 11, color: "#94A3B8", fontWeight: 600, textAlign: "center" }}>{i + 1}</td>
                    <td style={{ padding: "6px 8px", minWidth: 200 }}>
                      <input value={t.task} onChange={(e) => updateTask(t.id, "task", e.target.value)} placeholder="Task name..." style={{ width: "100%", border: "1px solid transparent", borderRadius: 6, padding: "5px 8px", fontSize: 13, fontWeight: 500, color: "#1E293B", background: "transparent", outline: "none" }} onFocus={(e) => (e.target.style.border = "1px solid #CBD5E1")} onBlur={(e) => (e.target.style.border = "1px solid transparent")} />
                    </td>
                    <td style={{ padding: "6px 8px", width: 110 }}>
                      <select value={t.owner} onChange={(e) => updateTask(t.id, "owner", e.target.value)} style={{ width: "100%", border: "1px solid #E2E8F0", borderRadius: 6, padding: "5px 6px", fontSize: 12, fontWeight: 600, color: OWNER_COLORS[t.owner]?.text || "#334155", background: OWNER_COLORS[t.owner]?.light || "#F1F5F9", cursor: "pointer", outline: "none" }}>
                        {OWNERS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: "6px 8px", width: 128 }}>
                      <input type="date" value={t.start} onChange={(e) => updateTask(t.id, "start", e.target.value)} style={{ border: "1px solid #E2E8F0", borderRadius: 6, padding: "4px 6px", fontSize: 12, color: "#334155", outline: "none", background: "#fff" }} />
                    </td>
                    <td style={{ padding: "6px 8px", width: 128 }}>
                      <input type="date" value={t.end} onChange={(e) => updateTask(t.id, "end", e.target.value)} style={{ border: "1px solid #E2E8F0", borderRadius: 6, padding: "4px 6px", fontSize: 12, color: "#334155", outline: "none", background: "#fff" }} />
                    </td>
                    <td style={{ padding: "6px 8px", width: 120 }}>
                      <select value={t.status} onChange={(e) => updateTask(t.id, "status", e.target.value)} style={{ width: "100%", border: "none", borderRadius: 20, padding: "4px 10px", fontSize: 11, fontWeight: 600, color: sStyle.text, background: sStyle.bg, cursor: "pointer", outline: "none" }}>
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: "6px 8px", minWidth: 180 }}>
                      <input value={t.bottleneck} onChange={(e) => updateTask(t.id, "bottleneck", e.target.value)} placeholder="Any blockers..." style={{ width: "100%", border: "1px solid transparent", borderRadius: 6, padding: "5px 8px", fontSize: 12, color: t.bottleneck ? "#DC2626" : "#94A3B8", fontStyle: t.bottleneck ? "normal" : "italic", background: t.bottleneck ? "#FEF2F2" : "transparent", outline: "none", fontWeight: t.bottleneck ? 500 : 400 }} onFocus={(e) => (e.target.style.border = "1px solid #CBD5E1")} onBlur={(e) => (e.target.style.border = "1px solid transparent")} />
                    </td>
                    <td style={{ padding: "6px 8px", width: 36 }}>
                      <button onClick={() => deleteTask(t.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "#CBD5E1", fontSize: 16, padding: 2, borderRadius: 4, lineHeight: 1 }} onMouseEnter={(e) => (e.target.style.color = "#EF4444")} onMouseLeave={(e) => (e.target.style.color = "#CBD5E1")}>×</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ padding: "8px 12px", borderTop: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button onClick={addTask} style={{ border: "1px dashed #CBD5E1", background: "none", borderRadius: 8, padding: "6px 16px", fontSize: 12, fontWeight: 600, color: "#64748B", cursor: "pointer" }} onMouseEnter={(e) => { e.target.style.background = "#F8FAFC"; }} onMouseLeave={(e) => { e.target.style.background = "none"; }}>+ Add Task</button>
            {filterOwner === "All" && <span style={{ fontSize: 11, color: "#94A3B8" }}>⠿ Drag rows to reorder</span>}
          </div>
        </div>
      )}

      {/* Gantt */}
      {(view === "both" || view === "gantt") && (
        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.05)", padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "#94A3B8", fontWeight: 700 }}>Gantt Chart</h3>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>{rangeLabel}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ display: "flex", borderRadius: 6, border: "1px solid #E2E8F0", overflow: "hidden", marginRight: 8 }}>
                {[[7, "1W"], [14, "2W"], [21, "3W"], [30, "1M"]].map(([days, label]) => (
                  <button key={days} onClick={() => setCalSpan(days)} style={{ padding: "4px 10px", fontSize: 10, fontWeight: 600, border: "none", cursor: "pointer", background: calSpan === days ? "#1E293B" : "#fff", color: calSpan === days ? "#fff" : "#64748B" }}>{label}</button>
                ))}
              </div>
              <button onClick={goPrev} style={{ width: 28, height: 28, border: "1px solid #E2E8F0", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: 14, color: "#475569", display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
              <button onClick={goToday} style={{ padding: "4px 10px", border: "1px solid #E2E8F0", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#4F46E5" }}>Today</button>
              <button onClick={goNext} style={{ width: 28, height: 28, border: "1px solid #E2E8F0", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: 14, color: "#475569", display: "flex", alignItems: "center", justifyContent: "center" }}>→</button>
            </div>
          </div>
          <GanttChart tasks={filtered} calendarStart={calStart} calendarDays={calSpan} onUpdateTask={updateTask} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {OWNERS.map((o) => (
                <div key={o} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#64748B" }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: OWNER_COLORS[o].bg }} />{o}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 14 }}>
              {[
                { label: "Drag to move", sty: { width: 20, height: 7, borderRadius: 3, background: "linear-gradient(90deg, #3B82F6, #3B82F6AA)", cursor: "grab" } },
                { label: "Drag edges to resize", sty: { width: 20, height: 7, borderRadius: 3, background: "#3B82F644", border: "1px solid #3B82F6" } },
                { label: "Blocked", sty: { width: 20, height: 7, borderRadius: 3, background: "repeating-linear-gradient(135deg, #EF4444CC, #EF4444CC 3px, #EF444466 3px, #EF444466 6px)" } },
              ].map((l) => (
                <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#94A3B8" }}><div style={l.sty} />{l.label}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Default seed tasks ─────────────────────────────────────────────
function getDefaultTasks() {
  return [
    { id: 1, task: "Apollo scraping - fintech ICP batch", start: fmt(mon), end: fmt(addDays(mon, 2)), owner: "Revathy", bottleneck: "", status: "In Progress" },
    { id: 2, task: "Waterfall enrichment on batch #12", start: fmt(addDays(mon, 2)), end: fmt(addDays(mon, 3)), owner: "Revathy", bottleneck: "", status: "Not Started" },
    { id: 3, task: "Upload enriched leads to HubSpot", start: fmt(addDays(mon, 3)), end: fmt(addDays(mon, 3)), owner: "Jinks", bottleneck: "", status: "Not Started" },
    { id: 4, task: "N8N workflow: lead scoring update", start: fmt(mon), end: fmt(addDays(mon, 1)), owner: "Jinks", bottleneck: "", status: "In Progress" },
    { id: 5, task: "Review MQL to SQL conversion", start: fmt(addDays(mon, 3)), end: fmt(addDays(mon, 3)), owner: "Jinks", bottleneck: "", status: "Not Started" },
    { id: 6, task: "Blog post: AI in supply chain", start: fmt(mon), end: fmt(addDays(mon, 2)), owner: "Abilash", bottleneck: "Waiting for brief from Roshan", status: "Blocked" },
    { id: 7, task: "LinkedIn content x3", start: fmt(addDays(mon, 1)), end: fmt(addDays(mon, 3)), owner: "Abilash", bottleneck: "", status: "Not Started" },
    { id: 8, task: "Lead magnet draft: ROI calculator", start: fmt(mon), end: fmt(addDays(mon, 8)), owner: "Roshan", bottleneck: "", status: "In Progress" },
    { id: 9, task: "Weekly MQL report to John", start: fmt(addDays(mon, 4)), end: fmt(addDays(mon, 4)), owner: "Roshan", bottleneck: "", status: "Not Started" },
    { id: 10, task: "Demo calls x4", start: fmt(mon), end: fmt(addDays(mon, 3)), owner: "John", bottleneck: "", status: "In Progress" },
    { id: 11, task: "Pipeline review + CEO report", start: fmt(addDays(mon, 4)), end: fmt(addDays(mon, 4)), owner: "John", bottleneck: "", status: "Not Started" },
  ];
}
