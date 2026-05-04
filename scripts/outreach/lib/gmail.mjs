// Gmail API sarmalayıcı — drafts.create, messages.list (in:sent), threads.get, labels.

import { google } from "googleapis";
import { createHash } from "node:crypto";

function api(authClient) {
  return google.gmail({ version: "v1", auth: authClient });
}

function fromAddress() {
  return process.env.GMAIL_FROM_ADDRESS || "iletisim@reklamfikir.com";
}

function fromName() {
  return process.env.GMAIL_FROM_NAME || "Reklamı Fikir";
}

function buildRfc2822({ to, subject, body, threadId, inReplyTo, references }) {
  const headers = [
    `From: "${fromName()}" <${fromAddress()}>`,
    `To: ${to}`,
    `Subject: ${encodeSubject(subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
  ];
  if (inReplyTo) headers.push(`In-Reply-To: ${inReplyTo}`);
  if (references) headers.push(`References: ${references}`);
  return headers.join("\r\n") + "\r\n\r\n" + body;
}

function encodeSubject(subject) {
  // RFC 2047 encoded-word — Türkçe karakterler için
  if (/^[\x00-\x7F]*$/.test(subject)) return subject;
  return `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;
}

function toBase64Url(text) {
  return Buffer.from(text, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function ensureLabel(authClient, labelName) {
  const gmail = api(authClient);
  const list = await gmail.users.labels.list({ userId: "me" });
  const found = (list.data.labels || []).find((l) => l.name === labelName);
  if (found) return found.id;
  const created = await gmail.users.labels.create({
    userId: "me",
    requestBody: { name: labelName, labelListVisibility: "labelShow", messageListVisibility: "show" },
  });
  return created.data.id;
}

export async function createDraft(authClient, { to, subject, body, labelIds, threadId, inReplyTo, references }) {
  const gmail = api(authClient);
  const raw = toBase64Url(buildRfc2822({ to, subject, body, threadId, inReplyTo, references }));
  const message = { raw };
  if (threadId) message.threadId = threadId;
  if (labelIds && labelIds.length) message.labelIds = labelIds;
  const { data } = await gmail.users.drafts.create({
    userId: "me",
    requestBody: { message },
  });
  return { draftId: data.id, messageId: data.message?.id, threadId: data.message?.threadId };
}

export async function getDraft(authClient, draftId) {
  const gmail = api(authClient);
  try {
    const { data } = await gmail.users.drafts.get({ userId: "me", id: draftId, format: "metadata" });
    return data;
  } catch (err) {
    if (err.code === 404 || err.response?.status === 404) return null;
    throw err;
  }
}

export async function listSentSince(authClient, sinceEpochSec) {
  const gmail = api(authClient);
  const q = `in:sent after:${sinceEpochSec}`;
  const { data } = await gmail.users.messages.list({ userId: "me", q, maxResults: 200 });
  return data.messages || [];
}

export async function getMessageHeaders(authClient, messageId) {
  const gmail = api(authClient);
  const { data } = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "metadata",
    metadataHeaders: ["Subject", "To", "Message-ID", "References", "In-Reply-To"],
  });
  const headers = {};
  for (const h of data.payload?.headers || []) headers[h.name.toLowerCase()] = h.value;
  return { ...headers, threadId: data.threadId, internalDate: data.internalDate };
}

export async function threadHasNewerInboundMessage(authClient, threadId, afterEpochMs) {
  const gmail = api(authClient);
  const { data } = await gmail.users.threads.get({ userId: "me", id: threadId, format: "metadata" });
  const messages = data.messages || [];
  const fromMe = fromAddress().toLowerCase();
  for (const m of messages) {
    const ts = Number(m.internalDate || 0);
    if (ts <= afterEpochMs) continue;
    const headers = {};
    for (const h of m.payload?.headers || []) headers[h.name.toLowerCase()] = h.value;
    const from = (headers.from || "").toLowerCase();
    if (!from.includes(fromMe)) return { messageId: m.id, internalDate: ts };
  }
  return null;
}

export function bodyHash(body) {
  return createHash("sha256").update(body, "utf8").digest("hex").slice(0, 16);
}
