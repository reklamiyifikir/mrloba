// İnteraktif Gemini sohbeti — geçmiş hafızada tutulur.
//
// Usage:
//   npm run chat
//
// Komutlar:
//   /reset  → konuşma geçmişini sıfırla
//   /model  → kullanılan modeli yazdır
//   /exit   → çık (Ctrl+C de çalışır)

import { GoogleGenAI } from "@google/genai";
import readline from "node:readline";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite";

if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY tanımlı değil. .env dosyasına ekleyin.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
let chat = ai.chats.create({ model: MODEL });

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

console.log(`Gemini chat (${MODEL}) — /exit ile çık, /reset ile geçmişi temizle.\n`);

while (true) {
  const input = (await ask("Sen: ")).trim();
  if (!input) continue;
  if (input === "/exit") break;
  if (input === "/model") {
    console.log(`Model: ${MODEL}\n`);
    continue;
  }
  if (input === "/reset") {
    chat = ai.chats.create({ model: MODEL });
    console.log("(geçmiş temizlendi)\n");
    continue;
  }

  try {
    process.stdout.write("Gemini: ");
    const stream = await chat.sendMessageStream({ message: input });
    for await (const chunk of stream) {
      if (chunk.text) process.stdout.write(chunk.text);
    }
    process.stdout.write("\n\n");
  } catch (err) {
    console.error(`\n(hata: ${err.message ?? err})\n`);
  }
}

rl.close();
