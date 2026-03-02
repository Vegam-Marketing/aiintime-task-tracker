"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";

const PRESET_COLORS = [
  { bg: "#10B981", light: "#D1FAE5", text: "#065F46" },
  { bg: "#8B5CF6", light: "#EDE9FE", text: "#5B21B6" },
  { bg: "#0EA5E9", light: "#E0F2FE", text: "#075985" },
  { bg: "#F59E0B", light: "#FEF3C7", text: "#92400E" },
  { bg: "#EC4899", light: "#FCE7F3", text: "#9D174D" },
  { bg: "#EF4444", light: "#FEE2E2", text: "#991B1B" },
  { bg: "#14B8A6", light: "#CCFBF1", text: "#115E59" },
  { bg: "#F97316", light: "#FFEDD5", text: "#9A3412" },
  { bg: "#6366F1", light: "#E0E7FF", text: "#3730A3" },
  { bg: "#84CC16", light: "#ECFCCB", text: "#3F6212" },
];

const DEFAULT_TEAM = [
  { name: "John", color: "#10B981" },
  { name: "Jinks", color: "#8B5CF6" },
  { name: "Revathy", color: "#0EA5E9" },
  { name: "Roshan", color: "#F59E0B" },
  { name: "Abilash", color: "#EC4899" },
];

function getColorSet(hex) {
  const p = PRESET_COLORS.find((c) => c.bg.toLowerCase() === hex.toLowerCase());
  if (p) return p;
  return { bg: hex, light: hex + "22", text: "#1E293B" };
}

const parseDate = (str) => { if (!str) return new Date(); const [y, m, d] = str.split("-").map(Number); return new Date(y, m - 1, d); };
const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const diffDays = (a, b) => Math.round((a - b) / 86400000);
const getMonday = (d) => { const r = new Date(d); const day = r.getDay(); r.setDate(r.getDate() - (day === 0 ? 6 : day - 1)); return r; };

const today = new Date();
const mon = getMonday(today);

const STATUS_OPTIONS = ["Not Started", "In Progress", "Done", "Blocked"];
const STATUS_STYLE = {
  "Not Started": { bg: "#F1F5F9", text: "#475569" },
  "In Progress": { bg: "#DBEAFE", text: "#1E40AF" },
  Done: { bg: "#D1FAE5", text: "#065F46" },
  Blocked: { bg: "#FEE2E2", text: "#991B1B" },
};

const MAX_DEPTH = 3; // 0=Task, 1=Subtask, 2=Sub-Subtask, 3=Sub-Sub-Subtask

// ─── Build display order: recursive nesting up to 4 levels ──────────
function buildDisplayList(tasks, collapsedIds) {
  const childrenMap = {};
  tasks.forEach((t) => {
    if (t.parentId && t.parentId !== 0) {
      if (!childrenMap[t.parentId]) childrenMap[t.parentId] = [];
      childrenMap[t.parentId].push(t);
    }
  });

  const result = [];
  const knownIds = new Set(); // includes both displayed AND hidden-by-collapse

  function addWithChildren(task, depth) {
    const children = childrenMap[task.id] || [];
    const hasChildren = children.length > 0;
    result.push({ ...task, _depth: depth, _hasChildren: hasChildren, _isCollapsed: collapsedIds.has(task.id) });
    knownIds.add(task.id);
    if (collapsedIds.has(task.id)) {
      // Mark all descendants as known (hidden) so they don't appear as orphans
      const markHidden = (parentId) => {
        (childrenMap[parentId] || []).forEach((c) => { knownIds.add(c.id); markHidden(c.id); });
      };
      markHidden(task.id);
    } else {
      children.forEach((child) => addWithChildren(child, depth + 1));
    }
  }

  // Start with top-level tasks
  const topLevel = tasks.filter((t) => !t.parentId || t.parentId === 0);
  topLevel.forEach((t) => addWithChildren(t, 0));

  // Include orphaned tasks (parent was deleted — not just collapsed)
  tasks.forEach((t) => {
    if (!knownIds.has(t.id)) {
      result.push({ ...t, _depth: 0, _hasChildren: false, _isCollapsed: false, parentId: 0 });
    }
  });

  return result;
}

// ─── Team Panel ─────────────────────────────────────────────────────
function TeamPanel({ team, onClose, onSave }) {
  const [members, setMembers] = useState(team.map((m) => ({ ...m })));
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0].bg);

  const addMember = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (members.some((m) => m.name.toLowerCase() === trimmed.toLowerCase())) { alert("Already exists"); return; }
    setMembers((prev) => [...prev, { name: trimmed, color: newColor }]);
    setNewName("");
    const usedColors = [...members.map((m) => m.color), newColor];
    const next = PRESET_COLORS.find((c) => !usedColors.includes(c.bg));
    setNewColor(next ? next.bg : PRESET_COLORS[0].bg);
  };

  const removeMember = (i) => { if (!confirm(`Remove ${members[i].name}?`)) return; setMembers((prev) => prev.filter((_, idx) => idx !== i)); };
  const updateColor = (i, color) => { setMembers((prev) => prev.map((m, idx) => (idx === i ? { ...m, color } : m))); };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 480, maxHeight: "80vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0F172A" }}>Manage Team</h2>
          <button onClick={onClose} style={{ border: "none", background: "none", fontSize: 20, color: "#94A3B8", cursor: "pointer" }}>✕</button>
        </div>
        {members.map((m, i) => {
          const cs = getColorSet(m.color);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #F1F5F9" }}>
              <div style={{ position: "relative" }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: cs.bg, border: "2px solid #fff", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
                <input type="color" value={m.color} onChange={(e) => updateColor(i, e.target.value)} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }} />
              </div>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#1E293B" }}>{m.name}</span>
              <div style={{ display: "flex", gap: 3 }}>
                {PRESET_COLORS.slice(0, 5).map((c) => (
                  <div key={c.bg} onClick={() => updateColor(i, c.bg)} style={{ width: 16, height: 16, borderRadius: 4, background: c.bg, cursor: "pointer", border: m.color === c.bg ? "2px solid #1E293B" : "2px solid transparent" }} />
                ))}
              </div>
              <button onClick={() => removeMember(i)} style={{ border: "none", background: "none", color: "#CBD5E1", fontSize: 18, cursor: "pointer" }}
                onMouseEnter={(e) => (e.target.style.color = "#EF4444")} onMouseLeave={(e) => (e.target.style.color = "#CBD5E1")}>×</button>
            </div>
          );
        })}
        <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "12px 0", borderTop: "2px solid #F1F5F9", marginTop: 8 }}>
          <div style={{ position: "relative" }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: newColor, border: "2px solid #E2E8F0" }} />
            <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }} />
          </div>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New member name..." onKeyDown={(e) => e.key === "Enter" && addMember()}
            style={{ flex: 1, border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none", fontWeight: 500 }} />
          <button onClick={addMember} style={{ padding: "8px 16px", background: "#1E293B", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Add</button>
        </div>
        <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onClose} style={{ padding: "8px 20px", background: "#F1F5F9", color: "#475569", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          <button onClick={() => { onSave(members); onClose(); }} style={{ padding: "8px 20px", background: "#10B981", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Save Team</button>
        </div>
      </div>
    </div>
  );
}

// ─── Gantt Chart ────────────────────────────────────────────────────
function GanttChart({ displayList, calendarStart, calendarDays, onUpdateTask, ownerColors, onScrollDays }) {
  const calStart = parseDate(calendarStart);
  const dates = [];
  for (let i = 0; i < calendarDays; i++) dates.push(fmt(addDays(calStart, i)));

  const dayWidth = Math.max(44, Math.floor(780 / calendarDays));
  const rowHeight = 36;
  const labelWidth = 220;
  const ganttRef = useRef(null);
  const scrollAccum = useRef(0);
  const panState = useRef(null);

  // Touchpad / wheel: horizontal scroll to navigate dates
  useEffect(() => {
    const el = ganttRef.current;
    if (!el) return;
    const threshold = 80; // pixels of scroll before shifting 1 day (controls sensitivity)
    const handler = (e) => {
      // Use horizontal delta (touchpad swipe left/right), or vertical if shift held
      const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : (e.shiftKey ? e.deltaY : 0);
      if (dx === 0) return;
      e.preventDefault();
      scrollAccum.current += dx;
      if (Math.abs(scrollAccum.current) >= threshold) {
        const days = scrollAccum.current > 0 ? 2 : -2;
        onScrollDays(days);
        scrollAccum.current = 0;
      }
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [onScrollDays]);

  // Mouse drag to pan the Gantt (click and drag on empty area)
  const handleGanttPanStart = useCallback((e) => {
    // Only on the background, not on bars
    if (e.target !== e.currentTarget && e.target.closest("[data-gantt-bar]")) return;
    panState.current = { startX: e.clientX, scrolled: 0 };
    e.currentTarget.style.cursor = "grabbing";
  }, []);

  useEffect(() => {
    if (!panState.current) return;
    const handleMove = (e) => {
      if (!panState.current) return;
      const dx = e.clientX - panState.current.startX;
      const threshold = 60;
      const totalDelta = dx - panState.current.scrolled;
      if (Math.abs(totalDelta) >= threshold) {
        const days = totalDelta > 0 ? -1 : 1;
        onScrollDays(days);
        panState.current.scrolled = dx;
      }
    };
    const handleUp = () => {
      panState.current = null;
      if (ganttRef.current) ganttRef.current.style.cursor = "";
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => { window.removeEventListener("mousemove", handleMove); window.removeEventListener("mouseup", handleUp); };
  });

  const [drag, setDrag] = useState(null);
  const snapToDay = useCallback((px) => Math.round(px / dayWidth), [dayWidth]);

  const handleMouseDown = useCallback((e, taskId, mode, origStart, origEnd) => {
    e.preventDefault(); e.stopPropagation();
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
    return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
  }, [drag, snapToDay, onUpdateTask]);

  const dayLabels = dates.map((d) => {
    const dt = parseDate(d);
    return { date: d, day: dt.toLocaleDateString("en-US", { weekday: "narrow" }), num: dt.getDate(), month: dt.toLocaleDateString("en-US", { month: "short" }), isWeekend: dt.getDay() === 0 || dt.getDay() === 6, isToday: fmt(today) === d };
  });

  const months = []; let cm = null;
  dayLabels.forEach((d) => { const k = d.month; if (k !== cm) { months.push({ label: `${d.month} ${parseDate(d.date).getFullYear()}`, span: 1 }); cm = k; } else { months[months.length - 1].span++; } });

  if (displayList.length === 0) return <div style={{ padding: 40, textAlign: "center", color: "#94A3B8", fontSize: 14 }}>Add tasks to see the Gantt chart</div>;

  const todayIdx = dayLabels.findIndex((d) => d.isToday);
  const handleStyle = (side) => ({ position: "absolute", top: 0, [side]: 0, width: 8, height: "100%", cursor: side === "left" ? "w-resize" : "e-resize", borderRadius: side === "left" ? "5px 0 0 5px" : "0 5px 5px 0", background: "transparent", zIndex: 4 });

  return (
    <div ref={ganttRef} onMouseDown={handleGanttPanStart} style={{ overflowX: "auto", borderRadius: 10, border: "1px solid #E2E8F0", userSelect: drag ? "none" : "auto", cursor: "grab" }}>
      <div style={{ display: "flex", minWidth: labelWidth + calendarDays * dayWidth }}>
        <div style={{ width: labelWidth, minWidth: labelWidth, borderRight: "2px solid #E2E8F0", background: "#F8FAFC" }}>
          <div style={{ height: 24, borderBottom: "1px solid #E2E8F0" }} />
          <div style={{ height: 40, display: "flex", alignItems: "center", padding: "0 12px", borderBottom: "2px solid #E2E8F0", fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.8 }}>Task / Owner</div>
          {displayList.map((t) => (
            <div key={t.id} style={{ height: rowHeight, display: "flex", alignItems: "center", padding: "0 10px", paddingLeft: 10 + t._depth * 20, borderBottom: "1px solid #F1F5F9", gap: 6 }}>
              {t._depth > 0 && <span style={{ color: "#CBD5E1", fontSize: 10, marginRight: 2 }}>└</span>}
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: ownerColors[t.owner]?.bg || "#94A3B8", flexShrink: 0 }} />
              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 11, fontWeight: t._hasChildren ? 700 : 500, color: t._hasChildren ? "#0F172A" : "#334155" }}>{t.task || "Untitled"}</div>
            </div>
          ))}
        </div>
        <div style={{ flex: 1, minWidth: calendarDays * dayWidth }}>
          <div style={{ display: "flex", height: 24, borderBottom: "1px solid #E2E8F0", background: "#F8FAFC" }}>
            {months.map((m, i) => (<div key={i} style={{ width: m.span * dayWidth, minWidth: m.span * dayWidth, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#475569", borderRight: "1px solid #E2E8F0" }}>{m.label}</div>))}
          </div>
          <div style={{ display: "flex", height: 40, borderBottom: "2px solid #E2E8F0" }}>
            {dayLabels.map((d, i) => (
              <div key={i} style={{ width: dayWidth, minWidth: dayWidth, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRight: "1px solid #F1F5F9", background: d.isToday ? "#EEF2FF" : d.isWeekend ? "#F8FAFC" : "#fff", position: "relative" }}>
                <span style={{ fontWeight: 600, color: d.isToday ? "#4F46E5" : d.isWeekend ? "#CBD5E1" : "#64748B", fontSize: 9 }}>{d.day} {d.month}</span>
                <span style={{ fontWeight: 700, color: d.isToday ? "#4F46E5" : d.isWeekend ? "#CBD5E1" : "#334155", fontSize: 12 }}>{d.num}</span>
                {d.isToday && <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: 4, height: 4, borderRadius: "50%", background: "#4F46E5" }} />}
              </div>
            ))}
          </div>
          {displayList.map((t) => {
            const startD = parseDate(t.start); const endD = parseDate(t.end);
            const startOffset = diffDays(startD, calStart); const endOffset = diffDays(endD, calStart);
            const visStart = Math.max(0, startOffset); const visEnd = Math.min(calendarDays - 1, endOffset);
            const barDays = visEnd - visStart + 1;
            const isVisible = visEnd >= 0 && visStart < calendarDays && barDays > 0;
            const ownerColor = ownerColors[t.owner] || { bg: "#94A3B8" };
            const isBlocked = t.status === "Blocked"; const isDone = t.status === "Done";
            const extendsLeft = startOffset < 0; const extendsRight = endOffset >= calendarDays;
            const isDragging = drag?.taskId === t.id;
            const isParent = t._hasChildren;
            const depth = t._depth;
            // Bar sizing: parents are tallest, each depth level gets progressively thinner
            const barHeight = isParent ? rowHeight - 8 : depth === 0 ? rowHeight - 10 : depth === 1 ? rowHeight - 12 : depth === 2 ? rowHeight - 16 : rowHeight - 18;
            const barTop = isParent ? 4 : depth === 0 ? 5 : depth === 1 ? 6 : depth === 2 ? 8 : 9;
            // Opacity decreases with depth
            const fillOpacity = depth === 0 ? "EE" : depth === 1 ? "BB" : depth === 2 ? "88" : "66";
            const fillOpacity2 = depth === 0 ? "CC" : depth === 1 ? "99" : depth === 2 ? "66" : "44";
            const borderOp = depth === 0 ? "" : depth === 1 ? "77" : depth === 2 ? "55" : "44";
            const shadowOp = depth === 0 ? "44" : depth === 1 ? "33" : depth === 2 ? "22" : "11";
            const rad = isParent ? 3 : depth >= 2 ? 4 : 5;

            return (
              <div key={t.id} style={{ height: rowHeight, position: "relative", borderBottom: "1px solid #F1F5F9", display: "flex" }}>
                {dayLabels.map((d, i) => (<div key={i} style={{ width: dayWidth, minWidth: dayWidth, borderRight: "1px solid #F8FAFC", background: d.isToday ? "#EEF2FF22" : d.isWeekend ? "#FAFBFC" : "transparent" }} />))}
                {todayIdx >= 0 && <div style={{ position: "absolute", top: 0, bottom: 0, left: todayIdx * dayWidth + dayWidth / 2, width: 1, background: "#4F46E544", zIndex: 1 }} />}
                {isVisible && (
                  <div data-gantt-bar onMouseDown={(e) => handleMouseDown(e, t.id, "move", t.start, t.end)}
                    style={{
                      position: "absolute", top: barTop, left: visStart * dayWidth + 2, width: barDays * dayWidth - 4, height: barHeight,
                      borderRadius: rad,
                      borderTopLeftRadius: extendsLeft ? 0 : rad, borderBottomLeftRadius: extendsLeft ? 0 : rad,
                      borderTopRightRadius: extendsRight ? 0 : rad, borderBottomRightRadius: extendsRight ? 0 : rad,
                      background: isParent
                        ? `${ownerColor.bg}33`
                        : isBlocked ? `repeating-linear-gradient(135deg, ${ownerColor.bg}CC, ${ownerColor.bg}CC 4px, ${ownerColor.bg}88 4px, ${ownerColor.bg}88 8px)`
                        : isDone ? `${ownerColor.bg}55`
                        : `linear-gradient(90deg, ${ownerColor.bg}${fillOpacity}, ${ownerColor.bg}${fillOpacity2})`,
                      display: "flex", alignItems: "center", padding: "0 10px", overflow: "hidden",
                      boxShadow: isDragging ? `0 4px 14px ${ownerColor.bg}55` : isParent ? "none" : `0 1px 3px ${ownerColor.bg}${shadowOp}`,
                      border: isParent ? `1.5px solid ${ownerColor.bg}88`
                        : isBlocked ? "1px solid #EF444466"
                        : isDone ? `1px dashed ${ownerColor.bg}88`
                        : isDragging ? `2px solid ${ownerColor.bg}`
                        : depth > 0 ? `1px solid ${ownerColor.bg}${borderOp}` : "none",
                      cursor: "grab", zIndex: isDragging ? 10 : 2,
                    }}>
                    {!extendsLeft && <div onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, t.id, "left", t.start, t.end); }} onMouseEnter={(e) => (e.currentTarget.style.background = `${ownerColor.bg}44`)} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")} style={handleStyle("left")} />}
                    <span style={{ fontSize: depth >= 2 ? 7 : depth === 1 ? 8 : 9, fontWeight: isParent ? 700 : 600, color: isParent ? ownerColor.bg : isDone ? ownerColor.bg : "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textDecoration: isDone ? "line-through" : "none", pointerEvents: "none" }}>
                      {t.owner}{barDays * dayWidth > 110 ? ` — ${t.task}` : ""}
                    </span>
                    {isBlocked && <span style={{ marginLeft: 3, fontSize: 9, pointerEvents: "none" }}>⚠️</span>}
                    {extendsRight && <span style={{ marginLeft: "auto", fontSize: 10, color: isDone ? ownerColor.bg : "#fff", pointerEvents: "none" }}>→</span>}
                    {!extendsRight && <div onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, t.id, "right", t.start, t.end); }} onMouseEnter={(e) => (e.currentTarget.style.background = `${ownerColor.bg}44`)} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")} style={handleStyle("right")} />}
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
  const [team, setTeam] = useState(DEFAULT_TEAM);
  const [nextId, setNextId] = useState(1);
  const [filterOwners, setFilterOwners] = useState(new Set()); // empty = All
  const [view, setView] = useState("both");
  const [showTeamPanel, setShowTeamPanel] = useState(false);
  const [collapsedIds, setCollapsedIds] = useState(new Set());
  const dragNode = useRef(null);
  const [calStart, setCalStart] = useState(fmt(mon));
  const [calSpan, setCalSpan] = useState(14);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("saved");
  const saveTimeout = useRef(null);
  const isFirstLoad = useRef(true);

  const ownerColors = useMemo(() => { const m = {}; team.forEach((t) => { m[t.name] = getColorSet(t.color); }); return m; }, [team]);
  const ownerNames = useMemo(() => team.map((m) => m.name), [team]);

  // Load
  useEffect(() => {
    fetch("/api/tasks").then((r) => r.json()).then((data) => {
      if (data.tasks?.length > 0) { setTasks(data.tasks); setNextId(data.nextId || data.tasks.length + 1); }
      else { const d = getDefaultTasks(); setTasks(d); setNextId(d.length + 1); }
      if (data.team?.length > 0) setTeam(data.team);
      setLoading(false); isFirstLoad.current = false;
    }).catch(() => { setTasks(getDefaultTasks()); setNextId(12); setLoading(false); isFirstLoad.current = false; });
  }, []);

  // Auto-sync parent dates (recursive bottom-up): any task with children snaps to min(child starts) → max(child ends)
  useEffect(() => {
    if (isFirstLoad.current || loading) return;
    setTasks((prev) => {
      // Build children map
      const childrenMap = {};
      prev.forEach((t) => {
        if (t.parentId && t.parentId !== 0) {
          if (!childrenMap[t.parentId]) childrenMap[t.parentId] = [];
          childrenMap[t.parentId].push(t.id);
        }
      });
      const taskMap = {};
      prev.forEach((t) => { taskMap[t.id] = { ...t }; });

      // Get depth of each task (leaf = highest depth)
      function getDepth(id, visited = new Set()) {
        if (visited.has(id)) return 0;
        visited.add(id);
        const kids = childrenMap[id] || [];
        if (kids.length === 0) return 0;
        return 1 + Math.max(...kids.map((k) => getDepth(k, visited)));
      }

      // Get all parent IDs sorted deepest-first so we process bottom-up
      const parentIds = Object.keys(childrenMap).map(Number);
      const sorted = parentIds.sort((a, b) => getDepth(b) - getDepth(a));

      let changed = false;
      sorted.forEach((pid) => {
        const parent = taskMap[pid];
        if (!parent) return;
        const kids = (childrenMap[pid] || []).map((id) => taskMap[id]).filter(Boolean);
        if (kids.length === 0) return;

        const newEnd = fmt(new Date(Math.max(...kids.map((c) => parseDate(c.end)))));
        const newStart = fmt(new Date(Math.min(...kids.map((c) => parseDate(c.start)))));

        if (newEnd !== parent.end || newStart !== parent.start) {
          taskMap[pid] = { ...parent, end: newEnd, start: newStart };
          changed = true;
        }
      });

      return changed ? prev.map((t) => taskMap[t.id] || t) : prev;
    });
  }, [tasks, loading]);

  // Auto-save tasks
  useEffect(() => {
    if (isFirstLoad.current || loading) return;
    setSaveStatus("saving");
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tasks }) })
        .then((r) => setSaveStatus(r.ok ? "saved" : "error")).catch(() => setSaveStatus("error"));
    }, 1500);
    return () => { if (saveTimeout.current) clearTimeout(saveTimeout.current); };
  }, [tasks, loading]);

  const handleSaveTeam = useCallback((newTeam) => {
    setTeam(newTeam);
    fetch("/api/team", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ team: newTeam }) }).catch(console.error);
  }, []);

  const goToday = () => setCalStart(fmt(getMonday(today)));
  const goPrev = () => setCalStart(fmt(addDays(parseDate(calStart), -7)));
  const goNext = () => setCalStart(fmt(addDays(parseDate(calStart), 7)));

  const updateTask = useCallback((id, field, value) => {
    setTasks((prev) => prev.map((t) => {
      if (t.id !== id) return t;
      // Date validation: end can't be before start, start can't be after end
      if (field === "end" && value < t.start) return { ...t, end: value, start: value };
      if (field === "start" && value > t.end) return { ...t, start: value, end: value };
      return { ...t, [field]: value };
    }));
  }, []);

  const addTask = () => {
    setTasks((prev) => [...prev, { id: nextId, task: "", start: fmt(today), end: fmt(today), owner: ownerNames[0] || "", bottleneck: "", status: "Not Started", parentId: 0 }]);
    setNextId((n) => n + 1);
  };

  // Helper: get depth of a task in the hierarchy
  const getTaskDepth = useCallback((taskId, taskList) => {
    let depth = 0;
    let current = taskList.find((t) => t.id === taskId);
    while (current && current.parentId && current.parentId !== 0) {
      depth++;
      current = taskList.find((t) => t.id === current.parentId);
      if (depth > MAX_DEPTH) break; // safety
    }
    return depth;
  }, []);

  // Helper: get all descendant IDs recursively
  const getDescendantIds = useCallback((taskId, taskList) => {
    const ids = new Set();
    const collect = (pid) => {
      taskList.forEach((t) => { if (t.parentId === pid) { ids.add(t.id); collect(t.id); } });
    };
    collect(taskId);
    return ids;
  }, []);

  const addSubtask = (parentId) => {
    const parent = tasks.find((t) => t.id === parentId);
    if (!parent) return;
    const parentDepth = getTaskDepth(parentId, tasks);
    if (parentDepth >= MAX_DEPTH) return; // Can't nest deeper

    const newTask = { id: nextId, task: "", start: parent.start, end: parent.end, owner: parent.owner, bottleneck: "", status: "Not Started", parentId };
    // Insert after parent and ALL its descendants
    const descIds = getDescendantIds(parentId, tasks);
    const parentIdx = tasks.findIndex((t) => t.id === parentId);
    let insertIdx = parentIdx + 1;
    while (insertIdx < tasks.length && descIds.has(tasks[insertIdx].id)) insertIdx++;
    setTasks((prev) => { const n = [...prev]; n.splice(insertIdx, 0, newTask); return n; });
    setNextId((n) => n + 1);
    setCollapsedIds((prev) => { const n = new Set(prev); n.delete(parentId); return n; });
  };

  const indentTask = (taskId) => {
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === taskId);
      if (idx <= 0) return prev;
      const task = prev[idx];
      const taskDepth = getTaskDepth(taskId, prev);
      if (taskDepth >= MAX_DEPTH) return prev; // Already at max depth

      // Find the nearest task above at the same depth (same parentId) to become the new parent
      let siblingIdx = idx - 1;
      while (siblingIdx >= 0) {
        const sib = prev[siblingIdx];
        if (sib.parentId === task.parentId && sib.id !== taskId) break;
        // Don't skip past tasks at a higher level
        if (getTaskDepth(sib.id, prev) < taskDepth) return prev; // No sibling found above
        siblingIdx--;
      }
      if (siblingIdx < 0) return prev;

      const newParentId = prev[siblingIdx].id;
      // Move task + its descendants
      const descIds = getDescendantIds(taskId, prev);
      const movedIds = new Set([taskId, ...descIds]);
      const movedTasks = prev.filter((t) => movedIds.has(t.id));
      const remaining = prev.filter((t) => !movedIds.has(t.id));

      // Update parent of the task being indented
      movedTasks[0] = { ...movedTasks[0], parentId: newParentId };

      // Insert after new parent and its existing descendants
      const newParentDescIds = getDescendantIds(newParentId, remaining);
      const npIdx = remaining.findIndex((t) => t.id === newParentId);
      let insIdx = npIdx + 1;
      while (insIdx < remaining.length && newParentDescIds.has(remaining[insIdx].id)) insIdx++;
      remaining.splice(insIdx, 0, ...movedTasks);
      return remaining;
    });
  };

  const outdentTask = (taskId) => {
    setTasks((prev) => {
      const task = prev.find((t) => t.id === taskId);
      if (!task || !task.parentId || task.parentId === 0) return prev; // Already top-level
      const parent = prev.find((t) => t.id === task.parentId);
      if (!parent) return prev;
      // Move to grandparent level (parent's parentId)
      const newParentId = parent.parentId || 0;
      return prev.map((t) => (t.id === taskId ? { ...t, parentId: newParentId } : t));
    });
  };

  const deleteTask = (id) => {
    // Recursively remove all descendants
    setTasks((prev) => {
      const descIds = getDescendantIds(id, prev);
      return prev.filter((t) => t.id !== id && !descIds.has(t.id));
    });
  };

  const duplicateTask = (id) => {
    setTasks((prev) => {
      const task = prev.find((t) => t.id === id);
      if (!task) return prev;
      // Collect task + all descendants
      const descIds = getDescendantIds(id, prev);
      const allToCopy = [task, ...prev.filter((t) => descIds.has(t.id))];
      // Create ID mapping: old → new
      let nid = Math.max(...prev.map((t) => t.id)) + 1;
      const idMap = {};
      allToCopy.forEach((t) => { idMap[t.id] = nid++; });
      // Clone with new IDs, remap parentIds
      const cloned = allToCopy.map((t) => ({
        ...t,
        id: idMap[t.id],
        task: t.id === id ? `${t.task} (copy)` : t.task,
        parentId: t.parentId && idMap[t.parentId] ? idMap[t.parentId] : t.parentId,
      }));
      // Insert right after the original block
      const origIdx = prev.findIndex((t) => t.id === id);
      let insertAfter = origIdx + 1;
      while (insertAfter < prev.length && descIds.has(prev[insertAfter].id)) insertAfter++;
      const result = [...prev];
      result.splice(insertAfter, 0, ...cloned);
      return result;
    });
    setNextId((n) => n + 50); // Bump to avoid collisions
  };

  const toggleCollapse = (id) => {
    setCollapsedIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  // Table row drag - use task IDs for reliability
  const [dragTaskId, setDragTaskId] = useState(null);
  const [dragOverTaskId, setDragOverTaskId] = useState(null);
  const handleDragStart = useCallback((e, taskId) => { setDragTaskId(taskId); dragNode.current = e.target.closest("tr"); e.dataTransfer.effectAllowed = "move"; setTimeout(() => { if (dragNode.current) dragNode.current.style.opacity = "0.4"; }, 0); }, []);
  const handleDragEnter = useCallback((e, taskId) => { e.preventDefault(); if (dragTaskId === null || dragTaskId === taskId) return; setDragOverTaskId(taskId); }, [dragTaskId]);
  const handleDragOver = useCallback((e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }, []);
  const handleDrop = useCallback((e, dropTaskId) => {
    e.preventDefault();
    if (dragTaskId === null || dragTaskId === dropTaskId) return;
    setTasks((prev) => {
      const dragIdx = prev.findIndex((t) => t.id === dragTaskId);
      const draggedTask = prev[dragIdx];
      if (!draggedTask) return prev;

      // Check if drop target is a parent (has children)
      const targetTask = prev.find((t) => t.id === dropTaskId);
      if (!targetTask) return prev;
      const targetHasKids = prev.some((c) => c.parentId === targetTask.id);
      const targetDepth = getTaskDepth(targetTask.id, prev);

      // Remove dragged task from its current position
      const u = prev.filter((t) => t.id !== dragTaskId);
      const d = { ...draggedTask };

      if (targetHasKids && targetDepth < MAX_DEPTH && draggedTask.parentId !== targetTask.id) {
        // Auto-subtask: make it a child of the target parent
        d.parentId = targetTask.id;
        // Insert after target and all its descendants
        const descIds = getDescendantIds(targetTask.id, u);
        let insIdx = u.findIndex((t) => t.id === targetTask.id) + 1;
        while (insIdx < u.length && descIds.has(u[insIdx].id)) insIdx++;
        u.splice(insIdx, 0, d);
      } else {
        // Normal reorder: insert at drop target position
        const dropIdx = u.findIndex((t) => t.id === dropTaskId);
        u.splice(dropIdx, 0, d);
      }

      return u;
    });
    setDragTaskId(null); setDragOverTaskId(null);
  }, [dragTaskId, getTaskDepth, getDescendantIds]);
  const handleDragEnd = useCallback(() => { if (dragNode.current) dragNode.current.style.opacity = "1"; setDragTaskId(null); setDragOverTaskId(null); dragNode.current = null; }, []);

  const isAllSelected = filterOwners.size === 0;
  const filtered = isAllSelected ? tasks : tasks.filter((t) => filterOwners.has(t.owner));
  const displayList = useMemo(() => buildDisplayList(filtered, collapsedIds), [filtered, collapsedIds]);

  const stats = { total: filtered.length, done: filtered.filter((t) => t.status === "Done").length, blocked: filtered.filter((t) => t.status === "Blocked").length, inProgress: filtered.filter((t) => t.status === "In Progress").length };

  const calStartDate = parseDate(calStart);
  const calEndDate = addDays(calStartDate, calSpan - 1);
  const rangeLabel = `${calStartDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} — ${calEndDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8FAFC", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ textAlign: "center" }}><div style={{ fontSize: 24, fontWeight: 700, color: "#1E293B", marginBottom: 8 }}>Loading tasks...</div><div style={{ fontSize: 14, color: "#94A3B8" }}>Connecting to Google Sheets</div></div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "'DM Sans', -apple-system, sans-serif", padding: "24px 20px" }}>
      {showTeamPanel && <TeamPanel team={team} onClose={() => setShowTeamPanel(false)} onSave={handleSaveTeam} />}

      {/* Header */}
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0F172A", letterSpacing: -0.5 }}>
              Weekly Task Tracker<span style={{ color: "#94A3B8", fontWeight: 400, fontSize: 16 }}> / aiintime.com</span>
            </h1>
            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 12, background: saveStatus === "saved" ? "#D1FAE5" : saveStatus === "saving" ? "#FEF3C7" : "#FEE2E2", color: saveStatus === "saved" ? "#065F46" : saveStatus === "saving" ? "#92400E" : "#991B1B" }}>
              {saveStatus === "saved" ? "✓ Saved" : saveStatus === "saving" ? "Saving..." : "⚠ Error"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
            {[
              { label: `${stats.total} Total`, bg: "#F1F5F9", color: "#475569" },
              { label: `${stats.inProgress} In Progress`, bg: "#DBEAFE", color: "#1E40AF" },
              { label: `${stats.done} Done`, bg: "#D1FAE5", color: "#065F46" },
              { label: `${stats.blocked} Blocked`, bg: "#FEE2E2", color: "#991B1B" },
            ].map((s) => <span key={s.label} style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: s.bg, color: s.color }}>{s.label}</span>)}
            <div style={{ display: "flex", gap: 4, marginLeft: 4, alignItems: "center" }}>
              {team.map((m) => (
                <div key={m.name} title={m.name} style={{ width: 24, height: 24, borderRadius: "50%", background: getColorSet(m.color).bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff", border: "2px solid #fff", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>{m.name[0]}</div>
              ))}
              <button onClick={() => setShowTeamPanel(true)} title="Manage team" style={{ width: 24, height: 24, borderRadius: "50%", background: "#F1F5F9", border: "2px dashed #CBD5E1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#94A3B8", cursor: "pointer", fontWeight: 700 }}>+</button>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={() => setFilterOwners(new Set())}
              style={{ padding: "5px 12px", borderRadius: 20, border: isAllSelected ? "2px solid #1E293B" : "1px solid #E2E8F0", fontSize: 11, fontWeight: 600, background: isAllSelected ? "#1E293B" : "#fff", color: isAllSelected ? "#fff" : "#64748B", cursor: "pointer" }}>All</button>
            {ownerNames.map((o) => {
              const active = filterOwners.has(o);
              const oc = ownerColors[o] || { bg: "#6B7280", light: "#F3F4F6", text: "#374151" };
              return (
                <button key={o} onClick={() => {
                  setFilterOwners((prev) => {
                    const next = new Set(prev);
                    if (next.has(o)) next.delete(o); else next.add(o);
                    return next;
                  });
                }}
                  style={{ padding: "5px 12px", borderRadius: 20, border: active ? `2px solid ${oc.bg}` : "1px solid #E2E8F0", fontSize: 11, fontWeight: 600, background: active ? oc.light : "#fff", color: active ? oc.text : "#64748B", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: oc.bg }} />{o}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", borderRadius: 8, border: "1px solid #E2E8F0", overflow: "hidden" }}>
            {[["both", "Table + Gantt"], ["table", "Table"], ["gantt", "Gantt"]].map(([v, l]) => (
              <button key={v} onClick={() => setView(v)} style={{ padding: "6px 12px", fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer", background: view === v ? "#1E293B" : "#fff", color: view === v ? "#fff" : "#64748B" }}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      {(view === "both" || view === "table") && (
        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.05)", marginBottom: 20, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1020, fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#1E293B" }}>
                {["", "#", "Subtask", "Task", "Owner", "Start", "End", "Status", "Bottleneck / Notes", ""].map((h, i) => (
                  <th key={i} style={{ padding: "10px 6px", textAlign: i === 2 ? "center" : "left", color: "#E2E8F0", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, whiteSpace: "nowrap", width: i === 0 ? 30 : i === 1 ? 32 : i === 2 ? 56 : undefined }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayList.map((t, i) => {
                const sStyle = STATUS_STYLE[t.status] || STATUS_STYLE["Not Started"];
                const oc = ownerColors[t.owner] || { bg: "#6B7280", light: "#F3F4F6", text: "#374151" };
                const isDragOver = dragOverTaskId === t.id && dragTaskId !== t.id;
                const isSubtask = t._depth > 0;
                const depthBg = t._depth === 0 ? (i % 2 === 0 ? "#fff" : "#FAFBFC") : t._depth === 1 ? "#FAFBFE" : t._depth === 2 ? "#F8F9FE" : "#F5F7FE";

                return (
                  <tr key={t.id} draggable={isAllSelected} onDragStart={(e) => handleDragStart(e, t.id)} onDragEnter={(e) => handleDragEnter(e, t.id)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, t.id)} onDragEnd={handleDragEnd}
                    style={{ borderBottom: "1px solid #F1F5F9", background: isDragOver ? "#EEF2FF" : depthBg, borderTop: isDragOver ? "2px solid #6366F1" : "none", borderLeft: isSubtask ? `${Math.min(t._depth + 2, 4)}px solid ${oc.bg}${t._depth === 1 ? "44" : t._depth === 2 ? "33" : "22"}` : "3px solid transparent" }}>
                    {/* Drag handle */}
                    <td style={{ padding: "6px 2px 6px 6px", width: 30, cursor: isAllSelected ? "grab" : "default" }}>
                      {isAllSelected && <span style={{ color: "#CBD5E1", fontSize: 14, userSelect: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>⠿</span>}
                    </td>
                    {/* Row number */}
                    <td style={{ padding: "6px 2px", width: 32, fontSize: 11, color: "#94A3B8", fontWeight: 600, textAlign: "center" }}>{i + 1}</td>
                    {/* Indent/Outdent + Collapse + Add subtask */}
                    <td style={{ padding: "2px 4px", width: 56 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2 }}>
                        {/* Collapse toggle for parents */}
                        {t._hasChildren && (
                          <button onClick={() => toggleCollapse(t.id)} title={t._isCollapsed ? "Expand" : "Collapse"}
                            style={{ border: "none", background: "#F1F5F9", cursor: "pointer", fontSize: 10, color: "#475569", padding: "2px 4px", lineHeight: 1, fontWeight: 700, borderRadius: 4 }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#E2E8F0")} onMouseLeave={(e) => (e.currentTarget.style.background = "#F1F5F9")}>
                            {t._isCollapsed ? "▶" : "▼"}
                          </button>
                        )}
                        {/* Indent → (available if depth < MAX_DEPTH and no children, to avoid exceeding depth) */}
                        {t._depth < MAX_DEPTH && !t._hasChildren && (
                          <button onClick={() => indentTask(t.id)} title="Indent deeper"
                            style={{ border: "1px solid #E2E8F0", background: "#F8FAFC", cursor: "pointer", fontSize: 11, color: "#475569", padding: "2px 5px", lineHeight: 1, borderRadius: 4, fontWeight: 600 }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "#EEF2FF"; e.currentTarget.style.color = "#4F46E5"; e.currentTarget.style.borderColor = "#C7D2FE"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "#F8FAFC"; e.currentTarget.style.color = "#475569"; e.currentTarget.style.borderColor = "#E2E8F0"; }}>→</button>
                        )}
                        {/* Outdent ← (available if depth > 0) */}
                        {t._depth > 0 && (
                          <button onClick={() => outdentTask(t.id)} title="Outdent one level"
                            style={{ border: "1px solid #E2E8F0", background: "#F8FAFC", cursor: "pointer", fontSize: 11, color: "#475569", padding: "2px 5px", lineHeight: 1, borderRadius: 4, fontWeight: 600 }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "#EEF2FF"; e.currentTarget.style.color = "#4F46E5"; e.currentTarget.style.borderColor = "#C7D2FE"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "#F8FAFC"; e.currentTarget.style.color = "#475569"; e.currentTarget.style.borderColor = "#E2E8F0"; }}>←</button>
                        )}
                        {/* Add subtask + (available if depth < MAX_DEPTH) */}
                        {t._depth < MAX_DEPTH && (
                          <button onClick={() => addSubtask(t.id)} title="Add subtask"
                            style={{ border: "1px solid #E2E8F0", background: "#F8FAFC", cursor: "pointer", fontSize: 12, color: "#475569", padding: "2px 5px", lineHeight: 1, borderRadius: 4, fontWeight: 700 }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "#D1FAE5"; e.currentTarget.style.color = "#065F46"; e.currentTarget.style.borderColor = "#A7F3D0"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "#F8FAFC"; e.currentTarget.style.color = "#475569"; e.currentTarget.style.borderColor = "#E2E8F0"; }}>+</button>
                        )}
                      </div>
                    </td>
                    {/* Task name */}
                    <td style={{ padding: "6px 8px", minWidth: 200 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, paddingLeft: t._depth * 20 }}>
                        {t._depth > 0 && <span style={{ color: t._depth === 1 ? "#CBD5E1" : t._depth === 2 ? "#D4D4D8" : "#E4E4E7", fontSize: 11, flexShrink: 0 }}>└</span>}
                        <input value={t.task} onChange={(e) => updateTask(t.id, "task", e.target.value)} placeholder={t._depth === 0 ? "Task name..." : t._depth === 1 ? "Subtask..." : t._depth === 2 ? "Sub-subtask..." : "Sub-sub-subtask..."}
                          style={{ width: "100%", border: "1px solid transparent", borderRadius: 6, padding: "5px 8px", fontSize: t._depth === 0 ? 13 : 12, fontWeight: t._hasChildren ? 700 : t._depth === 0 ? 500 : 400, color: t._hasChildren ? "#0F172A" : "#1E293B", background: "transparent", outline: "none" }}
                          onFocus={(e) => (e.target.style.border = "1px solid #CBD5E1")} onBlur={(e) => (e.target.style.border = "1px solid transparent")} />
                      </div>
                    </td>
                    <td style={{ padding: "6px 6px", width: 110 }}>
                      <select value={t.owner} onChange={(e) => updateTask(t.id, "owner", e.target.value)} style={{ width: "100%", border: "1px solid #E2E8F0", borderRadius: 6, padding: "5px 6px", fontSize: 12, fontWeight: 600, color: oc.text, background: oc.light, cursor: "pointer", outline: "none" }}>
                        {ownerNames.map((o) => <option key={o} value={o}>{o}</option>)}
                        {!ownerNames.includes(t.owner) && t.owner && <option value={t.owner}>{t.owner}</option>}
                      </select>
                    </td>
                    <td style={{ padding: "6px 6px", width: 124 }}>
                      <input type="date" value={t.start} onChange={(e) => updateTask(t.id, "start", e.target.value)} style={{ border: "1px solid #E2E8F0", borderRadius: 6, padding: "4px 6px", fontSize: 12, color: "#334155", outline: "none", background: "#fff" }} />
                    </td>
                    <td style={{ padding: "6px 6px", width: 124 }}>
                      <input type="date" value={t.end} onChange={(e) => updateTask(t.id, "end", e.target.value)} style={{ border: "1px solid #E2E8F0", borderRadius: 6, padding: "4px 6px", fontSize: 12, color: "#334155", outline: "none", background: "#fff" }} />
                    </td>
                    <td style={{ padding: "6px 6px", width: 116 }}>
                      <select value={t.status} onChange={(e) => updateTask(t.id, "status", e.target.value)} style={{ width: "100%", border: "none", borderRadius: 20, padding: "4px 10px", fontSize: 11, fontWeight: 600, color: sStyle.text, background: sStyle.bg, cursor: "pointer", outline: "none" }}>
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: "6px 6px", minWidth: 160 }}>
                      <input value={t.bottleneck} onChange={(e) => updateTask(t.id, "bottleneck", e.target.value)} placeholder="Any blockers..."
                        style={{ width: "100%", border: "1px solid transparent", borderRadius: 6, padding: "5px 8px", fontSize: 12, color: t.bottleneck ? "#DC2626" : "#94A3B8", fontStyle: t.bottleneck ? "normal" : "italic", background: t.bottleneck ? "#FEF2F2" : "transparent", outline: "none", fontWeight: t.bottleneck ? 500 : 400 }}
                        onFocus={(e) => (e.target.style.border = "1px solid #CBD5E1")} onBlur={(e) => (e.target.style.border = "1px solid transparent")} />
                    </td>
                    <td style={{ padding: "6px 4px", width: 52 }}>
                      <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
                        <button onClick={() => duplicateTask(t.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "#CBD5E1", fontSize: 13, padding: 2, borderRadius: 4, lineHeight: 1 }} onMouseEnter={(e) => (e.target.style.color = "#6366F1")} onMouseLeave={(e) => (e.target.style.color = "#CBD5E1")} title="Duplicate task">⧉</button>
                        <button onClick={() => deleteTask(t.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "#CBD5E1", fontSize: 16, padding: 2, borderRadius: 4, lineHeight: 1 }} onMouseEnter={(e) => (e.target.style.color = "#EF4444")} onMouseLeave={(e) => (e.target.style.color = "#CBD5E1")} title={t._hasChildren ? "Delete task & subtasks" : "Delete"}>×</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ padding: "8px 12px", borderTop: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button onClick={addTask} style={{ border: "1px dashed #CBD5E1", background: "none", borderRadius: 8, padding: "6px 16px", fontSize: 12, fontWeight: 600, color: "#64748B", cursor: "pointer" }}>+ Add Task</button>
            <span style={{ fontSize: 11, color: "#94A3B8" }}>→ indent (up to 4 levels) · ← outdent · + add subtask · ⧉ duplicate · scroll Gantt to navigate · drag onto parent = auto-subtask</span>
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
                {[[7, "1W"], [14, "2W"], [21, "3W"], [30, "1M"]].map(([d, l]) => (
                  <button key={d} onClick={() => setCalSpan(d)} style={{ padding: "4px 10px", fontSize: 10, fontWeight: 600, border: "none", cursor: "pointer", background: calSpan === d ? "#1E293B" : "#fff", color: calSpan === d ? "#fff" : "#64748B" }}>{l}</button>
                ))}
              </div>
              <button onClick={goPrev} style={{ width: 28, height: 28, border: "1px solid #E2E8F0", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: 14, color: "#475569", display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
              <button onClick={goToday} style={{ padding: "4px 10px", border: "1px solid #E2E8F0", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#4F46E5" }}>Today</button>
              <button onClick={goNext} style={{ width: 28, height: 28, border: "1px solid #E2E8F0", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: 14, color: "#475569", display: "flex", alignItems: "center", justifyContent: "center" }}>→</button>
            </div>
          </div>
          <GanttChart displayList={displayList} calendarStart={calStart} calendarDays={calSpan} onUpdateTask={updateTask} ownerColors={ownerColors} onScrollDays={(days) => setCalStart((prev) => fmt(addDays(parseDate(prev), days)))} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {team.map((m) => (<div key={m.name} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#64748B" }}><div style={{ width: 10, height: 10, borderRadius: 3, background: getColorSet(m.color).bg }} />{m.name}</div>))}
            </div>
            <div style={{ display: "flex", gap: 14 }}>
              {[
                { label: "Parent", sty: { width: 20, height: 8, borderRadius: 2, background: "#3B82F622", border: "1.5px solid #3B82F688" } },
                { label: "Task", sty: { width: 20, height: 8, borderRadius: 3, background: "linear-gradient(90deg, #3B82F6EE, #3B82F6CC)", boxShadow: "0 1px 3px #3B82F644" } },
                { label: "Subtask", sty: { width: 20, height: 6, borderRadius: 3, background: "linear-gradient(90deg, #3B82F6BB, #3B82F699)", border: "1px solid #3B82F677" } },
                { label: "Sub-sub", sty: { width: 20, height: 5, borderRadius: 3, background: "linear-gradient(90deg, #3B82F688, #3B82F666)", border: "1px solid #3B82F655" } },
                { label: "Deepest", sty: { width: 20, height: 4, borderRadius: 3, background: "linear-gradient(90deg, #3B82F666, #3B82F644)", border: "1px solid #3B82F644" } },
                { label: "Blocked", sty: { width: 20, height: 7, borderRadius: 3, background: "repeating-linear-gradient(135deg, #EF4444CC, #EF4444CC 3px, #EF444466 3px, #EF444466 6px)" } },
              ].map((l) => (<div key={l.label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#94A3B8" }}><div style={l.sty} />{l.label}</div>))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getDefaultTasks() {
  return [
    { id: 1, task: "Apollo scraping - fintech ICP batch", start: fmt(mon), end: fmt(addDays(mon, 2)), owner: "Revathy", bottleneck: "", status: "In Progress", parentId: 0 },
    { id: 2, task: "Waterfall enrichment on batch #12", start: fmt(addDays(mon, 2)), end: fmt(addDays(mon, 3)), owner: "Revathy", bottleneck: "", status: "Not Started", parentId: 0 },
    { id: 3, task: "Upload enriched leads to HubSpot", start: fmt(addDays(mon, 3)), end: fmt(addDays(mon, 3)), owner: "Jinks", bottleneck: "", status: "Not Started", parentId: 0 },
    { id: 4, task: "N8N workflow: lead scoring update", start: fmt(mon), end: fmt(addDays(mon, 1)), owner: "Jinks", bottleneck: "", status: "In Progress", parentId: 0 },
    { id: 5, task: "Review MQL to SQL conversion", start: fmt(addDays(mon, 3)), end: fmt(addDays(mon, 3)), owner: "Jinks", bottleneck: "", status: "Not Started", parentId: 0 },
    { id: 6, task: "Content pipeline", start: fmt(mon), end: fmt(addDays(mon, 4)), owner: "Abilash", bottleneck: "", status: "In Progress", parentId: 0 },
    { id: 7, task: "Blog post: AI in supply chain", start: fmt(mon), end: fmt(addDays(mon, 2)), owner: "Abilash", bottleneck: "Waiting for brief from Roshan", status: "Blocked", parentId: 6 },
    { id: 8, task: "LinkedIn content x3", start: fmt(addDays(mon, 1)), end: fmt(addDays(mon, 3)), owner: "Abilash", bottleneck: "", status: "Not Started", parentId: 6 },
    { id: 9, task: "Lead magnet draft: ROI calculator", start: fmt(mon), end: fmt(addDays(mon, 8)), owner: "Roshan", bottleneck: "", status: "In Progress", parentId: 0 },
    { id: 10, task: "Weekly MQL report to John", start: fmt(addDays(mon, 4)), end: fmt(addDays(mon, 4)), owner: "Roshan", bottleneck: "", status: "Not Started", parentId: 0 },
    { id: 11, task: "Demo calls x4", start: fmt(mon), end: fmt(addDays(mon, 3)), owner: "John", bottleneck: "", status: "In Progress", parentId: 0 },
    { id: 12, task: "Pipeline review + CEO report", start: fmt(addDays(mon, 4)), end: fmt(addDays(mon, 4)), owner: "John", bottleneck: "", status: "Not Started", parentId: 0 },
  ];
}
