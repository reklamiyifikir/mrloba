// Google Maps Places (text search) ile firma toplama.
// "düğün salonu Kadıköy" gibi sorgu kurar, sonuçları normalize Lead şemasına çevirir.

import { Client } from "@googlemaps/google-maps-services-js";
import { extractDomain, normalizePhone } from "../lib/dedupe.mjs";

const SECTOR_QUERIES = {
  dugun_salonu: "düğün salonu",
  tente: "tente firması",
  rc_santiye: "inşaat ofisi",
  klinik: "estetik klinik",
  restoran: "restoran",
  diger: null,
};

const REGION_DISTRICT_HINTS = {
  ist_anadolu: "İstanbul Anadolu",
  ist_avrupa: "İstanbul Avrupa",
  kocaeli: "Kocaeli",
  sakarya: "Sakarya",
};

const client = new Client({});

function buildQuery(sector, district) {
  const sectorWord = SECTOR_QUERIES[sector] || sector;
  return `${sectorWord} ${district}`.trim();
}

export async function searchPlaces({ sector, district, region = "ist_anadolu", limit = 30 }) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_MAPS_API_KEY .env'de tanımlı olmalı.");
  const regionHint = REGION_DISTRICT_HINTS[region] || "";
  const query = buildQuery(sector, district || regionHint);
  const results = [];
  let pageToken;
  do {
    const params = pageToken
      ? { key: apiKey, pagetoken: pageToken, language: "tr" }
      : { key: apiKey, query, language: "tr", region: "tr" };
    const { data } = await client.textSearch({ params });
    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      throw new Error(`Places API hata: ${data.status} ${data.error_message ?? ""}`);
    }
    for (const r of data.results || []) {
      results.push(r);
      if (results.length >= limit) break;
    }
    pageToken = data.next_page_token;
    if (results.length >= limit) break;
    if (pageToken) await new Promise((r) => setTimeout(r, 2000)); // Places quirk: token aktif olması için bekleme
  } while (pageToken && results.length < limit);

  // Detay çek (telefon + website)
  const enriched = [];
  for (const r of results) {
    const detail = await client.placeDetails({
      params: {
        key: apiKey,
        place_id: r.place_id,
        fields: ["name", "formatted_phone_number", "international_phone_number", "website", "formatted_address"],
        language: "tr",
      },
    });
    const d = detail.data.result || {};
    enriched.push({
      placeId: r.place_id,
      name: d.name || r.name || "",
      address: d.formatted_address || r.formatted_address || "",
      phone: normalizePhone(d.international_phone_number || d.formatted_phone_number || ""),
      website: d.website || "",
      domain: extractDomain(d.website || ""),
    });
  }
  return enriched;
}
