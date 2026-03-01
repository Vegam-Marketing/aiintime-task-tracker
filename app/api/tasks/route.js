import { NextResponse } from "next/server";
import { getTasks, saveTasks, getNextId } from "../../../lib/sheets";

// GET /api/tasks — fetch all tasks
export async function GET() {
  try {
    const tasks = await getTasks();
    const nextId = tasks.length === 0 ? 1 : Math.max(...tasks.map((t) => t.id)) + 1;
    return NextResponse.json({ tasks, nextId });
  } catch (error) {
    console.error("GET /api/tasks error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks", detail: error.message },
      { status: 500 }
    );
  }
}

// POST /api/tasks — save all tasks (full overwrite)
export async function POST(request) {
  try {
    const { tasks } = await request.json();
    if (!Array.isArray(tasks)) {
      return NextResponse.json({ error: "tasks must be an array" }, { status: 400 });
    }
    await saveTasks(tasks);
    return NextResponse.json({ success: true, count: tasks.length });
  } catch (error) {
    console.error("POST /api/tasks error:", error);
    return NextResponse.json(
      { error: "Failed to save tasks", detail: error.message },
      { status: 500 }
    );
  }
}
