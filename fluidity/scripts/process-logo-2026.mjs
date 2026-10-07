/**
 * Fluidity_Logo_2026 → web brand assets.
 *
 * Source kit: E:/fluidityWebSite/Fluidity_Logo_2026 (PNG variants with clean
 * alpha — no un-mixing needed, unlike the 2025 kit processed by process-logo.mjs).
 *
 * Outputs (public/brand/, public/):
 *   logo-full.png       color lockup (navy wordmark + mint mark), trimmed, web 1x
 *   logo-full@2x.png    same at print quality
 *   logo-full-dark.png  fond-sombre lockup (white wordmark + mint mark) for dark theme
 *   logo-mark.png       icon only, trimmed
 *   favicon-64.png      64×64 icon
 *   apple-touch-icon.png 180×180 avatar (opaque rounded-square background)
 *   ../favicon.svg      vector icon copied from the kit
 */
import sharp from 'sharp';
import { copyFileSync } from 'node:fs';

const SRC = 'E:/fluidityWebSite/Fluidity_Logo_2026/PNG';

// --- Lockups: couleur + fond-sombre must share the exact same crop ----------
const couleur = sharp(`${SRC}/Fluidity_logo_couleur.png`);
const { data: couleurTrim, info: trimInfo } = await couleur
  .trim({ threshold: 10 })
  .png()
  .toBuffer({ resolveWithObject: true });
console.log('trimmed lockup:', trimInfo.width, 'x', trimInfo.height,
  'offset:', trimInfo.trimOffsetLeft, trimInfo.trimOffsetTop);

const fullMeta = await sharp(couleurTrim).metadata();
const halfWidth = Math.min(560, fullMeta.width);
await sharp(couleurTrim).resize({ width: halfWidth }).png({ compressionLevel: 9 }).toFile('public/brand/logo-full.png');
await sharp(couleurTrim).resize({ width: Math.min(1120, fullMeta.width) }).png({ compressionLevel: 9 }).toFile('public/brand/logo-full@2x.png');

// Same crop box extracted from the fond-sombre variant → pixel-aligned swap.
// (sharp reports removed margins as negative offsets — take the absolute value.)
const srcMeta = await sharp(`${SRC}/Fluidity_logo_couleur.png`).metadata();
const left = Math.min(Math.abs(trimInfo.trimOffsetLeft ?? 0), srcMeta.width - 1);
const top = Math.min(Math.abs(trimInfo.trimOffsetTop ?? 0), srcMeta.height - 1);
const width = Math.min(trimInfo.width, srcMeta.width - left);
const height = Math.min(trimInfo.height, srcMeta.height - top);
const darkTrim = await sharp(`${SRC}/Fluidity_logo_fond-sombre.png`)
  .extract({ left, top, width, height })
  .png({ compressionLevel: 9 })
  .toBuffer();
await sharp(darkTrim).resize({ width: halfWidth }).png({ compressionLevel: 9 }).toFile('public/brand/logo-full-dark.png');

// --- Icon -------------------------------------------------------------------
const iconTrim = await sharp(`${SRC}/Fluidity_icone_couleur.png`).trim({ threshold: 10 }).png().toBuffer();
const iconMeta = await sharp(iconTrim).metadata();
console.log('trimmed icon:', iconMeta.width, 'x', iconMeta.height);
await sharp(iconTrim).resize({ height: 160, withoutEnlargement: true }).png({ compressionLevel: 9 }).toFile('public/brand/logo-mark.png');
await sharp(iconTrim).resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile('public/brand/favicon-64.png');
await sharp(`${SRC}/Fluidity_icone_couleur__avatar.png`).resize(180, 180).png({ compressionLevel: 9 }).toFile('public/brand/apple-touch-icon.png');

// --- Vector favicon -----------------------------------------------------------
copyFileSync('E:/fluidityWebSite/Fluidity_Logo_2026/SVG/Fluidity_icone_couleur.svg', 'public/favicon.svg');

const out = await sharp('public/brand/logo-full.png').metadata();
console.log('logo-full.png:', out.width, 'x', out.height, '— aspect', (out.width / out.height).toFixed(3));
console.log('done');
