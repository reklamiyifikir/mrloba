const ts = () => new Date().toISOString();

export const log = {
  info: (msg, extra) => console.log(`[${ts()}] ${msg}`, extra ?? ""),
  warn: (msg, extra) => console.warn(`[${ts()}] WARN ${msg}`, extra ?? ""),
  error: (msg, extra) => console.error(`[${ts()}] ERROR ${msg}`, extra ?? ""),
  ok: (msg, extra) => console.log(`[${ts()}] OK ${msg}`, extra ?? ""),
  dry: (msg, extra) => console.log(`[${ts()}] DRY-RUN ${msg}`, extra ?? ""),
};
