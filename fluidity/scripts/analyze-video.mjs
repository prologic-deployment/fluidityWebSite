// One-off analysis of the user's reference video. Extracts a frame grid and
// reports per-frame palette, spatial brightness and inter-frame motion.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const VIDEO = 'C:/Users/zined/Videos/Enregistrements d\u2019\u00e9cran/Enregistrement de l\'\u00e9cran 2026-09-28 141950.mp4';
const FFMPEG = join(root, 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');
const tmp = join(root, '..', '.freebuff', 'video-frames');
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });

const N = 20;
const DUR = 9.83;
// One pass: ~1 frame per second is plenty for style/motion analysis.
execFileSync(
  FFMPEG,
  ['-i', VIDEO, '-vf', `fps=${(N / DUR).toFixed(4)}`, join(tmp, 'f%03d.png')],
  { stdio: 'ignore' },
);
const frames = readdirSync(tmp).filter((f) => f.endsWith('.png')).sort();
console.log(`extracted ${frames.length} frames`);

const GW = 8; // motion grid cells across
const GH = 5;
const prevCells = [];
const rows = [];

for (let i = 0; i < frames.length; i++) {
  const file = join(tmp, frames[i]);
  const { data, info } = await sharp(file).resize(96, 60, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });

  // global average + top quantized colors
  const buckets = new Map();
  let r = 0, g = 0, b = 0;
  const cells = Array.from({ length: GW * GH }, () => [0, 0, 0, 0]);
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const o = (y * info.width + x) * info.channels;
      const R = data[o], G = data[o + 1], B = data[o + 2];
      r += R; g += G; b += B;
      const key = ((R >> 5) << 6) | ((G >> 5) << 3) | (B >> 5);
      buckets.set(key, (buckets.get(key) || 0) + 1);
      const cx = Math.min(GW - 1, Math.floor((x / info.width) * GW));
      const cy = Math.min(GH - 1, Math.floor((y / info.height) * GH));
      const c = cells[cy * GW + cx];
      c[0] += R; c[1] += G; c[2] += B; c[3]++;
    }
  }
  const n = info.width * info.height;
  const avg = [r / n, g / n, b / n].map((v) => Math.round(v));
  const top = [...buckets.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k, c]) => {
      const R = ((k >> 6) << 5) + 16, G = (((k >> 3) & 7) << 5) + 16, B = ((k & 7) << 5) + 16;
      return `#${[R, G, B].map((v) => Math.min(255, v).toString(16).padStart(2, '0')).join('')} ${(100 * c / n).toFixed(0)}%`;
    });

  const cellAvg = cells.map(([R, G, B, m]) => [R / m, G / m, B / m]);
  rows.push({ i, avg, top, cellAvg });

  if (prevCells.length) {
    const diffs = cellAvg.map((c, idx) => {
      const p = prevCells[idx];
      return Math.abs(c[0] - p[0]) + Math.abs(c[1] - p[1]) + Math.abs(c[2] - p[2]);
    });
    const max = Math.max(...diffs, 1);
    const map = diffs.map((d) => (d / max > 0.55 ? '#' : d / max > 0.3 ? '+' : d / max > 0.12 ? '.' : ' '));
    let out = '';
    for (let gy = 0; gy < GH; gy++) out += map.slice(gy * GW, gy * GW + GW).join('') + '\n';
    console.log(`--- motion f${i - 1}->f${i} ---\n${out}`);
  }
  prevCells.splice(0, prevCells.length, ...cellAvg);
}

for (const { i, avg, top } of rows.filter((_, idx) => idx % 2 === 0)) {
  console.log(`f${i}: avg rgb(${avg.join(',')}) | ${top.join(' | ')}`);
}
console.log('frames dir: ' + tmp);
