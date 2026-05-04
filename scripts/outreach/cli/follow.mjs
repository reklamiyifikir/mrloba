// T+5 iş günü cevap gelmeyen Status=SENT lead'ler için aynı thread'de followup-1 draft'ı oluştur.
// Cevap gelirse Status=REPLIED yapar (sequence durur).
//
// Kullanım:
//   npm run outreach:follow
//   npm run outreach:follow -- --days=5 --dry-run

import "dotenv/config";
import { parseArgs } from "node:util";
import { getAuthClient } from "../lib/auth.mjs";
import { ensureHeaders, readTable, updateRows, LEADS_HEADERS, TABS } from "../lib/sheets.mjs";
import { ensureLabel, createDraft, getMessageHeaders, threadHasNewerInboundMessage } from "../lib/gmail.mjs";
import { loadTemplate, render, splitSubjectAndBody } from "../lib/template.mjs";
import { buildFooter, buildSignature } from "../compliance/footer.mjs";
import { log } from "../lib/logger.mjs";

const DAY_MS = 24 * 3600 * 1000;

function isWeekend(d) { const w = d.getUTCDay(); return w === 0 || w === 6; }

function businessDaysBetween(from, to) {
  let count = 0;
  const cur = new Date(from);
  while (cur < to) {
    cur.setUTCDate(cur.getUTCDate() + 1);
    if (!isWeekend(cur)) count++;
  }
  return count;
}

async function main() {
  const { values } = parseArgs({
    options: {
      days: { type: "string", default: "5" },
      "dry-run": { type: "boolean", default: false },
    },
  });
  const minDays = Number(values.days);
  const dryRun = values["dry-run"];

  const auth = await getAuthClient();
  const headers = await ensureHeaders(auth, TABS.leads(), LEADS_HEADERS);
  const { records } = await readTable(auth, TABS.leads());

  const sentLeads = records.filter((r) =>
    r.Status === "SENT" &&
    r.TemplateVariant === "initial" &&
    r.LastSentAt &&
    r.ThreadId &&
    r.PrimaryEmail
  );
  log.info(`SENT (initial) toplam: ${sentLeads.length}`);

  const now = new Date();
  const eligible = [];
  for (const lead of sentLeads) {
    const sentAt = new Date(lead.LastSentAt);
    const businessDays = businessDaysBetween(sentAt, now);
    if (businessDays < minDays) continue;
    eligible.push(lead);
  }
  log.info(`T+${minDays} iş günü geçen: ${eligible.length}`);

  const footer = await buildFooter();
  const signature = await buildSignature();
  const calendlyUrl = process.env.CALENDLY_URL || "https://calendly.com/reklamfikir";
  const labelId = dryRun ? null : await ensureLabel(auth, process.env.GMAIL_PENDING_LABEL || "Outreach/Pending");

  const updates = [];
  let drafted = 0;
  let replied = 0;
  let skipped = 0;

  for (const lead of eligible) {
    const sentAtMs = new Date(lead.LastSentAt).getTime();
    const reply = await threadHasNewerInboundMessage(auth, lead.ThreadId, sentAtMs);
    if (reply) {
      // Cevap gelmiş — sequence dur
      replied++;
      if (!dryRun) {
        updates.push({
          rowNumber: lead._rowNumber,
          fields: {
            Status: "REPLIED",
            RepliedAt: new Date(reply.internalDate).toISOString(),
            UpdatedAt: new Date().toISOString(),
          },
        });
      } else {
        log.dry(`Cevap gelmiş — Status=REPLIED yapılacak (lead=${lead.LeadId})`);
      }
      continue;
    }

    // followup-1 draft hazırla
    let tmpl;
    try {
      tmpl = await loadTemplate(`${lead.Sector}/followup-1.md`);
    } catch {
      log.warn(`followup-1 şablonu yok: ${lead.Sector} — atlanıyor`);
      skipped++;
      continue;
    }

    // Orijinal mesajın subject'ini al (referans olarak)
    let originalSubject = lead.CompanyName + " için kısa bir notum";
    let originalMessageId = "";
    if (lead.LastMessageId) {
      try {
        const headers0 = await getMessageHeaders(auth, lead.LastMessageId);
        originalSubject = (headers0.subject || originalSubject).replace(/^Re:\s*/i, "");
        originalMessageId = headers0["message-id"] || "";
      } catch (err) {
        log.warn(`Orijinal mesaj headers alınamadı (lead=${lead.LeadId}): ${err.message ?? err}`);
      }
    }

    const rendered = render(tmpl, {
      COMPANY_NAME: lead.CompanyName,
      ORIGINAL_SUBJECT: originalSubject,
      CALENDLY_URL: calendlyUrl,
      SIGNATURE: signature,
      FOOTER: footer,
    });
    const { subject, body } = splitSubjectAndBody(rendered);

    if (dryRun) {
      log.dry(`Followup-1 draft hazırlanacak: lead=${lead.LeadId} ${lead.CompanyName} (subject="${subject}")`);
      drafted++;
      continue;
    }

    const draft = await createDraft(auth, {
      to: lead.PrimaryEmail,
      subject,
      body,
      labelIds: labelId ? [labelId] : [],
      threadId: lead.ThreadId,
      inReplyTo: originalMessageId,
      references: originalMessageId,
    });

    updates.push({
      rowNumber: lead._rowNumber,
      fields: {
        Status: "DRAFTED",
        TemplateVariant: "followup-1",
        LastDraftId: draft.draftId,
        UpdatedAt: new Date().toISOString(),
      },
    });
    drafted++;
    log.ok(`Followup-1 draft (${draft.draftId}) -> ${lead.PrimaryEmail}`);
  }

  if (!dryRun && updates.length > 0) {
    await updateRows(auth, TABS.leads(), headers, updates);
  }
  log.ok(`follow tamam: drafted=${drafted}, replied=${replied}, atlanan=${skipped}${dryRun ? " (dry-run)" : ""}`);
}

main().catch((err) => {
  log.error("follow başarısız:", err.message ?? err);
  process.exit(1);
});
