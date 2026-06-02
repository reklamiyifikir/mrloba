---
name: ga4-summary
description: Auto-invoked when the user asks about GA4 traffic, sessions, sources, or pages for the Destiny Marine property. Use this skill before raw analysis to ensure consistent reporting style.
---

# GA4 summary skill

When the user asks about GA4 metrics for Destiny Marine, follow these rules:

## Scope
- The script lives at `scripts/ga4-traffic-report.mjs`.
- Auth is via `GOOGLE_APPLICATION_CREDENTIALS=<abs path to service-account.json>`.
- Default property: `486676130` (override with `GA4_PROPERTY_ID`).
- Default window: 30 days (override with `GA4_DAYS`).

## Reporting style
- Always answer in **Turkish**.
- Mobile-friendly: short bullets, never wide tables.
- Round numbers: `12,345 sessions` → `~12,3K oturum`.
- Engagement rate as percentage with 1 decimal.

## Before running anything
1. Confirm `GOOGLE_APPLICATION_CREDENTIALS` is set; if not, tell the user the exact command.
2. Confirm the working directory is the mrloba repo root.

## Sensitive data
- Never include real guest names, emails, phone numbers, or booking IDs in the output. The GA4 report itself does not surface this, but if the user pastes additional data, scrub it.
