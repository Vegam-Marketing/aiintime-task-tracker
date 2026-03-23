"use client";
import { useState, useEffect } from "react";

export default function LoginGate({ children }) {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Check existing session on mount
  useEffect(() => {
    const token = typeof window !== "undefined" ? sessionStorage.getItem("gtm_token") : null;
    if (!token) { setChecking(false); return; }
    fetch("/api/auth", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.valid) setAuthed(true); setChecking(false); })
      .catch(() => setChecking(false));
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem("gtm_token", data.token);
        setAuthed(true);
      } else {
        setError("Incorrect password");
        setPassword("");
      }
    } catch {
      setError("Login failed");
    }
    setLoading(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("gtm_token");
    setAuthed(false);
    setPassword("");
  };

  if (checking) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8FAFC", fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
        <div style={{ color: "#94A3B8", fontSize: 14 }}>Loading...</div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
        <div style={{ width: 360, background: "#fff", borderRadius: 16, padding: "40px 32px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#0F172A", marginBottom: 4 }}>AI Intime</div>
            <div style={{ fontSize: 14, color: "#94A3B8", fontWeight: 500 }}>GTM Dashboard</div>
          </div>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 6 }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoFocus
                style={{ width: "100%", padding: "12px 14px", border: error ? "2px solid #EF4444" : "1px solid #E2E8F0", borderRadius: 10, fontSize: 14, color: "#1E293B", outline: "none", background: "#F8FAFC", boxSizing: "border-box" }}
              />
              {error && <div style={{ fontSize: 12, color: "#EF4444", marginTop: 6, fontWeight: 500 }}>{error}</div>}
            </div>
            <button type="submit" disabled={loading || !password}
              style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: loading || !password ? "#CBD5E1" : "#1E293B", color: "#fff", fontSize: 14, fontWeight: 700, cursor: loading || !password ? "default" : "pointer", transition: "all 0.15s" }}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Pass logout function via context or prop — we'll attach it to window for simplicity
  if (typeof window !== "undefined") window.__gtmLogout = handleLogout;

  return children;
}
