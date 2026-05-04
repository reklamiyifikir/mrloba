// Lead dedup + suppression check helpers.

const DOMAIN_RE = /^([a-z0-9-]+\.)+[a-z]{2,}$/i;

export function normalizePhone(raw) {
  if (!raw) return "";
  const digits = String(raw).replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("90") && digits.length >= 12) return "+" + digits;
  if (digits.startsWith("0")) return "+9" + digits;
  return digits ? "+" + digits : "";
}

export function extractDomain(websiteOrEmail) {
  if (!websiteOrEmail) return "";
  let host = String(websiteOrEmail).trim().toLowerCase();
  if (host.includes("@")) host = host.split("@")[1] ?? "";
  host = host.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!DOMAIN_RE.test(host)) return "";
  const parts = host.split(".");
  // crude etld+1: take last two labels, with .com.tr / .co.uk style get last three
  if (parts.length >= 3 && ["com", "co", "org", "net", "gov", "edu"].includes(parts[parts.length - 2])) {
    return parts.slice(-3).join(".");
  }
  return parts.slice(-2).join(".");
}

function slug(str) {
  return String(str || "")
    .toLocaleLowerCase("tr")
    .replace(/[ıİ]/g, "i")
    .replace(/[şŞ]/g, "s")
    .replace(/[ğĞ]/g, "g")
    .replace(/[üÜ]/g, "u")
    .replace(/[öÖ]/g, "o")
    .replace(/[çÇ]/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildCompanyId({ domain, name, placeId }) {
  if (domain) return `dom:${domain}`;
  if (placeId) return `place:${placeId}`;
  return `name:${slug(name)}`;
}

// Returns first matching reason or null. Suppression entries: { Email, Domain, Phone, Reason }.
export function suppressionMatch(lead, suppressionRows) {
  const email = (lead.PrimaryEmail || "").toLowerCase();
  const domain = extractDomain(lead.Website || lead.PrimaryEmail || "");
  const phone = normalizePhone(lead.Phone);

  for (const row of suppressionRows) {
    const sEmail = (row.Email || "").toLowerCase();
    const sDomain = (row.Domain || "").toLowerCase();
    const sPhone = (row.Phone || "").trim();
    if (sEmail && sEmail === email) return `email:${sEmail}`;
    if (sDomain && sDomain === domain) return `domain:${sDomain}`;
    if (sPhone && sPhone === phone) return `phone:${sPhone}`;
  }
  return null;
}
