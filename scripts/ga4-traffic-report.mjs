// Destiny Marine Hotel GA4 traffic report (last 30 days).
//
// Usage:
//   GOOGLE_APPLICATION_CREDENTIALS=/abs/path/service-account.json \
//   npm run report:ga4
//
// The service account must be added as a Viewer on GA4 property 486676130.

import { BetaAnalyticsDataClient } from "@google-analytics/data";

const PROPERTY_ID = process.env.GA4_PROPERTY_ID ?? "486676130";
const DAYS = Number(process.env.GA4_DAYS ?? 30);

const client = new BetaAnalyticsDataClient();

async function runReport({ dimensions, metrics, limit, orderBy }) {
  const [response] = await client.runReport({
    property: `properties/${PROPERTY_ID}`,
    dateRanges: [{ startDate: `${DAYS}daysAgo`, endDate: "today" }],
    dimensions: dimensions.map((name) => ({ name })),
    metrics: metrics.map((name) => ({ name })),
    orderBys: orderBy,
    limit,
  });
  return response;
}

function formatRows(response) {
  const dimHeaders = (response.dimensionHeaders ?? []).map((h) => h.name);
  const metHeaders = (response.metricHeaders ?? []).map((h) => h.name);
  const rows = (response.rows ?? []).map((row) => {
    const out = {};
    (row.dimensionValues ?? []).forEach((v, i) => (out[dimHeaders[i]] = v.value));
    (row.metricValues ?? []).forEach((v, i) => (out[metHeaders[i]] = v.value));
    return out;
  });
  return rows;
}

function printTotals(response) {
  const totals = response.totals?.[0]?.metricValues ?? [];
  const headers = response.metricHeaders ?? [];
  const pairs = headers.map((h, i) => `${h.name}=${totals[i]?.value ?? "0"}`);
  console.log(`Totals: ${pairs.join("  ")}`);
}

function printTable(rows) {
  if (rows.length === 0) {
    console.log("(no data)");
    return;
  }
  console.table(rows);
}

async function main() {
  console.log(`GA4 property ${PROPERTY_ID} — last ${DAYS} days\n`);

  console.log("=== Overall totals ===");
  const totals = await runReport({
    dimensions: [],
    metrics: ["sessions", "activeUsers", "screenPageViews", "engagementRate", "averageSessionDuration"],
  });
  printTotals(totals);

  console.log("\n=== Daily trend ===");
  const daily = await runReport({
    dimensions: ["date"],
    metrics: ["sessions", "activeUsers", "screenPageViews"],
    orderBy: [{ dimension: { dimensionName: "date" } }],
  });
  printTable(formatRows(daily));

  console.log("\n=== Top traffic sources ===");
  const sources = await runReport({
    dimensions: ["sessionSource", "sessionMedium"],
    metrics: ["sessions", "activeUsers", "engagementRate"],
    orderBy: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 10,
  });
  printTable(formatRows(sources));

  console.log("\n=== Top countries ===");
  const countries = await runReport({
    dimensions: ["country"],
    metrics: ["sessions", "activeUsers"],
    orderBy: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 10,
  });
  printTable(formatRows(countries));

  console.log("\n=== Top pages ===");
  const pages = await runReport({
    dimensions: ["pagePath"],
    metrics: ["screenPageViews", "activeUsers", "averageSessionDuration"],
    orderBy: [{ metric: { metricName: "screenPageViews" }, desc: true }],
    limit: 10,
  });
  printTable(formatRows(pages));

  console.log("\n=== Device category ===");
  const devices = await runReport({
    dimensions: ["deviceCategory"],
    metrics: ["sessions", "activeUsers", "engagementRate"],
    orderBy: [{ metric: { metricName: "sessions" }, desc: true }],
  });
  printTable(formatRows(devices));
}

main().catch((err) => {
  console.error("GA4 report failed:", err.message ?? err);
  process.exit(1);
});
