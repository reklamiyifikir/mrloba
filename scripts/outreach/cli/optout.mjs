// Manuel suppression: bir email/firma'yı listeye ekler, ilgili lead'leri OPTED_OUT yapar.
//
// Kullanım:
//   npm run outreach:optout -- --email=mehmet@dugun.com
//   npm run outreach:optout -- --email=info@firma.com --reason=opt-out --dry-run

import "dotenv/config";
import { parseArgs } from "node:util";
import { getAuthClient } from "../lib/auth.mjs";
import { addToSuppression } from "../compliance/optout.mjs";
import { log } from "../lib/logger.mjs";

async function main() {
  const { values } = parseArgs({
    options: {
      email: { type: "string" },
      reason: { type: "string", default: "manual" },
      "added-by": { type: "string", default: process.env.USER || "operator" },
      "dry-run": { type: "boolean", default: false },
    },
  });
  if (!values.email) throw new Error("--email zorunlu");

  const auth = await getAuthClient();
  await addToSuppression(auth, {
    email: values.email,
    reason: values.reason,
    addedBy: values["added-by"],
    dryRun: values["dry-run"],
  });
}

main().catch((err) => {
  log.error("optout başarısız:", err.message ?? err);
  process.exit(1);
});
