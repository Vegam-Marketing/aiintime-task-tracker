import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { query, tasks } = await req.json();
    if (!query || !tasks) return NextResponse.json({ error: "Missing query or tasks" }, { status: 400 });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });

    // Build a compact task summary for the prompt
    const taskSummary = tasks.map((t) =>
      `[ID:${t.id}] "${t.task}" | Owner: ${t.owner} | ${t.start} to ${t.end} | Status: ${t.status}${t.bottleneck ? ` | Note: ${t.bottleneck}` : ""}${t.parentId && t.parentId !== 0 ? ` | ParentID: ${t.parentId}` : ""}`
    ).join("\n");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `You are a task search assistant. Given a list of project tasks and a search query, return the IDs of ALL tasks that semantically match the query. Think broadly about meaning — if someone searches "marketing", include content creation, social media, blog posts, LinkedIn, SEO, etc. If someone searches "overdue" or "at risk", look at statuses and bottlenecks. If someone searches a person's name, include all their tasks.

TASKS:
${taskSummary}

SEARCH QUERY: "${query}"

Return ONLY a JSON object with two keys:
- "ids": array of matching task IDs ordered by relevance (most relevant first)
- "summary": a one-sentence summary of what you found (e.g. "Found 5 marketing-related tasks, 2 are blocked")

Return ONLY valid JSON, no markdown, no backticks. Example: {"ids":[3,7,12],"summary":"Found 3 tasks related to content creation"}`
          }
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic API error:", err);
      return NextResponse.json({ error: "Claude API error" }, { status: 502 });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '{"ids":[],"summary":"No results"}';
    const cleaned = text.replace(/```json|```/g, "").trim();
    const result = JSON.parse(cleaned);

    return NextResponse.json({ matchedIds: result.ids || [], summary: result.summary || "" });
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
