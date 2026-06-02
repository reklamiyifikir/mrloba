# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository purpose

A Node.js (ESM, Node 18+) utility repo for Destiny Marine Hotel reporting. Currently contains a single GA4 traffic report script; structure should accommodate additional analytics/reporting scripts under `scripts/`.

## Commands

```bash
npm install                                                      # install deps
GOOGLE_APPLICATION_CREDENTIALS=/abs/path/service-account.json \
  npm run report:ga4                                             # run GA4 report
```

Override defaults via env vars:
- `GA4_PROPERTY_ID` (default `486676130`)
- `GA4_DAYS` (default `30`)

## Architecture notes

- **GA4 access** — `scripts/ga4-traffic-report.mjs` uses `@google-analytics/data` (`BetaAnalyticsDataClient`). Auth comes solely from `GOOGLE_APPLICATION_CREDENTIALS` pointing to a service-account JSON. The service account must be added as a Viewer on the GA4 property.
- **Report shape** — a single `runReport({ dimensions, metrics, limit, orderBy })` helper drives multiple report sections (totals, daily trend, sources, countries, pages, devices). New report sections should follow this same pattern rather than calling the client directly.
- **Output** — results print to stdout via `console.table`/`console.log`; there is no persistence layer or HTTP server.

## Conventions

- ESM only (`"type": "module"`, `.mjs`).
- Service-account files (`service-account*.json`) and `.env` are gitignored — never commit credentials.
