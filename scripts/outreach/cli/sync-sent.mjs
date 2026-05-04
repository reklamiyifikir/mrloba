// Yetkili Gmail UI'da elle Send'e bastığında: draft Gmail'den kaybolur, Sent'te aynı thread'de mesaj olur.
// Bu CLI: Status=DRAFTED lead'lerin LastDraftId'lerini sorgular, 404 olanları Sent kutusunda eşleştirir.
//
// Kullanım: npm run outreach:sync-sent

import "dotenv/config";
import { parseArgs } from "node:util";
import { getAuthClient } from "../lib/auth.mjs";
import {
  ensureHeaders, readTable, updateRows, appendRows,
  LEADS_HEADERS, SENDS_HEADERS, TABS,
} from "../lib/sheets.mjs";
import { getDraft, getMessageHeaders, listSentSince, bodyHash } from "../lib/gmail.mjs";
import { ulid } from "../lib/ulid.mjs";
import { log } from "../lib/logger.mjs";

const SEVEN_DAYS_SEC = 7 * 24 * 3600;

async function main() {
  const { values } = parseArgs({
    options: {
      "dry-run": { type: "boolean", default: false },
    },
  });
  const dryRun = values["dry-run"];

  const auth = await getAuthClient();
  const headers = await ensureHeaders(auth, TABS.leads(), LEADS_HEADERS);
  await ensureHeaders(auth, TABS.sends(), SENDS_HEADERS);

  const { records } = await readTable(auth, TABS.leads());
  const drafted = records.filter((r) => r.Status === "DRAFTED" && r.LastDraftId);
  log.info(`Status=DRAFTED + LastDraftId dolu: ${drafted.length}`);

  if (drafted.length === 0) return;

  // Sent kutusunu son 7 gün için bir kere çek
  const sinceSec = Math.floor(Date.now() / 1000) - SEVEN_DAYS_SEC;
  const sentList = await listSentSince(auth, sinceSec);
  // threadId -> {messageId, internalDate, subject}
  const sentByThread = new Map();
  for (const m of sentList) {
    const meta = await getMessageHeaders(auth, m.id);
    const arr = sentByThread.get(meta.threadId) || [];
    arr.push({ messageId: m.id, internalDate: Number(meta.internalDate), subject: meta.subject || "" });
    sentByThread.set(meta.threadId, arr);
  }

  const updates = [];
  const sendsRows = [];
  let synced = 0;
  let stillPending = 0;
  let notFound = 0;

  for (const lead of drafted) {
    const draft = await getDraft(auth, lead.LastDraftId);
    if (draft) { stillPending++; continue; } // Hâlâ pending — yetkili henüz göndermedi

    // Draft 404: Sent'te eşleşme ara
    const sentMsgs = lead.ThreadId ? sentByThread.get(lead.ThreadId) || [] : [];
    if (sentMsgs.length === 0) {
      notFound++;
      log.warn(`Draft 404 ama Sent eşleşmesi yok (lead=${lead.LeadId}, threadId=${lead.ThreadId}). Yetkili silmiş olabilir.`);
      continue;
    }
    // En yenisini al
    sentMsgs.sort((a, b) => b.internalDate - a.internalDate);
    const sent = sentMsgs[0];
    const sentAt = new Date(sent.internalDate).toISOString();

    if (dryRun) {
      log.dry(`SENT işaretlenecek: lead=${lead.LeadId} messageId=${sent.messageId} sentAt=${sentAt}`);
      synced++;
      continue;
    }

    updates.push({
      rowNumber: lead._rowNumber,
      fields: {
        Status: "SENT",
        LastDraftId: "",
        LastMessageId: sent.messageId,
        FirstSentAt: lead.FirstSentAt || sentAt,
        LastSentAt: sentAt,
        UpdatedAt: new Date().toISOString(),
      },
    });
    sendsRows.push({
      SendId: ulid(),
      LeadId: lead.LeadId,
      Stage: lead.TemplateVariant || "initial",
      MessageId: sent.messageId,
      ThreadId: lead.ThreadId,
      Subject: sent.subject,
      SentAt: sentAt,
      BodyHash: bodyHash(sent.subject),
    });
    synced++;
  }

  log.info(`Sync sonucu: gönderilen=${synced}, hâlâ pending=${stillPending}, draft silinmiş=${notFound}`);

  if (!dryRun) {
    if (updates.length > 0) await updateRows(auth, TABS.leads(), headers, updates);
    if (sendsRows.length > 0) await appendRows(auth, TABS.sends(), SENDS_HEADERS, sendsRows);
  }

  log.ok(`sync-sent tamam${dryRun ? " (dry-run)" : ""}.`);
}

main().catch((err) => {
  log.error("sync-sent başarısız:", err.message ?? err);
  process.exit(1);
});
