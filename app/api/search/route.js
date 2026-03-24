import { NextResponse } from "next/server";
import { verifyToken, getTokenFromRequest, unauthorizedResponse } from "../../../lib/auth";

export async function POST(req) {
  if (!verifyToken(getTokenFromRequest(req))) return unauthorizedResponse();
  try {
    const { query, tasks } = await req.json();
    if (!query || !tasks) return NextResponse.json({ error: "Missing query or tasks" }, { status: 400 });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });

    const taskSummary = tasks.map((t) =>
      `[ID:${t.id}] "${t.task}" | Owner: ${t.owner} | ${t.start} to ${t.end} | Status: ${t.status}${t.bottleneck ? ` | Note: ${t.bottleneck}` : ""}${t.parentId && t.parentId !== 0 ? ` | ParentID: ${t.parentId}` : ""}`
    ).join("\n");

    const today = new Date().toISOString().split("T")[0];

    const prompt = `You are an AI assistant for a project task tracker. Today's date is ${today}.

TASKS:
${taskSummary}

QUESTION: "${query}"

Rules for your answer:
- Use plain text with newlines, NO markdown (no **, no ##, no *)
- Use "- " prefix for bullet points
- Group by owner or category when helpful
- Reference task names naturally, skip IDs in the answer
- Be concise but helpful
- For questions about dates, compare against today (${today})

Respond ONLY with JSON:
{"ids":[matching task IDs],"summary":"one short line","answer":"formatted plain text answer with newlines"}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 2048, responseMimeType: "application/json", thinkingConfig: { thinkingBudget: 0 } },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("Gemini API error:", err);
      return NextResponse.json({ error: "Gemini API error" }, { status: 502 });
    }

    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    const textParts = parts.filter((p) => !p.thought && p.text);
    const raw = textParts.map((p) => p.text).join("").trim();

    let result = { ids: [], summary: "No results", answer: "" };
    try {
      result = JSON.parse(raw);
    } catch (e1) {
      try {
        result = JSON.parse(raw.replace(/```json\s*|```\s*/g, "").trim());
      } catch (e2) {
        const jsonMatch = raw.match(/\{[\s\S]*"ids"\s*:\s*\[[\s\S]*?\][\s\S]*?\}/);
        if (jsonMatch) try { result = JSON.parse(jsonMatch[0]); } catch (e3) {}
      }
    }

    // Clean markdown from answer
    const cleanAnswer = (result.answer || "")
      .replace(/\*\*/g, "")
      .replace(/^\s*\*\s+/gm, "- ")
      .replace(/^\s*#+\s+/gm, "");

    return NextResponse.json({
      matchedIds: result.ids || [],
      summary: result.summary || "",
      answer: cleanAnswer,
    });
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json({ error: "Search failed: " + err.message }, { status: 500 });
  }
}
