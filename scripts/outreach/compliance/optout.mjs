// Suppression list yönetim helper.
// Bir lead opt-out olduğunda Suppression sheet'ine satır basar + ilgili lead'i Status=OPTED_OUT yapar.

import { appendRows, updateRows, readTable, ensureHeaders, SUPPRESSION_HEADERS, LEADS_HEADERS, TABS } from "../lib/sheets.mjs";
import { extractDomain, normalizePhone } from "../lib/dedupe.mjs";
import { log } from "../lib/logger.mjs";

export async function addToSuppression(authClient, { email, reason = "manual", addedBy = "system", dryRun = false }) {
  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanEmail) throw new Error("Email zorunlu.");
  const domain = extractDomain(cleanEmail);
  const now = new Date().toISOString();

  await ensureHeaders(authClient, TABS.suppression(), SUPPRESSION_HEADERS);

  // Mevcut Leads tablosunda bu email/domain'e ait satırları bul
  await ensureHeaders(authClient, TABS.leads(), LEADS_HEADERS);
  const { records: leads } = await readTable(authClient, TABS.leads());
  const matched = leads.filter((l) => {
    const lEmail = (l.PrimaryEmail || "").toLowerCase();
    const lDomain = extractDomain(l.Website || l.PrimaryEmail || "");
    return (cleanEmail && lEmail === cleanEmail) || (domain && lDomain === domain);
  });

  if (dryRun) {
    log.dry(`Suppression eklenecek: ${cleanEmail} (domain=${domain || "?"}). Etkilenen lead: ${matched.length}`);
    return { added: 1, leadsUpdated: matched.length };
  }

  // Telefon: ilk eşleşen lead'in telefonu (varsa)
  const phone = matched[0] ? normalizePhone(matched[0].Phone) : "";

  await appendRows(authClient, TABS.suppression(), SUPPRESSION_HEADERS, [{
    Email: cleanEmail,
    Domain: domain,
    Phone: phone,
    Reason: reason,
    AddedAt: now,
    AddedBy: addedBy,
  }]);

  if (matched.length) {
    await updateRows(authClient, TABS.leads(), LEADS_HEADERS, matched.map((l) => ({
      rowNumber: l._rowNumber,
      fields: { Status: "OPTED_OUT", OptOutAt: now, UpdatedAt: now },
    })));
  }
  log.ok(`Suppression eklendi: ${cleanEmail}, ${matched.length} lead OPTED_OUT yapıldı.`);
  return { added: 1, leadsUpdated: matched.length };
}
