// SVG overlay templates for RC Şantiye Instagram Stories.
// All overlays target a 1080x1920 canvas (9:16). Colors match the brand:
// yellow (#FFC400) on black (#0E0E0E) with safety-stripe accents.

const BRAND_YELLOW = '#FFC400';
const BRAND_BLACK = '#0E0E0E';
const STRIPE = '#111111';

const escapeText = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const stripeBand = (y, h) => `
  <defs>
    <pattern id="stripes" width="56" height="56" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="28" height="56" fill="${BRAND_YELLOW}"/>
      <rect x="28" width="28" height="56" fill="${STRIPE}"/>
    </pattern>
  </defs>
  <rect x="0" y="${y}" width="1080" height="${h}" fill="url(#stripes)"/>`;

// Cover layout: bold headline + sub + handle pill
export const coverOverlay = ({
  title = 'RC ŞANTİYE',
  subtitle = 'Hayalini Kur · Kumandayı Tut · İnşa Et',
  handle = '@rcsantiye',
} = {}) => `
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs>
    <linearGradient id="topShade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${BRAND_BLACK}" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="${BRAND_BLACK}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="bottomShade" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="${BRAND_BLACK}" stop-opacity="0.92"/>
      <stop offset="100%" stop-color="${BRAND_BLACK}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect x="0" y="0" width="1080" height="520" fill="url(#topShade)"/>
  <rect x="0" y="1300" width="1080" height="620" fill="url(#bottomShade)"/>

  ${stripeBand(220, 36)}

  <g font-family="Impact, 'Arial Black', system-ui, sans-serif" fill="${BRAND_YELLOW}" text-anchor="middle">
    <text x="540" y="180" font-size="92" letter-spacing="6">${escapeText(title)}</text>
  </g>
  <g font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" fill="#FFFFFF" text-anchor="middle">
    <text x="540" y="316" font-size="34" letter-spacing="2" opacity="0.92">${escapeText(subtitle)}</text>
  </g>

  ${stripeBand(1400, 28)}

  <g transform="translate(540 1640)" text-anchor="middle"
     font-family="Impact, 'Arial Black', system-ui, sans-serif">
    <rect x="-360" y="-90" width="720" height="170" rx="22" fill="${BRAND_YELLOW}"/>
    <text y="-10" fill="${BRAND_BLACK}" font-size="78" letter-spacing="4">GERÇEK İŞ MAKİNELERİ</text>
    <text y="56" fill="${BRAND_BLACK}" font-size="36" letter-spacing="3"
          font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif">KUMANDA SENDE!</text>
  </g>

  <g transform="translate(540 1820)" text-anchor="middle"
     font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" fill="#FFFFFF">
    <text font-size="36" letter-spacing="4">${escapeText(handle)}</text>
  </g>
</svg>`;

// Gallery layout: small top label + bottom caption strip
export const galleryOverlay = ({
  label = 'ŞANTİYE TURU',
  caption = 'Ekskavatör · Damperli Kamyon · Yükleyici',
  handle = '@rcsantiye',
} = {}) => `
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs>
    <linearGradient id="bottomShade" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="${BRAND_BLACK}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="${BRAND_BLACK}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <g transform="translate(60 90)">
    <rect width="320" height="78" rx="14" fill="${BRAND_YELLOW}"/>
    <text x="160" y="52" text-anchor="middle"
          font-family="Impact, 'Arial Black', system-ui, sans-serif"
          font-size="40" fill="${BRAND_BLACK}" letter-spacing="3">${escapeText(label)}</text>
  </g>

  <rect x="0" y="1450" width="1080" height="470" fill="url(#bottomShade)"/>
  ${stripeBand(1488, 22)}

  <g font-family="Impact, 'Arial Black', system-ui, sans-serif" fill="${BRAND_YELLOW}" text-anchor="middle">
    <text x="540" y="1640" font-size="68" letter-spacing="4">RC ŞANTİYE</text>
  </g>
  <g font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" fill="#FFFFFF" text-anchor="middle">
    <text x="540" y="1710" font-size="34" letter-spacing="2" opacity="0.95">${escapeText(caption)}</text>
    <text x="540" y="1820" font-size="32" letter-spacing="4" opacity="0.9">${escapeText(handle)}</text>
  </g>
</svg>`;

// CTA layout: center pill with action text
export const ctaOverlay = ({
  kicker = 'AİLECEK GEL',
  title = 'KUMANDAYI KAP',
  sub = 'BÜYÜK ŞANTİYEYİ SEN YÖNET',
  handle = '@rcsantiye',
} = {}) => `
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs>
    <linearGradient id="fullShade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${BRAND_BLACK}" stop-opacity="0.55"/>
      <stop offset="50%" stop-color="${BRAND_BLACK}" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="${BRAND_BLACK}" stop-opacity="0.85"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1920" fill="url(#fullShade)"/>

  ${stripeBand(180, 28)}
  ${stripeBand(1660, 28)}

  <g text-anchor="middle">
    <text x="540" y="320" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
          font-size="44" fill="${BRAND_YELLOW}" letter-spacing="10">${escapeText(kicker)}</text>
    <text x="540" y="460" font-family="Impact, 'Arial Black', system-ui, sans-serif"
          font-size="148" fill="#FFFFFF" letter-spacing="6">${escapeText(title)}</text>
    <rect x="120" y="520" width="840" height="6" fill="${BRAND_YELLOW}"/>
    <text x="540" y="610" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
          font-size="38" fill="#FFFFFF" letter-spacing="4" opacity="0.95">${escapeText(sub)}</text>
  </g>

  <g transform="translate(540 1780)" text-anchor="middle">
    <rect x="-280" y="-66" width="560" height="120" rx="60" fill="${BRAND_YELLOW}"/>
    <text y="20" font-family="Impact, 'Arial Black', system-ui, sans-serif"
          font-size="56" fill="${BRAND_BLACK}" letter-spacing="6">${escapeText(handle)}</text>
  </g>
</svg>`;
