/**
 * One-off logo processing: source flogo.png (1024x1024, white background)
 * → transparent, trimmed assets in public/.
 *
 * Steps:
 *  1. "Unmix" the white background: every pixel is treated as a blend of the
 *     true artwork color over white; we solve for the true color and alpha.
 *     This keeps anti-aliased edges smooth instead of leaving a white halo.
 *  2. Trim transparent margins.
 *  3. Export: full lockup (2x web + print), mark-only crop, and a favicon PNG.
 */
import sharp from 'sharp';
import { readFileSync } from 'node:fs';

const SRC = 'C:/Users/zined/Desktop/flogo.png';

const { data, info } = await sharp(SRC)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width: w, height: h, channels } = info;
const out = Buffer.alloc(w * h * 4);

for (let i = 0; i < w * h; i++) {
  const o = i * 4;
  const r = data[o] / 255;
  const g = data[o + 1] / 255;
  const b = data[o + 2] / 255;

  // Solve c_out = c_true * a + 1 * (1 - a), minimizing distance to white:
  // classic "remove white matte". alpha = 1 - min(r,g,b) works when the
  // artwork is darker than white everywhere (true for this logo).
  const a = 1 - Math.min(r, g, b);
  let tr, tg, tb;
  if (a <= 1 / 255) {
    tr = tg = tb = 0;
  } else {
    tr = (r - (1 - a)) / a;
    tg = (g - (1 - a)) / a;
    tb = (b - (1 - a)) / a;
    tr = Math.min(Math.max(tr, 0), 1);
    tg = Math.min(Math.max(tg, 0), 1);
    tb = Math.min(Math.max(tb, 0), 1);
  }

  out[o] = Math.round(tr * 255);
  out[o + 1] = Math.round(tg * 255);
  out[o + 2] = Math.round(tb * 255);
  out[o + 3] = Math.round(a * 255);
}

const base = sharp(out, { raw: { width: w, height: h, channels: 4 } });
const { data: trimmed, info: tinfo } = await base
  .clone()
  .trim({ threshold: 2 })
  .png()
  .toBuffer({ resolveWithObject: true });

console.log('trimmed:', tinfo.width, 'x', tinfo.height);

const trimmedSharp = sharp(trimmed);

// Full lockup, web @2x
await trimmedSharp.clone().resize({ width: 560, withoutEnlargement: true }).png({ compressionLevel: 9 }).toFile('public/brand/logo-full.png');
// Full lockup, print-quality
await trimmedSharp.clone().png({ compressionLevel: 9 }).toFile('public/brand/logo-full@2x.png');

// Mark-only crop: detect the mark by scanning alpha columns with a
// noise-aware threshold (unmixing leaves alpha ≤ ~6 dust in empty areas).
{
  // Decode to true raw RGBA first — the trimmed buffer is PNG-encoded.
  const { data: raw, info: ti } = await sharp(trimmed).raw().toBuffer({ resolveWithObject: true });
  const noiseCol = ti.height * 8; // avg alpha < 8 → treated as empty
  const cols = new Array(ti.width).fill(0);
  for (let x = 0; x < ti.width; x++) {
    let sum = 0;
    for (let y = 0; y < ti.height; y++) {
      sum += raw[(y * ti.width + x) * 4 + 3];
    }
    cols[x] = sum;
  }
  // Collect content runs (consecutive non-noise columns).
  const runs = [];
  let start = -1;
  for (let x = 0; x < ti.width; x++) {
    const solid = cols[x] > noiseCol;
    if (solid && start === -1) start = x;
    if (!solid && start !== -1) {
      if (x - start > ti.width * 0.02) runs.push([start, x]);
      start = -1;
    }
  }
  if (start !== -1) runs.push([start, ti.width]);
  console.log('content runs:', JSON.stringify(runs));
  const [markStart, markEnd] = runs.length > 1 ? runs[0] : [0, Math.round(ti.width * 0.3)];
  const markBuf = await sharp(trimmed)
    .extract({ left: Math.max(markStart - 2, 0), top: 0, width: Math.min(markEnd - markStart + 4, ti.width), height: ti.height })
    .trim({ threshold: 2 })
    .png()
    .toBuffer();
  const markMeta = await sharp(markBuf).metadata();
  console.log('mark:', markMeta.width, 'x', markMeta.height);
  await sharp(markBuf).resize({ height: 160, withoutEnlargement: true }).png({ compressionLevel: 9 }).toFile('public/brand/logo-mark.png');
}

// Favicon: square canvas centered on the mark
{
  const mark = await sharp('public/brand/logo-mark.png').resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  await sharp(mark).resize(64, 64).png().toFile('public/brand/favicon-64.png');
}

console.log('done');
