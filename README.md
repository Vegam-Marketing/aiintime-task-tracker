# aiintime.com — Task Tracker with Gantt Chart

A weekly task tracker for the sales & marketing team with interactive Gantt chart, backed by Google Sheets for persistence. Deploys to Vercel in minutes.

---

## Setup Guide (15 minutes total)

### Step 1: Create the Google Sheet (2 min)

1. Go to [sheets.google.com](https://sheets.google.com) and create a new spreadsheet
2. Name it **"Task Tracker"**
3. Rename the first tab to **Tasks** (bottom of screen, right-click the tab)
4. In Row 1, add these headers exactly:

| A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|
| id | task | start | end | owner | bottleneck | status | order |

5. Copy the **spreadsheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/THIS_IS_YOUR_SHEET_ID/edit
   ```
   Save this — you'll need it in Step 3.

---

### Step 2: Create a Google Service Account (5 min)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use an existing one)
3. Enable the **Google Sheets API**:
   - Go to APIs & Services → Library
   - Search "Google Sheets API" → Enable
4. Create a service account:
   - Go to APIs & Services → Credentials
   - Click "Create Credentials" → "Service Account"
   - Name it `task-tracker` → Create
   - Skip the optional steps → Done
5. Create a key:
   - Click on the service account you just created
   - Go to "Keys" tab → Add Key → Create New Key → JSON → Create
   - A `.json` file downloads — open it and save these two values:
     - `client_email` (looks like `task-tracker@your-project.iam.gserviceaccount.com`)
     - `private_key` (the long key starting with `-----BEGIN PRIVATE KEY-----`)
6. Share the Google Sheet with the service account:
   - Go back to your Google Sheet
   - Click Share → paste the `client_email` → give **Editor** access → Send

---

### Step 3: Push to GitHub (3 min)

1. Create a new GitHub repo (e.g., `aiintime-task-tracker`)
2. Push this project:

```bash
cd task-tracker
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/aiintime-task-tracker.git
git push -u origin main
```

---

### Step 4: Deploy to Vercel (5 min)

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "Add New Project" → Import your `aiintime-task-tracker` repo
3. Before deploying, add **Environment Variables**:

   | Variable | Value |
   |----------|-------|
   | `GOOGLE_SERVICE_ACCOUNT_EMAIL` | The `client_email` from Step 2 |
   | `GOOGLE_PRIVATE_KEY` | The full `private_key` from Step 2 (including `-----BEGIN...` and `-----END...`) |
   | `GOOGLE_SHEET_ID` | The spreadsheet ID from Step 1 |

4. Click **Deploy**

Your tracker is now live at `https://your-project.vercel.app` 🎉

---

### Optional: Custom Domain

1. In Vercel, go to your project → Settings → Domains
2. Add `tasks.aiintime.com` (or whatever you prefer)
3. Add the DNS records Vercel gives you to your domain registrar
4. SSL is automatic

---

## How It Works

- **Data lives in Google Sheets** — your team can also view raw data there
- **Auto-saves** 1.5 seconds after any change (debounced)
- **Everyone shares the same data** — refresh to see others' changes
- **Table ↔ Gantt are fully synced** — drag bars in Gantt, dates update in table
- **Drag rows** to reorder task priority
- **Filter by owner** to see one person's workload
- **Calendar navigation** — 1W/2W/3W/1M views with Today button

---

## Project Structure

```
task-tracker/
├── app/
│   ├── api/tasks/route.js   ← API: GET reads sheet, POST writes sheet
│   ├── layout.js             ← HTML shell + fonts
│   └── page.js               ← Loads the TaskTracker component
├── components/
│   └── TaskTracker.js        ← The full UI (table + Gantt + drag)
├── lib/
│   └── sheets.js             ← Google Sheets read/write helpers
├── .env.example              ← Template for env vars
├── package.json
└── next.config.js
```

---

## Local Development

```bash
cp .env.example .env.local
# Fill in your values in .env.local

npm install
npm run dev
# Open http://localhost:3000
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Failed to fetch tasks" | Check that the Google Sheet is shared with the service account email |
| "PERMISSION_DENIED" | Make sure the Sheets API is enabled in Google Cloud |
| Private key error | In Vercel env vars, paste the key as-is with real newlines (not `\n`) |
| Empty sheet on first load | The app seeds default tasks automatically on first visit |
