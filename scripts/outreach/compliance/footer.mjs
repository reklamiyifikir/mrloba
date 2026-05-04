// KVKK footer üretici. Tüm outgoing maillerde zorunlu.

import { loadTemplate, render } from "../lib/template.mjs";

export async function buildFooter() {
  const template = await loadTemplate("_shared/footer-kvkk.md");
  return render(template, {
    COMPANY_LEGAL_NAME: process.env.COMPANY_LEGAL_NAME || "Reklamı Fikir Dijital Danışmanlık",
    COMPANY_ADDRESS: process.env.COMPANY_ADDRESS || "[adres tanımsız — .env'de COMPANY_ADDRESS doldur]",
    COMPANY_MERSIS: process.env.COMPANY_MERSIS || "[mersis tanımsız]",
    GMAIL_FROM_ADDRESS: process.env.GMAIL_FROM_ADDRESS || "iletisim@reklamfikir.com",
    KVKK_PAGE_URL: process.env.KVKK_PAGE_URL || "https://reklamfikir.com/kvkk",
  }).trim();
}

export async function buildSignature() {
  const template = await loadTemplate("_shared/signature.md");
  return render(template, {
    SENDER_NAME: process.env.GMAIL_FROM_NAME || "Reklamı Fikir",
    COMPANY_LEGAL_NAME: process.env.COMPANY_LEGAL_NAME || "Reklamı Fikir Dijital Danışmanlık",
  }).trim();
}
