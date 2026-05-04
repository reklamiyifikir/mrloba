// Google Sheets adapter — header-map'li, batchUpdate ile yazar.
// Her sayfayı bir tablo gibi kullanır: ilk satır header, sonrası data.

import { google } from "googleapis";

function api(authClient) {
  return google.sheets({ version: "v4", auth: authClient });
}

function spreadsheetId() {
  const id = process.env.SHEETS_SPREADSHEET_ID;
  if (!id) throw new Error("SHEETS_SPREADSHEET_ID .env'de tanımlı olmalı.");
  return id;
}

export async function readTable(authClient, tabName) {
  const sheets = api(authClient);
  const range = `${tabName}!A1:ZZ`;
  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId(),
    range,
  });
  const rows = data.values ?? [];
  if (rows.length === 0) return { headers: [], records: [] };
  const headers = rows[0];
  const records = rows.slice(1).map((row, idx) => {
    const obj = { _rowNumber: idx + 2 };
    headers.forEach((h, i) => (obj[h] = row[i] ?? ""));
    return obj;
  });
  return { headers, records };
}

export async function appendRows(authClient, tabName, headers, rowObjects) {
  if (rowObjects.length === 0) return;
  const sheets = api(authClient);
  const values = rowObjects.map((obj) => headers.map((h) => stringify(obj[h])));
  await sheets.spreadsheets.values.append({
    spreadsheetId: spreadsheetId(),
    range: `${tabName}!A1`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values },
  });
}

// Updates: array of { rowNumber, fields: { col: value } }
export async function updateRows(authClient, tabName, headers, updates) {
  if (updates.length === 0) return;
  const sheets = api(authClient);
  const data = [];
  for (const u of updates) {
    for (const [col, val] of Object.entries(u.fields)) {
      const idx = headers.indexOf(col);
      if (idx === -1) throw new Error(`Bilinmeyen kolon: ${col} (sayfa: ${tabName})`);
      const a1col = colLetter(idx);
      data.push({
        range: `${tabName}!${a1col}${u.rowNumber}`,
        values: [[stringify(val)]],
      });
    }
  }
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: spreadsheetId(),
    requestBody: { valueInputOption: "RAW", data },
  });
}

export async function ensureHeaders(authClient, tabName, expectedHeaders) {
  const { headers } = await readTable(authClient, tabName);
  if (headers.length === 0) {
    const sheets = api(authClient);
    await sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId(),
      range: `${tabName}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [expectedHeaders] },
    });
    return expectedHeaders;
  }
  // Eksik header varsa uyar — kullanıcı elle ekler. Otomatik schema migration yapmıyoruz.
  const missing = expectedHeaders.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    throw new Error(`'${tabName}' sayfasında eksik kolonlar: ${missing.join(", ")}. Sheets'i elle güncelle.`);
  }
  return headers;
}

function stringify(v) {
  if (v === undefined || v === null) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function colLetter(idx) {
  let n = idx;
  let s = "";
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

// === Şema sabitleri ===

export const LEADS_HEADERS = [
  "LeadId", "CompanyId", "CompanyName", "Sector", "Region", "District", "Address",
  "Phone", "Website", "PrimaryEmail", "Source",
  "Status", "TemplateVariant",
  "LastDraftId", "LastMessageId", "ThreadId",
  "FirstSentAt", "LastSentAt", "RepliedAt",
  "Notes", "OptOutAt", "CreatedAt", "UpdatedAt",
];

export const SUPPRESSION_HEADERS = [
  "Email", "Domain", "Phone", "Reason", "AddedAt", "AddedBy",
];

export const SENDS_HEADERS = [
  "SendId", "LeadId", "Stage", "MessageId", "ThreadId", "Subject", "SentAt", "BodyHash",
];

export const TABS = {
  leads: () => process.env.SHEETS_LEADS_TAB || "Leads",
  suppression: () => process.env.SHEETS_SUPPRESSION_TAB || "Suppression",
  sends: () => process.env.SHEETS_SENDS_TAB || "Sends",
};
