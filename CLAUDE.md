# mrloba

Destiny Marine Hotel için GA4 traffic raporlama scripti.

## Çalıştırma

```bash
GOOGLE_APPLICATION_CREDENTIALS=/abs/path/service-account.json npm run report:ga4
```

Service account, GA4 property `486676130` üzerinde Viewer yetkisine sahip olmalı.

## Env değişkenleri

- `GOOGLE_APPLICATION_CREDENTIALS` — service account JSON yolu (zorunlu)
- `GA4_PROPERTY_ID` — varsayılan `486676130`
- `GA4_DAYS` — kaç günlük rapor, varsayılan `30`

## Yapı

- `scripts/ga4-traffic-report.mjs` — tek dosyalık rapor (totals, daily trend, sources, countries, pages, devices)
- `package.json` — `report:ga4` script'i, `@google-analytics/data` dependency'si

Node 18+ ve ES module (`"type": "module"`).

## Güvenlik

`.env` ve `service-account*.json` `.gitignore`'da. Bu dosyaları commit etme, içeriklerini chat'e yapıştırma.
