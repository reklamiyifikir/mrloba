// Destiny Marine Hotel Google Ads report (last 30 days).
//
// Usage:
//   GOOGLE_ADS_CLIENT_ID=...
//   GOOGLE_ADS_CLIENT_SECRET=...
//   GOOGLE_ADS_DEVELOPER_TOKEN=...
//   GOOGLE_ADS_REFRESH_TOKEN=...
//   GOOGLE_ADS_CUSTOMER_ID=1234567890           # account to query (no dashes)
//   GOOGLE_ADS_LOGIN_CUSTOMER_ID=1234567890     # MCC id, only if applicable
//   npm run report:google-ads

import { GoogleAdsApi } from "google-ads-api";

const required = [
  "GOOGLE_ADS_CLIENT_ID",
  "GOOGLE_ADS_CLIENT_SECRET",
  "GOOGLE_ADS_DEVELOPER_TOKEN",
  "GOOGLE_ADS_REFRESH_TOKEN",
  "GOOGLE_ADS_CUSTOMER_ID",
];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error("Missing env vars:", missing.join(", "));
  process.exit(1);
}

const client = new GoogleAdsApi({
  client_id: process.env.GOOGLE_ADS_CLIENT_ID,
  client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
  developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
});

const customer = client.Customer({
  customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
  login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
  refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
});

const micros = (n) => (Number(n ?? 0) / 1_000_000).toFixed(2);
const pct = (n) => (Number(n ?? 0) * 100).toFixed(2) + "%";

function printTable(rows) {
  if (!rows || rows.length === 0) {
    console.log("(no data)");
    return;
  }
  console.table(rows);
}

async function main() {
  console.log(`Google Ads customer ${process.env.GOOGLE_ADS_CUSTOMER_ID} — last 30 days\n`);

  const [account] = await customer.query(`
    SELECT
      metrics.cost_micros,
      metrics.clicks,
      metrics.impressions,
      metrics.conversions,
      metrics.ctr,
      metrics.average_cpc
    FROM customer
    WHERE segments.date DURING LAST_30_DAYS
  `);
  const m = account?.metrics ?? {};
  console.log("=== Account totals ===");
  console.log({
    cost: micros(m.cost_micros),
    clicks: m.clicks,
    impressions: m.impressions,
    conversions: m.conversions,
    ctr: pct(m.ctr),
    avg_cpc: micros(m.average_cpc),
  });

  const campaigns = await customer.query(`
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      metrics.cost_micros,
      metrics.clicks,
      metrics.impressions,
      metrics.conversions
    FROM campaign
    WHERE segments.date DURING LAST_30_DAYS
    ORDER BY metrics.cost_micros DESC
  `);
  console.log("\n=== Campaigns ===");
  printTable(
    campaigns.map((r) => ({
      id: r.campaign.id,
      name: r.campaign.name,
      status: r.campaign.status,
      cost: micros(r.metrics.cost_micros),
      clicks: r.metrics.clicks,
      impressions: r.metrics.impressions,
      conversions: r.metrics.conversions,
    })),
  );

  const keywords = await customer.query(`
    SELECT
      ad_group_criterion.keyword.text,
      ad_group_criterion.keyword.match_type,
      metrics.cost_micros,
      metrics.clicks,
      metrics.impressions,
      metrics.conversions
    FROM keyword_view
    WHERE segments.date DURING LAST_30_DAYS
    ORDER BY metrics.cost_micros DESC
    LIMIT 25
  `);
  console.log("\n=== Top keywords ===");
  printTable(
    keywords.map((r) => ({
      keyword: r.ad_group_criterion.keyword.text,
      match: r.ad_group_criterion.keyword.match_type,
      cost: micros(r.metrics.cost_micros),
      clicks: r.metrics.clicks,
      impressions: r.metrics.impressions,
      conversions: r.metrics.conversions,
    })),
  );

  const search = await customer.query(`
    SELECT
      search_term_view.search_term,
      metrics.cost_micros,
      metrics.clicks,
      metrics.impressions,
      metrics.conversions
    FROM search_term_view
    WHERE segments.date DURING LAST_30_DAYS
    ORDER BY metrics.cost_micros DESC
    LIMIT 25
  `);
  console.log("\n=== Top search terms ===");
  printTable(
    search.map((r) => ({
      term: r.search_term_view.search_term,
      cost: micros(r.metrics.cost_micros),
      clicks: r.metrics.clicks,
      impressions: r.metrics.impressions,
      conversions: r.metrics.conversions,
    })),
  );
}

main().catch((err) => {
  console.error("Google Ads report failed:", err.message ?? err);
  process.exit(1);
});
