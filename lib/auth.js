// Shared auth check for all API routes
export function verifyToken(token) {
  const correctPassword = process.env.DASHBOARD_PASSWORD;
  if (!correctPassword) return true; // No password set = open access
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, "base64").toString("utf8");
    const pwd = decoded.split(":")[0];
    return pwd === correctPassword;
  } catch {
    return false;
  }
}

export function getTokenFromRequest(req) {
  const auth = req.headers.get("authorization");
  if (auth && auth.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export function unauthorizedResponse() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}
