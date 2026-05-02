// Destiny Marine Hotel Search Console report (last 30 days).
//
// Usage:
//   GOOGLE_APPLICATION_CREDENTIALS=/abs/path/service-account.json \
//   SC_SITE_URL="https://destinymarine.com/" \
//   npm run report:search-console
//
// The service account email must be added as a user (Restricted access is
// enough) on the Search Console property. For domain properties use
// SC_SITE_URL="sc-domain:destinymarine.com".

import { google } from "googleapis";

const SITE_URL = process.env.SC_SITE_URL;
const DAYS = Number(process.env.SC_DAYS ?? 30);

if (!SITE_URL) {
  console.error("SC_SITE_URL env var is required (e.g. https://destinymarine.com/ or sc-domain:destinymarine.com)");
  process.exit(1);
}

const auth = new google.auth.GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
});
const webmasters = google.webmasters({ version: "v3", auth });

function isoDaysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

const startDate = isoDaysAgo(DAYS);
const endDate = isoDaysAgo(1);

async function query(dimensions, rowLimit = 25) {
  const { data } = await webmasters.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: { startDate, endDate, dimensions, rowLimit },
  });
  return (data.rows ?? []).map((r) => {
    const out = {};
    dimensions.forEach((d, i) => (out[d] = r.keys[i]));
    out.clicks = r.clicks;
    out.impressions = r.impressions;
    out.ctr = (r.ctr * 100).toFixed(2) + "%";
    out.position = r.position.toFixed(1);
    return out;
  });
}

function printTable(rows) {
  if (rows.length === 0) {
    console.log("(no data)");
    return;
  }
  console.table(rows);
}

async function main() {
  console.log(`Search Console ${SITE_URL} — ${startDate} → ${endDate}\n`);

  console.log("=== Top queries ===");
  printTable(await query(["query"]));

  console.log("\n=== Top pages ===");
  printTable(await query(["page"]));

  console.log("\n=== Country ===");
  printTable(await query(["country"], 10));

  console.log("\n=== Device ===");
  printTable(await query(["device"]));

  console.log("\n=== Daily ===");
  printTable(await query(["date"], DAYS));
}

main().catch((err) => {
  console.error("Search Console report failed:", err.message ?? err);
  process.exit(1);
});
