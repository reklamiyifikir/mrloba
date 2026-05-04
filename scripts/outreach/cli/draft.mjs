// Status=NEW lead'ler için Gmail'de draft oluştur (Outreach/Pending label).
//
// Kullanım:
//   npm run outreach:draft
//   npm run outreach:draft -- --limit=10
//   npm run outreach:draft -- --dry-run

import "dotenv/config";
import { parseArgs } from "node:util";
import { getAuthClient } from "../lib/auth.mjs";
import { ensureHeaders, readTable, updateRows, LEADS_HEADERS, TABS } from "../lib/sheets.mjs";
import { ensureLabel, createDraft } from "../lib/gmail.mjs";
import { loadTemplate, render, splitSubjectAndBody } from "../lib/template.mjs";
import { buildFooter, buildSignature } from "../compliance/footer.mjs";
import { log } from "../lib/logger.mjs";

const REGION_LABELS = {
  ist_anadolu: "İstanbul Anadolu yakası",
  ist_avrupa: "İstanbul Avrupa yakası",
  kocaeli: "Kocaeli",
  sakarya: "Sakarya",
};

async function main() {
  const { values } = parseArgs({
    options: {
      limit: { type: "string", default: String(process.env.DAILY_SEND_CAP || "30") },
      "dry-run": { type: "boolean", default: false },
    },
  });
  const limit = Number(values.limit);
  const dryRun = values["dry-run"];

  const auth = await getAuthClient();
  const headers = await ensureHeaders(auth, TABS.leads(), LEADS_HEADERS);
  const { records } = await readTable(auth, TABS.leads());

  const candidates = records.filter((r) => r.Status === "NEW" && r.PrimaryEmail).slice(0, limit);
  log.info(`Draft yapılacak NEW lead: ${candidates.length} (limit=${limit})`);

  if (candidates.length === 0) return;

  const skippedNoNotes = records.filter((r) => r.Status === "NEW" && r.PrimaryEmail && !r.Notes?.trim());
  if (skippedNoNotes.length > 0 && !dryRun) {
    log.warn(`${skippedNoNotes.length} lead'de Notes boş — şablonun ilk paragrafı zayıf olur. Sheets'te doldurman önerilir.`);
  }

  const footer = await buildFooter();
  const signature = await buildSignature();
  const calendlyUrl = process.env.CALENDLY_URL || "https://calendly.com/reklamfikir";

  const labelId = dryRun ? null : await ensureLabel(auth, process.env.GMAIL_PENDING_LABEL || "Outreach/Pending");

  const updates = [];
  let drafted = 0;

  for (const lead of candidates) {
    const variant = lead.TemplateVariant || "initial";
    const tmplPath = `${lead.Sector}/${variant}.md`;
    let tmpl;
    try {
      tmpl = await loadTemplate(tmplPath);
    } catch {
      log.warn(`Şablon yok: ${tmplPath} — atlanıyor (lead=${lead.LeadId})`);
      continue;
    }

    const rendered = render(tmpl, {
      COMPANY_NAME: lead.CompanyName,
      NOTES: (lead.Notes || "").trim() || `${lead.CompanyName} için notunuz: web sitenizi ve Google Maps profilinizi inceledim, küçük gözlemlerim var.`,
      REGION_LABEL: REGION_LABELS[lead.Region] || lead.Region,
      CALENDLY_URL: calendlyUrl,
      SIGNATURE: signature,
      FOOTER: footer,
    });
    const { subject, body } = splitSubjectAndBody(rendered);

    if (dryRun) {
      log.dry(`Draft hazır (lead=${lead.LeadId} ${lead.CompanyName})`);
      console.log(`  To: ${lead.PrimaryEmail}\n  Subject: ${subject}\n  Body önizleme:\n${body.split("\n").slice(0, 4).map((l) => "    " + l).join("\n")}\n`);
      drafted++;
      continue;
    }

    const draft = await createDraft(auth, {
      to: lead.PrimaryEmail,
      subject,
      body,
      labelIds: labelId ? [labelId] : [],
    });

    const now = new Date().toISOString();
    updates.push({
      rowNumber: lead._rowNumber,
      fields: {
        Status: "DRAFTED",
        LastDraftId: draft.draftId,
        ThreadId: draft.threadId || "",
        UpdatedAt: now,
      },
    });
    drafted++;
    log.ok(`Draft (${draft.draftId}) -> ${lead.PrimaryEmail}`);
  }

  if (!dryRun && updates.length > 0) {
    await updateRows(auth, TABS.leads(), headers, updates);
  }
  log.ok(`Toplam ${drafted} draft hazır${dryRun ? " (dry-run)" : ""}.`);
}

main().catch((err) => {
  log.error("draft başarısız:", err.message ?? err);
  process.exit(1);
});
