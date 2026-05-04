---
description: Run the GA4 traffic report for the last N days
argument-hint: [days]
---

Run the Destiny Marine GA4 traffic report.

1. If `$ARGUMENTS` is empty, default to 30 days; otherwise use it as `GA4_DAYS`.
2. Verify `GOOGLE_APPLICATION_CREDENTIALS` is set; if not, stop and tell the user the exact command they need to run.
3. From the repo root, run: `GA4_DAYS=<days> npm run report:ga4`
4. Summarize the output in **Turkish** as concise bullet points covering:
   - Total sessions, active users, page views, engagement rate
   - Top 3 traffic sources
   - Top 3 countries
   - Top 3 pages
   - Device split

Keep the summary mobile-friendly: short bullets, no wide tables.
