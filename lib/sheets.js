import { google } from "googleapis";

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function getSheets() {
  return google.sheets({ version: "v4", auth: getAuth() });
}

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const TASKS_SHEET = "Tasks";
const TEAM_SHEET = "Team";

// Columns: A:id | B:task | C:start | D:end | E:owner | F:bottleneck | G:status | H:order | I:parentId

export async function getTasks() {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${TASKS_SHEET}!A2:I`,
  });

  const rows = res.data.values || [];
  return rows
    .map((row) => ({
      id: parseInt(row[0], 10),
      task: row[1] || "",
      start: row[2] || "",
      end: row[3] || "",
      owner: row[4] || "",
      bottleneck: row[5] || "",
      status: row[6] || "Not Started",
      order: parseInt(row[7], 10) || 0,
      parentId: parseInt(row[8], 10) || 0,
    }))
    .sort((a, b) => a.order - b.order);
}

export async function saveTasks(tasks) {
  const sheets = getSheets();

  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${TASKS_SHEET}!A2:I`,
  });

  if (tasks.length === 0) return;

  const values = tasks.map((t, i) => [
    t.id, t.task, t.start, t.end, t.owner, t.bottleneck, t.status, i, t.parentId || 0,
  ]);

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${TASKS_SHEET}!A2:I`,
    valueInputOption: "RAW",
    requestBody: { values },
  });
}

// ─── TEAM ───────────────────────────────────────────────────────────

export async function getTeam() {
  const sheets = getSheets();
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${TEAM_SHEET}!A2:C`,
    });

    const rows = res.data.values || [];
    if (rows.length === 0) return null;

    return rows
      .map((row) => ({
        name: row[0] || "",
        color: row[1] || "#6B7280",
        order: parseInt(row[2], 10) || 0,
      }))
      .sort((a, b) => a.order - b.order);
  } catch (e) {
    return null;
  }
}

export async function saveTeam(team) {
  const sheets = getSheets();

  try {
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `${TEAM_SHEET}!A2:C`,
    });
  } catch (e) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: TEAM_SHEET } } }],
      },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${TEAM_SHEET}!A1:C1`,
      valueInputOption: "RAW",
      requestBody: { values: [["name", "color", "order"]] },
    });
  }

  if (team.length === 0) return;

  const values = team.map((m, i) => [m.name, m.color, i]);

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${TEAM_SHEET}!A2:C`,
    valueInputOption: "RAW",
    requestBody: { values },
  });
}
