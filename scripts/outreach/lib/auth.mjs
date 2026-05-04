// Google OAuth (installed app flow) — tek shared mailbox için token üretir/yükler.
// outreach:auth bir kerelik manuel onay alır, sonra tüm CLI'lar bu token'ı paylaşır.

import { google } from "googleapis";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createServer } from "node:http";
import { URL } from "node:url";
import { log } from "./logger.mjs";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify", // drafts.create + messages.modify + labels
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/spreadsheets",
];

function tokenPath() {
  return resolve(process.env.GOOGLE_TOKEN_PATH || "./tokens/iletisim.json");
}

function buildOAuthClient(redirectUri) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID ve GOOGLE_CLIENT_SECRET .env'de tanımlı olmalı.");
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

// Loopback redirect — kullanıcı tarayıcıda onay verir, lokal HTTP server kodu yakalar.
async function authorizeViaLoopback() {
  return new Promise((resolvePromise, rejectPromise) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", async () => {
      const port = server.address().port;
      const redirectUri = `http://127.0.0.1:${port}/oauth2callback`;
      const client = buildOAuthClient(redirectUri);
      const url = client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
        prompt: "consent",
      });

      log.info("Tarayıcıda aç ve onay ver:");
      console.log("\n  " + url + "\n");

      server.on("request", async (req, res) => {
        try {
          if (!req.url?.startsWith("/oauth2callback")) {
            res.writeHead(404).end();
            return;
          }
          const code = new URL(req.url, redirectUri).searchParams.get("code");
          if (!code) {
            res.writeHead(400).end("code missing");
            return;
          }
          const { tokens } = await client.getToken(code);
          client.setCredentials(tokens);
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end("<h1>Tamam</h1><p>Token alındı. Bu sekmeyi kapatabilirsin.</p>");
          server.close();
          resolvePromise(tokens);
        } catch (err) {
          res.writeHead(500).end(String(err.message ?? err));
          server.close();
          rejectPromise(err);
        }
      });
    });
    server.on("error", rejectPromise);
  });
}

export async function runAuthFlow() {
  const tokens = await authorizeViaLoopback();
  const path = tokenPath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(tokens, null, 2));
  log.ok(`Token yazıldı: ${path}`);
  return tokens;
}

export async function getAuthClient() {
  const path = tokenPath();
  let raw;
  try {
    raw = await readFile(path, "utf8");
  } catch {
    throw new Error(`Token yok: ${path}. Önce 'npm run outreach:auth' çalıştır.`);
  }
  const tokens = JSON.parse(raw);
  // Redirect URI burada artık önemsiz — sadece refresh için kullanılıyor.
  const client = buildOAuthClient("http://127.0.0.1");
  client.setCredentials(tokens);

  // Refresh token'ı diske geri yaz
  client.on("tokens", async (next) => {
    const merged = { ...tokens, ...next };
    await writeFile(path, JSON.stringify(merged, null, 2)).catch(() => {});
  });

  return client;
}
