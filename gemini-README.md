# ◈ Event Radar — USA Tech & AI Event Tracker (Gemini Edition)

Find and track live tech, AI, and startup events across any US city in real time.  
Powered by **Google Gemini 2.0 Flash** with built-in Google Search grounding — **free to use**.

---

## Features

- **Search any US city** — type any city and keywords to discover events
- **Google Search grounding** — Gemini searches the live web for real event listings
- **Calendar view** — see events laid out by date with source-colored dots
- **Event tracker** — save events, set status, add team notes
- **Source badges** — every event shows where it was found (via Luma, via Meetup, etc.)
- **CSV export** — download your tracked events as a spreadsheet
- **100% free** — Gemini API free tier + Vercel free hosting

---

## Deployment Guide (15 minutes, $0)

### Step 1: Get a FREE Gemini API Key

1. Go to **[aistudio.google.com/apikey](https://aistudio.google.com/apikey)**
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the key

> That's it. No billing setup, no credit card. The free tier gives you 15 requests/minute 
> and 1,500 requests/day — more than enough.

### Step 2: Push to GitHub

```bash
# Create a new repo on GitHub, then:
git init event-radar
cd event-radar

# Copy all project files into this folder
git add .
git commit -m "Event Radar — Gemini edition"
git remote add origin https://github.com/YOUR_USERNAME/event-radar.git
git push -u origin main
```

### Step 3: Deploy on Vercel (free)

1. Go to **[vercel.com](https://vercel.com)** → sign in with GitHub
2. Click **"Add New Project"**
3. Import your `event-radar` repository
4. Vercel auto-detects Vite — leave defaults
5. Click **Deploy**

### Step 4: Add Your API Key

1. In Vercel dashboard → your project → **Settings** → **Environment Variables**
2. Add:
   - **Key:** `GEMINI_API_KEY`
   - **Value:** your key from Step 1
3. Click **Save**
4. Go to **Deployments** → click **⋮** on the latest → **Redeploy**

### Step 5: Done!

Your app is live at `https://event-radar-xxx.vercel.app` with working search.

---

## How It Works

```
Browser (your app)
    ↓  POST /api/search  { prompt: "find AI events in NYC..." }
Vercel Serverless Function (api/search.js)
    ↓  POST generativelanguage.googleapis.com
    ↓  Gemini 2.0 Flash + Google Search grounding
    ↓  (your API key stays on the server, never exposed)
Google Gemini → searches the web → returns event JSON
    ↓
Back to your browser → rendered as event cards + calendar
```

Your API key never leaves the server. Users only interact with `/api/search`.

---

## Local Development

```bash
npm install

# Create .env with your key
echo "GEMINI_API_KEY=your-key-here" > .env

# Run with Vercel dev (serves frontend + serverless function)
npx vercel dev

# Or frontend only (search won't work without the API proxy)
npm run dev
```

---

## Project Structure

```
event-radar/
├── api/
│   └── search.js          # Serverless proxy → Gemini API (keeps key safe)
├── src/
│   ├── App.jsx             # Main Event Radar app
│   └── main.jsx            # React entry point
├── index.html              # HTML shell
├── package.json
├── vite.config.js
├── vercel.json             # Vercel routing
├── .env.example            # Template for API key
└── .gitignore
```

---

## Why Gemini?

| | Gemini 2.0 Flash | Claude Sonnet |
|---|---|---|
| **Free tier** | ✅ 1,500 req/day | ❌ Requires paid API |
| **Web search** | ✅ Built-in (Google Search grounding) | ✅ Web search tool |
| **Speed** | ~2-4 seconds | ~5-10 seconds |
| **Cost after free tier** | ~$0.001/search | ~$0.01-0.05/search |
| **Setup** | Google account only | Requires billing |

---

## Gemini API Free Tier Limits

- **15 requests per minute**
- **1,500 requests per day**
- **No credit card required**
- Just a Google account

For a personal event tracker, this is more than enough. If you hit limits, you can add billing at [console.cloud.google.com](https://console.cloud.google.com) for very cheap pay-per-use.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "GEMINI_API_KEY not configured" | Add the env var in Vercel dashboard and redeploy |
| "API key not valid" | Re-copy from [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| Search returns nothing | Try broader keywords or a major city |
| CORS errors | Make sure you're calling `/api/search`, not the Gemini API directly |
| 429 rate limit | You've hit 15 req/min — wait a moment and retry |

---

## License

MIT — use it however you like.
