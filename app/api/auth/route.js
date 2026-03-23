import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { password } = await req.json();
    const correctPassword = process.env.DASHBOARD_PASSWORD;

    if (!correctPassword) {
      // No password set — allow access
      return NextResponse.json({ success: true, token: "no-auth" });
    }

    if (password === correctPassword) {
      // Simple token: base64 of password + timestamp
      const token = Buffer.from(`${correctPassword}:${Date.now()}`).toString("base64");
      return NextResponse.json({ success: true, token });
    }

    return NextResponse.json({ success: false, error: "Incorrect password" }, { status: 401 });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Auth failed" }, { status: 500 });
  }
}

// Verify token
export async function PUT(req) {
  try {
    const { token } = await req.json();
    const correctPassword = process.env.DASHBOARD_PASSWORD;

    if (!correctPassword) return NextResponse.json({ valid: true });

    if (!token || token === "no-auth") return NextResponse.json({ valid: !correctPassword });

    try {
      const decoded = Buffer.from(token, "base64").toString("utf8");
      const [pwd] = decoded.split(":");
      return NextResponse.json({ valid: pwd === correctPassword });
    } catch {
      return NextResponse.json({ valid: false });
    }
  } catch {
    return NextResponse.json({ valid: false });
  }
}
