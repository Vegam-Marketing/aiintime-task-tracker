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

    const prompt = `You are a task search assistant. Given a list of project tasks and a search query, return the IDs of ALL tasks that semantically match the query. Think broadly about meaning — if someone searches "marketing", include content creation, social media, blog posts, LinkedIn, SEO, etc. If someone searches "overdue" or "at risk", look at statuses and bottlenecks. If someone searches a person's name, include all their tasks.

TASKS:
${taskSummary}

SEARCH QUERY: "${query}"

Return ONLY a JSON object with two keys:
- "ids": array of matching task IDs ordered by relevance (most relevant first)
- "summary": a one-sentence summary of what you found

Return ONLY valid JSON, no markdown, no backticks, no explanation. Example: {"ids":[3,7,12],"summary":"Found 3 tasks related to content creation"}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("Gemini API error:", err);
      return NextResponse.json({ error: "Gemini API error" }, { status: 502 });
    }

    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
    
    // Extract JSON from response — Gemini may wrap it in markdown or add thinking text
    let result = { ids: [], summary: "No results" };
    try {
      // Try direct parse first
      const cleaned = raw.replace(/```json|```/g, "").trim();
      result = JSON.parse(cleaned);
    } catch (e1) {
      // Find JSON object in the text
      const jsonMatch = raw.match(/\{[\s\S]*"ids"\s*:\s*\[[\s\S]*?\][\s\S]*?\}/);
      if (jsonMatch) {
        try { result = JSON.parse(jsonMatch[0]); } catch (e2) {
          // Last resort: extract IDs with regex
          const idMatches = raw.match(/\b\d+\b/g);
          if (idMatches) {
            const validIds = idMatches.map(Number).filter((id) => tasks.some((t) => t.id === id));
            result = { ids: validIds, summary: `Found ${validIds.length} matching tasks` };
          }
        }
      }
    }

    return NextResponse.json({ matchedIds: result.ids || [], summary: result.summary || "" });
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
