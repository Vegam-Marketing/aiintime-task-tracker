import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { query, tasks } = await req.json();
    if (!query || !tasks) return NextResponse.json({ error: "Missing query or tasks" }, { status: 400 });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });

    const taskSummary = tasks.map((t) =>
      `[ID:${t.id}] "${t.task}" | Owner: ${t.owner} | ${t.start} to ${t.end} | Status: ${t.status}${t.bottleneck ? ` | Note: ${t.bottleneck}` : ""}${t.parentId && t.parentId !== 0 ? ` | ParentID: ${t.parentId}` : ""}`
    ).join("\n");

    const prompt = `You are an AI assistant for a project task tracker. You have access to the team's task list below. Answer the user's question by:

1. Looking at the tasks to find relevant ones
2. If the question needs external knowledge (e.g. "what is SOCMA?", "best practices for cold outreach"), provide a helpful answer using your knowledge
3. Always identify which tasks from the list are relevant to the query

CURRENT TASKS:
${taskSummary}

USER QUESTION: "${query}"

Respond with ONLY a JSON object (no markdown, no backticks):
{
  "ids": [array of relevant task IDs, empty if none match],
  "summary": "Brief one-line summary of what you found",
  "answer": "A detailed helpful answer to the user's question. If the query is a simple search (like a name or keyword), leave this empty. If the query is a question that benefits from explanation, provide a useful answer here."
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 2048, responseMimeType: "application/json" },
          tools: [{ googleSearch: {} }],
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("Gemini API error:", err);
      return NextResponse.json({ error: "Gemini API error" }, { status: 502 });
    }

    const data = await response.json();

    // Filter out thinking parts, get only text
    const parts = data.candidates?.[0]?.content?.parts || [];
    const textParts = parts.filter((p) => !p.thought && p.text);
    const raw = textParts.map((p) => p.text).join("").trim();

    console.log("Gemini raw:", raw.substring(0, 500));

    let result = { ids: [], summary: "No results", answer: "" };

    try {
      result = JSON.parse(raw);
    } catch (e1) {
      try {
        const cleaned = raw.replace(/```json\s*|```\s*/g, "").trim();
        result = JSON.parse(cleaned);
      } catch (e2) {
        const jsonMatch = raw.match(/\{[\s\S]*"ids"\s*:\s*\[[\s\S]*?\][\s\S]*?\}/);
        if (jsonMatch) {
          try { result = JSON.parse(jsonMatch[0]); } catch (e3) {}
        }
        if (result.ids.length === 0) {
          const allNums = [...raw.matchAll(/\b(\d+)\b/g)].map((m) => Number(m[1]));
          const taskIdSet = new Set(tasks.map((t) => t.id));
          const validIds = allNums.filter((n) => taskIdSet.has(n));
          if (validIds.length > 0) {
            result = { ids: [...new Set(validIds)], summary: `Found ${new Set(validIds).size} matching tasks`, answer: "" };
          }
        }
      }
    }

    return NextResponse.json({
      matchedIds: result.ids || [],
      summary: result.summary || "",
      answer: result.answer || "",
    });
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json({ error: "Search failed: " + err.message }, { status: 500 });
  }
}
