// Places API ile firma topla → dedupe + suppression check → Sheets'e Status=NEW yaz.
//
// Kullanım:
//   npm run outreach:collect -- --sector=dugun_salonu --district=Kadıköy --region=ist_anadolu --limit=30
//   npm run outreach:collect -- --csv=./leads.csv --sector=dugun_salonu --region=ist_anadolu
//   npm run outreach:collect -- --sector=tente --district=Gebze --dry-run

import "dotenv/config";
import { parseArgs } from "node:util";
import { getAuthClient } from "../lib/auth.mjs";
import { ensureHeaders, readTable, appendRows, LEADS_HEADERS, SUPPRESSION_HEADERS, TABS } from "../lib/sheets.mjs";
import { searchPlaces } from "../collect/places.mjs";
import { readCsv } from "../collect/csv.mjs";
import { buildCompanyId, extractDomain, normalizePhone, suppressionMatch } from "../lib/dedupe.mjs";
import { ulid } from "../lib/ulid.mjs";
import { log } from "../lib/logger.mjs";

const REGION_ALIASES = new Set(["ist_anadolu", "ist_avrupa", "kocaeli", "sakarya"]);

async function main() {
  const { values } = parseArgs({
    options: {
      sector: { type: "string" },
      district: { type: "string", default: "" },
      region: { type: "string", default: "ist_anadolu" },
      limit: { type: "string", default: "30" },
      csv: { type: "string" },
      "dry-run": { type: "boolean", default: false },
    },
  });
  if (!values.sector) throw new Error("--sector zorunlu (örn: dugun_salonu)");
  if (!REGION_ALIASES.has(values.region)) throw new Error(`Geçersiz region: ${values.region}`);
  const dryRun = values["dry-run"];

  let raw;
  if (values.csv) {
    log.info(`CSV okunuyor: ${values.csv}`);
    const rows = await readCsv(values.csv);
    raw = rows.map((r) => ({
      placeId: "",
      name: r.CompanyName || r.name || "",
      address: r.Address || r.address || "",
      phone: normalizePhone(r.Phone || r.phone || ""),
      website: r.Website || r.website || "",
      domain: extractDomain(r.Website || r.website || r.PrimaryEmail || ""),
      email: (r.PrimaryEmail || r.email || "").toLowerCase(),
      district: r.District || r.district || "",
    }));
  } else {
    log.info(`Places aranıyor: sektör=${values.sector} ilçe=${values.district || "(yok)"} bölge=${values.region}`);
    raw = await searchPlaces({
      sector: values.sector,
      district: values.district,
      region: values.region,
      limit: Number(values.limit),
    });
  }
  log.info(`Aday sayısı: ${raw.length}`);

  const auth = await getAuthClient();
  const headers = await ensureHeaders(auth, TABS.leads(), LEADS_HEADERS);
  await ensureHeaders(auth, TABS.suppression(), SUPPRESSION_HEADERS);

  const { records: existing } = await readTable(auth, TABS.leads());
  const existingCompanyIds = new Set(existing.map((r) => r.CompanyId));

  const { records: suppressionRows } = await readTable(auth, TABS.suppression());

  const now = new Date().toISOString();
  const sourceTag = values.csv ? "csv" : "places";
  const newLeads = [];
  let dupCount = 0;
  let suppCount = 0;

  for (const cand of raw) {
    const companyId = buildCompanyId({ domain: cand.domain, name: cand.name, placeId: cand.placeId });
    if (existingCompanyIds.has(companyId)) { dupCount++; continue; }
    existingCompanyIds.add(companyId);

    const lead = {
      LeadId: ulid(),
      CompanyId: companyId,
      CompanyName: cand.name,
      Sector: values.sector,
      Region: values.region,
      District: cand.district || values.district || "",
      Address: cand.address || "",
      Phone: cand.phone || "",
      Website: cand.website || "",
      PrimaryEmail: cand.email || "",
      Source: sourceTag,
      Status: "NEW",
      TemplateVariant: "initial",
      LastDraftId: "",
      LastMessageId: "",
      ThreadId: "",
      FirstSentAt: "",
      LastSentAt: "",
      RepliedAt: "",
      Notes: "",
      OptOutAt: "",
      CreatedAt: now,
      UpdatedAt: now,
    };

    const supReason = suppressionMatch(lead, suppressionRows);
    if (supReason) { suppCount++; continue; }

    newLeads.push(lead);
  }

  log.info(`Yeni: ${newLeads.length}  Dup: ${dupCount}  Suppression: ${suppCount}`);

  if (dryRun) {
    log.dry(`Sheets'e ${newLeads.length} satır eklenecekti. İlk örnek:`);
    if (newLeads[0]) console.log(JSON.stringify(newLeads[0], null, 2));
    return;
  }

  if (newLeads.length === 0) {
    log.warn("Eklenecek yeni lead yok.");
    return;
  }

  await appendRows(auth, TABS.leads(), headers, newLeads);
  log.ok(`${newLeads.length} lead Sheets'e eklendi.`);
}

main().catch((err) => {
  log.error("collect başarısız:", err.message ?? err);
  process.exit(1);
});
