// Hızlı Gemini sorusu: argv veya stdin'den prompt alır, akışla cevaplar.
//
// Usage:
//   npm run ask -- "Soru buraya"
//   echo "Uzun soru..." | npm run ask
//
// .env dosyası varsa otomatik yüklenir (npm script --env-file-if-exists ile).

import { GoogleGenAI } from "@google/genai";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY tanımlı değil. .env dosyasına ekleyin.");
  process.exit(1);
}

async function readStdin() {
  if (process.stdin.isTTY) return "";
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data.trim();
}

const argPrompt = process.argv.slice(2).join(" ").trim();
const stdinPrompt = await readStdin();
const prompt = [argPrompt, stdinPrompt].filter(Boolean).join("\n\n");

if (!prompt) {
  console.error('Kullanım: npm run ask -- "soru"');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const stream = await ai.models.generateContentStream({ model: MODEL, contents: prompt });
for await (const chunk of stream) {
  if (chunk.text) process.stdout.write(chunk.text);
}
process.stdout.write("\n");
