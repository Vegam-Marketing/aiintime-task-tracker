// /api/search.js — Vercel Serverless Function for Google Gemini
// Proxies requests to Gemini API with Google Search grounding (built-in web search)

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY not configured on server" });
  }

  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Missing 'prompt' in request body" });
    }

    // Gemini API with Google Search grounding
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        tools: [
          {
            google_search: {},
          },
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 8192,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg =
        data.error?.message || JSON.stringify(data.error) || "Gemini API error";
      return res.status(response.status).json({ error: errMsg });
    }

    // Extract text from Gemini response
    const candidate = data.candidates?.[0];
    if (!candidate) {
      return res.status(500).json({ error: "No response from Gemini" });
    }

    const textParts = (candidate.content?.parts || [])
      .filter((p) => p.text)
      .map((p) => p.text);

    const text = textParts.join("\n");

    // Extract grounding sources if available
    const groundingMeta = candidate.groundingMetadata;
    const sources = (groundingMeta?.groundingChunks || []).map((chunk) => ({
      title: chunk.web?.title || "",
      url: chunk.web?.uri || "",
    }));

    return res.status(200).json({
      text,
      sources,
      finishReason: candidate.finishReason,
    });
  } catch (err) {
    console.error("Proxy error:", err);
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
}
