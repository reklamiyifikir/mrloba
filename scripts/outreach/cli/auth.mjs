// İlk kurulum: iletisim@reklamfikir.com Gmail OAuth token'ı al.
// Tarayıcıda onay verdiğinde token tokens/iletisim.json'a yazılır.
//
// Kullanım: npm run outreach:auth

import "dotenv/config";
import { runAuthFlow } from "../lib/auth.mjs";
import { log } from "../lib/logger.mjs";

async function main() {
  log.info("Google OAuth (Gmail + Sheets) başlatılıyor.");
  await runAuthFlow();
  log.ok("Yetkilendirme tamam. Diğer outreach:* komutları artık çalıştırılabilir.");
}

main().catch((err) => {
  log.error("auth başarısız:", err.message ?? err);
  process.exit(1);
});
