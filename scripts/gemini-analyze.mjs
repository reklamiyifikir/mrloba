// Destiny Marine Hotel — GA4 raporunu Google Gemini ile yorumlatır.
//
// Usage:
//   GEMINI_API_KEY=... \
//   GOOGLE_APPLICATION_CREDENTIALS=/abs/path/service-account.json \
//   npm run analyze:gemini
//
// Opsiyonel: GEMINI_MODEL (varsayılan: gemini-2.5-pro)

import { GoogleGenAI } from "@google/genai";
import { gatherReport } from "./ga4-traffic-report.mjs";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-pro";

if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY ortam değişkeni gerekli.");
  process.exit(1);
}

function buildPrompt(report) {
  const totalsLine = report.totals.headers
    .map((h, i) => `${h}=${report.totals.values[i] ?? "0"}`)
    .join(", ");
  const j = (rows) => JSON.stringify(rows, null, 2);
  return `Sen Destiny Marine Hotel için çalışan bir dijital pazarlama analistisin.
Aşağıda son ${report.days} güne ait GA4 verisi var (property ${report.propertyId}).
Verileri Türkçe yorumla; yöneticiye 1 sayfalık özet çıkar:
1) Genel performans (trafik, etkileşim, oturum süresi)
2) Trafik kaynakları için fırsat ve riskler
3) Ülke ve cihaz dağılımı için öneriler
4) En çok ziyaret edilen sayfalar için içerik/UX önerileri
5) Önümüzdeki 30 gün için 5 maddelik somut aksiyon listesi

Veri:
- Toplamlar: ${totalsLine}
- Günlük trend:
${j(report.daily)}
- Trafik kaynakları:
${j(report.sources)}
- Ülkeler:
${j(report.countries)}
- En çok ziyaret edilen sayfalar:
${j(report.pages)}
- Cihaz kategorisi:
${j(report.devices)}
`;
}

async function main() {
  console.log(`GA4 verisi toplanıyor...`);
  const report = await gatherReport();

  console.log(`${MODEL} modeline gönderiliyor...\n`);
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: buildPrompt(report),
  });

  console.log(response.text);
}

main().catch((err) => {
  console.error("Gemini analizi başarısız:", err.message ?? err);
  process.exit(1);
});
