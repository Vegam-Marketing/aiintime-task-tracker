import { google } from "googleapis";

// Authenticates with Google using a service account
function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      // The private key comes from env with escaped newlines — restore them
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function getSheets() {
  return google.sheets({ version: "v4", auth: getAuth() });
}

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = "Tasks"; // The tab name inside your spreadsheet

// Column order in the sheet:
// A: id | B: task | C: start | D: end | E: owner | F: bottleneck | G: status | H: order

/**
 * Read all tasks from the Google Sheet
 */
export async function getTasks() {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:H`,  // Skip header row
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
    }))
    .sort((a, b) => a.order - b.order);
}

/**
 * Write all tasks to the Google Sheet (full overwrite)
 * This is simpler and safer than row-level updates for a small dataset
 */
export async function saveTasks(tasks) {
  const sheets = getSheets();

  // Clear existing data (keep header)
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:H`,
  });

  if (tasks.length === 0) return;

  // Write all rows
  const values = tasks.map((t, i) => [
    t.id,
    t.task,
    t.start,
    t.end,
    t.owner,
    t.bottleneck,
    t.status,
    i, // order = array position
  ]);

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:H`,
    valueInputOption: "RAW",
    requestBody: { values },
  });
}

/**
 * Get the next available ID
 */
export async function getNextId() {
  const tasks = await getTasks();
  if (tasks.length === 0) return 1;
  return Math.max(...tasks.map((t) => t.id)) + 1;
}
