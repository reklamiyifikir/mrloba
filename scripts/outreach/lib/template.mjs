import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_ROOT = resolve(HERE, "..", "..", "..", "templates");

export async function loadTemplate(relPath) {
  return readFile(resolve(TEMPLATES_ROOT, relPath), "utf8");
}

// Replace {{KEY}} placeholders. Missing keys collapse to empty string and log a warning.
export function render(text, vars) {
  return text.replace(/\{\{\s*([A-Z0-9_]+)\s*\}\}/g, (_, key) => {
    if (vars[key] === undefined || vars[key] === null) return "";
    return String(vars[key]);
  });
}

// initial.md format: first line "SUBJECT: ..." followed by blank line + body.
export function splitSubjectAndBody(rendered) {
  const match = rendered.match(/^SUBJECT:\s*(.+?)\n\s*\n([\s\S]*)$/);
  if (!match) {
    throw new Error("Şablon 'SUBJECT: ...' satırıyla başlamalı.");
  }
  return { subject: match[1].trim(), body: match[2].trim() };
}
