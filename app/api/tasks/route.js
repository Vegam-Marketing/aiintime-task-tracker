import { NextResponse } from "next/server";
import { getTasks, saveTasks, getTeam } from "../../../lib/sheets";
import { verifyToken, getTokenFromRequest, unauthorizedResponse } from "../../../lib/auth";

export async function GET(req) {
  if (!verifyToken(getTokenFromRequest(req))) return unauthorizedResponse();
  try {
    const [tasks, team] = await Promise.all([getTasks(), getTeam()]);
    const nextId = tasks.length === 0 ? 1 : Math.max(...tasks.map((t) => t.id)) + 1;
    return NextResponse.json({ tasks, nextId, team });
  } catch (error) {
    console.error("GET /api/tasks error:", error);
    return NextResponse.json({ error: "Failed to fetch tasks", detail: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  if (!verifyToken(getTokenFromRequest(request))) return unauthorizedResponse();
  try {
    const { tasks } = await request.json();
    if (!Array.isArray(tasks)) return NextResponse.json({ error: "tasks must be an array" }, { status: 400 });
    await saveTasks(tasks);
    return NextResponse.json({ success: true, count: tasks.length });
  } catch (error) {
    console.error("POST /api/tasks error:", error);
    return NextResponse.json({ error: "Failed to save tasks", detail: error.message }, { status: 500 });
  }
}
