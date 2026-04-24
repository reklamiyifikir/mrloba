#!/usr/bin/env node
// Build Instagram Story (1080x1920) renders for RC Şantiye from photos in
// stories/input/. The script preserves source quality: it uses Lanczos3
// resampling, keeps colors in the input ICC profile, and writes JPEG at
// quality 95 (mozjpeg) so re-encoding loss is visually imperceptible.
//
// Usage:  npm run stories
// Inputs: stories/input/*.{jpg,jpeg,png,webp}
// Output: stories/output/<basename>.jpg + stories/output/<basename>.png (lossless)
//
// Layout assignment is filename-driven so you can pin a template per photo:
//   *_cover.*    -> coverOverlay
//   *_cta.*      -> ctaOverlay
//   anything else -> galleryOverlay
//
// You can also override per-image text via stories/input/captions.json:
//   { "photo1.jpg": { "label": "ŞANTİYE TURU", "caption": "..." } }

import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

import {
  coverOverlay,
  galleryOverlay,
  ctaOverlay,
} from '../stories/lib/overlays.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const INPUT_DIR = path.join(ROOT, 'stories', 'input');
const OUTPUT_DIR = path.join(ROOT, 'stories', 'output');

const STORY_W = 1080;
const STORY_H = 1920;
const SUPPORTED = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const pickLayout = (basename) => {
  const lower = basename.toLowerCase();
  if (lower.includes('_cover') || lower.includes('cover_')) return 'cover';
  if (lower.includes('_cta') || lower.includes('cta_')) return 'cta';
  return 'gallery';
};

const buildOverlay = (layout, opts) => {
  if (layout === 'cover') return coverOverlay(opts);
  if (layout === 'cta') return ctaOverlay(opts);
  return galleryOverlay(opts);
};

async function loadCaptions() {
  const file = path.join(INPUT_DIR, 'captions.json');
  if (!existsSync(file)) return {};
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (err) {
    console.warn(`captions.json could not be parsed: ${err.message}`);
    return {};
  }
}

async function processOne(inputPath, captions) {
  const basename = path.basename(inputPath);
  const stem = basename.replace(path.extname(basename), '');
  const layout = pickLayout(stem);
  const overlayOpts = captions[basename] ?? captions[stem] ?? {};

  // Smart-fill cover: scale the photo so it fully covers the 9:16 frame and
  // crop using sharp's attention strategy (focuses on the most salient region
  // — typically the construction vehicles in these shots).
  const baseLayer = await sharp(inputPath, { failOn: 'none' })
    .rotate() // honor EXIF orientation
    .resize(STORY_W, STORY_H, {
      fit: 'cover',
      position: sharp.strategy.attention,
      kernel: sharp.kernel.lanczos3,
      withoutEnlargement: false,
    })
    .toBuffer();

  const overlaySvg = Buffer.from(buildOverlay(layout, overlayOpts));

  const composed = sharp(baseLayer).composite([{ input: overlaySvg, top: 0, left: 0 }]);

  const jpegOut = path.join(OUTPUT_DIR, `${stem}.jpg`);
  const pngOut = path.join(OUTPUT_DIR, `${stem}.png`);

  await composed
    .clone()
    .jpeg({ quality: 95, mozjpeg: true, chromaSubsampling: '4:4:4' })
    .toFile(jpegOut);

  await composed
    .clone()
    .png({ compressionLevel: 9, palette: false })
    .toFile(pngOut);

  return { basename, layout, jpegOut, pngOut };
}

async function main() {
  if (!existsSync(INPUT_DIR)) {
    console.error(`Input folder missing: ${INPUT_DIR}`);
    process.exit(1);
  }
  await mkdir(OUTPUT_DIR, { recursive: true });

  const entries = await readdir(INPUT_DIR);
  const photos = entries
    .filter((f) => SUPPORTED.has(path.extname(f).toLowerCase()))
    .map((f) => path.join(INPUT_DIR, f))
    .sort();

  if (photos.length === 0) {
    console.error(
      `No photos found in ${INPUT_DIR}. Drop your RC Şantiye images there ` +
        `(jpg/png/webp), then rerun: npm run stories`,
    );
    process.exit(1);
  }

  const captions = await loadCaptions();

  console.log(`Building ${photos.length} Instagram Story render(s)…`);
  for (const file of photos) {
    const info = await stat(file);
    if (!info.isFile()) continue;
    const result = await processOne(file, captions);
    console.log(
      `  ✓ ${result.basename} → ${path.relative(ROOT, result.jpegOut)} ` +
        `[layout: ${result.layout}]`,
    );
  }
  console.log(`Done. Output: ${path.relative(ROOT, OUTPUT_DIR)}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
