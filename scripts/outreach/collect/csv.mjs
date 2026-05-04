// Manuel CSV import — Sheets'e Lead olarak almak için minimal parser.
// Beklenen header'lar (eksiksiz olmasa da olur, eşleşenleri alır):
// CompanyName,Sector,Region,District,Address,Phone,Website,PrimaryEmail

import { readFile } from "node:fs/promises";

function splitCsvLine(line) {
  // Basit RFC 4180 parser: "..." içinde virgül destekler.
  const out = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuote) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQuote = false;
      else cur += c;
    } else {
      if (c === '"') inQuote = true;
      else if (c === ",") { out.push(cur); cur = ""; }
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}

export async function readCsv(path) {
  const text = await readFile(path, "utf8");
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => (obj[h] = (cells[idx] || "").trim()));
    rows.push(obj);
  }
  return rows;
}
