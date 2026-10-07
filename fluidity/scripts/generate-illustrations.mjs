// One-off generator: deterministic, themed SVG illustrations for Fluidity's
// services / solutions / references sections. Re-run after editing a motif:
//   node scripts/generate-illustrations.mjs
// Output lands in public/images/illustrations/*.svg (committed to the repo).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'images', 'illustrations');
mkdirSync(outDir, { recursive: true });

const W = 640;
const H = 400;
const ACCENT = '#e70013'; // Tunisian red — sparing accent, like the flag
const TEAL = '#0f766e';
const GREEN = '#00a583';
const CYAN = '#22d3ee';

// --- drawing helpers -------------------------------------------------------

/**
 * Shared backdrop giving every illustration depth: a soft dot grid, two
 * brand glows (blue / cyan) and a faint horizon flow line. Drawn under each
 * motif, theme-neutral so it works on light and dark cards alike.
 */
const backdrop = () =>
  `<defs>
    <radialGradient id="glow-blue" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#00a583" stop-opacity="0.30"/>
      <stop offset="1" stop-color="#00a583" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow-cyan" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#22d3ee" stop-opacity="0.26"/>
      <stop offset="1" stop-color="#22d3ee" stop-opacity="0"/>
    </radialGradient>
    <pattern id="dot-grid" width="26" height="26" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.3" fill="#00a583" fill-opacity="0.16"/>
    </pattern>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#dot-grid)"/>
  <circle cx="130" cy="70" r="170" fill="url(#glow-blue)"/>
  <circle cx="525" cy="340" r="190" fill="url(#glow-cyan)"/>
  <path d="M -10 340 C 140 300, 260 380, 400 340 S 620 300, 660 330" fill="none" stroke="#00a583" stroke-width="1.5" opacity="0.18"/>
  <path d="M -10 365 C 150 330, 280 400, 420 365 S 610 330, 660 355" fill="none" stroke="#22d3ee" stroke-width="1.5" opacity="0.14"/>`;

const svgDoc = (inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-hidden="true" focusable="false">\n  ${backdrop()}\n  ${inner}\n</svg>\n`;

const stroke = (d, color, w, o) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" opacity="${o}"/>`;

const dot = (x, y, r, c) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;

const ring = (x, y, r, c) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${c}" stroke-width="2" opacity="0.35"/>\n  ` +
  `<circle cx="${x}" cy="${y}" r="${r - 12}" fill="none" stroke="${c}" stroke-width="4" opacity="0.8"/>`;

const dashRing = (x, y, r, c) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${c}" stroke-width="1.5" stroke-dasharray="4 7" opacity="0.5"/>`;

const panel = (x, y, w, h, c = GREEN) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${c}" fill-opacity="0.10" stroke="${c}" stroke-opacity="0.5" stroke-width="1.5"/>`;

const label = (x, y, text, c, size = 15) =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-family="ui-monospace, monospace" font-size="${size}" fill="${c}" opacity="0.9">${text}</text>`;

const rackUnit = (x, y, c) =>
  `<rect x="${x}" y="${y}" width="120" height="20" rx="5" fill="${c}" fill-opacity="0.16" stroke="${c}" stroke-opacity="0.55" stroke-width="1.5"/>` +
  `<circle cx="${x + 14}" cy="${y + 10}" r="3" fill="${TEAL}"/>` +
  `<line x1="${x + 30}" y1="${y + 10}" x2="${x + 106}" y2="${y + 10}" stroke="${c}" stroke-opacity="0.5" stroke-width="3" stroke-linecap="round"/>`;

const rack = (x, y, n, c = GREEN) => {
  const rows = [];
  for (let i = 0; i < n; i++) rows.push(rackUnit(x, y + i * 26, c));
  return rows.join('\n  ');
};

const vault = (x, y, r = 54) => {
  let s = '';
  for (let i = 0; i < 3; i++) {
    const rx = r - i * 6;
    s += `<ellipse cx="${x}" cy="${y - 14 + i * 14}" rx="${rx}" ry="${Math.round(rx / 3)}" fill="none" stroke="${GREEN}" stroke-width="2.5" opacity="${(0.9 - i * 0.22).toFixed(2)}"/>\n  `;
  }
  s += `<g transform="translate(${x + Math.round(r * 0.62)}, ${y - Math.round(r * 0.62)})">` +
    `<rect x="-16" y="-6" width="32" height="24" rx="5" fill="${ACCENT}" fill-opacity="0.9"/>` +
    `<path d="M -9 -6 v -7 a 9 9 0 0 1 18 0 v 7" fill="none" stroke="${ACCENT}" stroke-width="5" stroke-linecap="round"/></g>`;
  return s;
};

const geoRing = (x, y, r = 78) => {
  const p = (deg) => [
    Math.round(x + r * Math.cos((deg * Math.PI) / 180)),
    Math.round(y + r * Math.sin((deg * Math.PI) / 180)),
  ];
  const [x1, y1] = p(-40);
  const [x2, y2] = p(140);
  const [x3, y3] = p(60);
  return (
    dashRing(x, y, r, GREEN) + '\n  ' +
    stroke(`M ${x1} ${y1} Q ${x} ${y - Math.round(r * 0.7)} ${x2} ${y2}`, ACCENT, 3.5, 0.85) + '\n  ' +
    stroke(`M ${x1} ${y1} Q ${x} ${y + Math.round(r * 0.7)} ${x3} ${y3}`, CYAN, 3.5, 0.85) + '\n  ' +
    dot(x1, y1, 6, ACCENT) + '\n  ' +
    dot(x2, y2, 6, GREEN) + '\n  ' +
    dot(x3, y3, 6, CYAN)
  );
};

const shield = (x, y, s = 1, main = true) => {
  const body = 'M 0 -46 L 36 -30 V 8 Q 36 34 0 48 Q -36 34 -36 8 V -30 Z';
  if (main) {
    return `<g transform="translate(${x}, ${y}) scale(${s})">` +
      `<path d="${body}" fill="${GREEN}" fill-opacity="0.14" stroke="${GREEN}" stroke-width="2.5"/>` +
      `<path d="M -12 2 L -2 14 L 18 -10" fill="none" stroke="${CYAN}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  }
  return `<g transform="translate(${x}, ${y}) scale(${s})">` +
    `<path d="${body}" fill="none" stroke="${TEAL}" stroke-width="2.5" stroke-dasharray="6 5" opacity="0.9"/></g>`;
};

const monitor = (x, y) =>
  `<g transform="translate(${x}, ${y})">` +
  `<rect x="-46" y="-34" width="92" height="60" rx="8" fill="${GREEN}" fill-opacity="0.12" stroke="${GREEN}" stroke-opacity="0.6" stroke-width="1.5"/>` +
  `<polyline points="-32,8 -16,-8 -2,4 14,-18 32,-2" fill="none" stroke="${CYAN}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>` +
  `<line x1="0" y1="26" x2="0" y2="38" stroke="${GREEN}" stroke-opacity="0.6" stroke-width="3"/>` +
  `<line x1="-18" y1="40" x2="18" y2="40" stroke="${GREEN}" stroke-opacity="0.6" stroke-width="3" stroke-linecap="round"/></g>`;

const gpu = (x, y) => {
  const pins = [];
  for (let i = 0; i < 3; i++) {
    pins.push(`<line x1="${x - 58}" y1="${y - 20 + i * 20}" x2="${x - 36}" y2="${y - 20 + i * 20}" stroke="${GREEN}" stroke-width="3" stroke-linecap="round" opacity="0.7"/>`);
    pins.push(`<line x1="${x + 36}" y1="${y - 20 + i * 20}" x2="${x + 58}" y2="${y - 20 + i * 20}" stroke="${CYAN}" stroke-width="3" stroke-linecap="round" opacity="0.7"/>`);
  }
  return `<rect x="${x - 34}" y="${y - 34}" width="68" height="68" rx="10" fill="${GREEN}" fill-opacity="0.14" stroke="${GREEN}" stroke-width="2.5"/>\n  ` +
    `<rect x="${x - 16}" y="${y - 16}" width="32" height="32" rx="6" fill="${ACCENT}" fill-opacity="0.85"/>\n  ` +
    pins.join('\n  ');
};

// --- motifs: one schematic per service / solution id -----------------------

const MOTIFS = {
  iaas: () =>
    [
      rack(60, 140, 4),
      ring(320, 200, 40, GREEN),
      rack(460, 140, 4, CYAN),
      stroke('M 180 200 C 230 200, 250 200, 278 200', GREEN, 5, 0.6),
      stroke('M 362 200 C 390 200, 410 200, 460 200', CYAN, 5, 0.6),
    ].join('\n  '),

  hebergement: () =>
    [
      panel(50, 145, 140, 110),
      rack(68, 163, 3),
      panel(450, 145, 140, 110, CYAN),
      rack(468, 163, 3, CYAN),
      stroke('M 190 200 C 250 182, 370 218, 450 200', GREEN, 4, 0.6),
      dot(320, 200, 6, ACCENT),
    ].join('\n  '),

  backup: () =>
    [
      panel(50, 150, 130, 90),
      rack(66, 166, 3),
      vault(460, 190, 56),
      stroke('M 180 190 C 260 140, 340 245, 398 192', GREEN, 4, 0.6),
      stroke('M 180 190 C 260 245, 340 140, 398 192', CYAN, 3, 0.35),
      label(460, 282, 'AES-256', ACCENT),
    ].join('\n  '),

  pra: () =>
    [
      geoRing(180, 200, 80),
      rack(400, 150, 4, CYAN),
      stroke('M 262 200 C 310 200, 352 200, 398 200', ACCENT, 5, 0.75),
    ].join('\n  '),

  connectivite: () =>
    [
      dot(110, 120, 7, GREEN),
      dot(90, 280, 7, CYAN),
      dot(530, 200, 8, ACCENT),
      stroke('M 110 120 C 260 90, 380 150, 522 196', GREEN, 4, 0.65),
      stroke('M 90 280 C 260 310, 380 250, 522 204', CYAN, 4, 0.65),
      ring(320, 200, 34, GREEN),
    ].join('\n  '),

  cybersecurite: () =>
    [
      shield(280, 200, 1.15, true),
      shield(372, 236, 0.75, false),
      stroke('M 440 200 C 470 185, 490 215, 520 200', CYAN, 3, 0.5),
      stroke('M 440 220 C 470 235, 490 205, 520 220', TEAL, 3, 0.5),
      label(490, 160, '403', CYAN, 17),
      label(490, 268, '403', TEAL, 17),
    ].join('\n  '),

  manages: () =>
    [
      ring(190, 200, 64, GREEN),
      dot(190, 128, 6, ACCENT),
      dot(118, 252, 6, CYAN),
      dot(262, 252, 6, CYAN),
      monitor(450, 195),
      stroke('M 254 240 C 320 236, 360 210, 402 200', CYAN, 4, 0.6),
    ].join('\n  '),

  'cloud-ia': () =>
    [
      gpu(200, 200),
      dashRing(470, 200, 58, CYAN),
      dot(470, 142, 6, ACCENT),
      dot(528, 200, 6, GREEN),
      dot(470, 258, 6, CYAN),
      stroke('M 258 200 C 320 178, 380 222, 412 200', GREEN, 4, 0.6),
      label(470, 296, 'TUN · GPU', TEAL, 14),
    ].join('\n  '),

  'solution-cloud-prive': () =>
    [
      ring(320, 200, 64, GREEN),
      rack(70, 150, 4),
      dot(560, 160, 8, CYAN),
      dot(560, 240, 8, ACCENT),
      stroke('M 134 200 C 200 200, 230 200, 256 200', GREEN, 5, 0.6),
      stroke('M 384 200 C 440 200, 480 200, 550 164', CYAN, 4, 0.6),
      stroke('M 384 200 C 440 200, 480 200, 550 236', ACCENT, 4, 0.6),
    ].join('\n  '),

  'solution-continuite': () =>
    [
      geoRing(180, 200, 76),
      vault(460, 190, 54),
      stroke('M 258 200 C 310 165, 350 235, 400 190', ACCENT, 4.5, 0.7),
    ].join('\n  '),

  'solution-donnees-souveraines': () =>
    [
      shield(180, 200, 1, true),
      vault(450, 195, 58),
      stroke('M 228 200 C 290 200, 340 200, 388 198', GREEN, 4, 0.6),
      label(450, 288, 'TUN · 2004-63', TEAL, 14),
    ].join('\n  '),

  'empty-references': () =>
    [
      dashRing(320, 190, 58, GREEN),
      dot(320, 132, 6, ACCENT),
      stroke('M 320 132 C 380 150, 400 220, 356 246', CYAN, 3, 0.45),
      stroke('M 320 132 C 260 150, 240 220, 284 246', GREEN, 3, 0.45),
      dot(356, 246, 5, CYAN),
      dot(284, 246, 5, GREEN),
    ].join('\n  '),
};

// --- render + write ---------------------------------------------------------

let written = 0;
for (const [name, build] of Object.entries(MOTIFS)) {
  const svg = svgDoc(build());
  writeFileSync(join(outDir, `${name}.svg`), svg, 'utf8');
  written += 1;
  console.log(`wrote ${name}.svg (${svg.length} bytes)`);
}
console.log(`done: ${written} illustrations in ${outDir}`);
