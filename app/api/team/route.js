import { NextResponse } from "next/server";
import { getTeam, saveTeam } from "../../../lib/sheets";

export async function GET() {
  try {
    const team = await getTeam();
    return NextResponse.json({ team });
  } catch (error) {
    console.error("GET /api/team error:", error);
    return NextResponse.json(
      { error: "Failed to fetch team", detail: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { team } = await request.json();
    if (!Array.isArray(team)) {
      return NextResponse.json({ error: "team must be an array" }, { status: 400 });
    }
    await saveTeam(team);
    return NextResponse.json({ success: true, count: team.length });
  } catch (error) {
    console.error("POST /api/team error:", error);
    return NextResponse.json(
      { error: "Failed to save team", detail: error.message },
      { status: 500 }
    );
  }
}
