import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  inject,
  input,
  signal,
} from '@angular/core';

import { isIoHealthy } from '../../directives/reveal.directive';

/**
 * "The sovereign cloud fabric" — full-bleed animated hero background.
 *
 * A cloud-service metaphor that reads as actual clouds instead of an abstract
 * flow diagram: a constellation of glowing network clouds (soft volume, a
 * dense mesh of connected nodes and a neon rim) floating over a fabric of
 * servers/data points, with data streams flowing across the frame and light
 * rays fanning out beneath each cloud.
 *
 * Layers
 *  - node fabric      — glowing servers/data points spread over the viewport
 *  - data ribbons     — flowing dashed streams crossing the whole frame
 *  - network clouds   — one hero cloud plus distant ones, each drawn as a
 *                       cloud silhouette filled with a connected node mesh,
 *                       a glowing rim and data rays with travelling packets
 *  - ambient haze     — soft blobs for depth
 *
 * Every layer drifts slowly and reacts to pointer parallax; the palette adapts
 * to the active theme (`data-theme`) so light mode reads as a pale network and
 * dark mode as a glowing one.
 *
 * Drawn as a single transparent 2D canvas over the CSS hero background, which
 * keeps this cheap (no WebGL context, no library) while still animating at
 * 60fps: links and mesh edges are batched into a handful of paths per frame,
 * glows are two-pass circles rather than expensive canvas shadows, and the
 * whole thing is paused off-screen. Lifecycle matches the rest of the app:
 * lazy start via IntersectionObserver, reduced-motion / no-canvas fallback,
 * density-driven budget and full teardown on destroy.
 */

interface InfraNode {
  x: number;
  y: number;
  z: number;
  r: number;
  tw: number;
  ts: number;
  c: number;
  sx: number;
  sy: number;
}

interface InfraRibbon {
  yBase: number;
  amp: number;
  freq: number;
  phase: number;
  speed: number;
  dash: [number, number];
  width: number;
  z: number;
  alpha: number;
}

interface CloudBlob {
  x: number;
  cy: number;
  r: number;
}

interface Cloud {
  blobs: CloudBlob[];
  width: number;
  height: number;
}

interface MeshPoint {
  x: number;
  y: number;
  p: number;
}

interface Mesh {
  nodes: MeshPoint[];
  edges: [MeshPoint, MeshPoint][];
}

interface CloudOptions {
  cx: number;
  cy: number;
  w: number;
  opacity: number;
  depth: number;
  bob: number;
  seed: number;
  targetN: number;
}

interface Palette {
  node: [string, string, string];
  /** "r,g,b" fragments so alpha can be composed per draw. */
  link: string;
  ribbon: string;
  cloudNode: string;
  cloudEdge: string;
  cloudRim: string;
  cloudFill: string;
  haze: string;
  ray: string;
}

const PALETTE: { dark: Palette; light: Palette } = {
  dark: {
    node: ['#2ed3b7', '#22d3ee', '#a2efd0'],
    link: '46,211,183',
    ribbon: '46,211,183',
    cloudNode: '#9ff7e8',
    cloudEdge: 'rgba(94,234,212,0.55)',
    cloudRim: '#7deef9',
    cloudFill: '34,211,238',
    haze: '14,60,90',
    ray: '103,232,249',
  },
  light: {
    node: ['#00a583', '#0891b2', '#2ec4a6'],
    link: '0,165,131',
    ribbon: '0,165,131',
    cloudNode: '#0f766e',
    cloudEdge: 'rgba(13,148,136,0.66)',
    cloudRim: '#0e7490',
    cloudFill: '8,145,178',
    haze: '168,214,230',
    ray: '8,145,178',
  },
};

/**
 * Relative puff layout of the cloud silhouette: overlapping circles resting on
 * a common baseline (y up is negative). Jittered per cloud by `makeCloud`, so
 * every cloud in the scene has its own shape.
 */
const PUFFS: { x: number; r: number; cy: number }[] = [
  { x: 0, r: 0.7, cy: -0.4 },
  { x: 0.75, r: 1.0, cy: -0.95 },
  { x: 1.8, r: 1.3, cy: -1.15 },
  { x: 3.0, r: 1.05, cy: -0.9 },
  { x: 3.9, r: 0.72, cy: -0.4 },
];

/** Deterministic PRNG so the layout is stable across rebuilds. */
function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;

function makeCloud(width: number, seed: number): Cloud {
  const rnd = mulberry32(seed * 97 + 13);
  const puffs = PUFFS.map((p, i) => ({
    x: p.x + (rnd() - 0.5) * 0.28 * (i === 0 || i === PUFFS.length - 1 ? 0.6 : 1),
    r: p.r * (0.9 + rnd() * 0.24),
    cy: p.cy * (0.88 + rnd() * 0.26),
  }));
  let minX = Infinity;
  let maxX = -Infinity;
  let top = 0;
  for (const p of puffs) {
    minX = Math.min(minX, p.x - p.r);
    maxX = Math.max(maxX, p.x + p.r);
    top = Math.min(top, p.cy - p.r);
  }
  const k = width / (maxX - minX);
  return {
    blobs: puffs.map((p) => ({ x: (p.x - minX) * k, cy: p.cy * k, r: p.r * k })),
    width: (maxX - minX) * k,
    height: -top * k,
  };
}

/** Point-in-cloud test; `yDown` is measured downward from the flat baseline. */
function insideCloud(cloud: Cloud, x: number, yDown: number): boolean {
  if (yDown < 0) {
    return false;
  }
  for (const b of cloud.blobs) {
    const dx = x - b.x;
    const dy = yDown + b.cy;
    if (dx * dx + dy * dy < b.r * b.r) {
      return true;
    }
  }
  return false;
}

function cloudPath(ctx: CanvasRenderingContext2D, cloud: Cloud, sag: number): void {
  const steps = 110;
  const top = (x: number): number => {
    let y = 0;
    for (const b of cloud.blobs) {
      const dx = x - b.x;
      if (Math.abs(dx) < b.r) {
        y = Math.min(y, b.cy - Math.sqrt(b.r * b.r - dx * dx));
      }
    }
    return y;
  };
  ctx.beginPath();
  ctx.moveTo(0, 0);
  for (let i = 0; i <= steps; i++) {
    const x = lerp(0, cloud.width, i / steps);
    ctx.lineTo(x, top(x));
  }
  if (sag > 0) {
    for (let i = steps; i >= 0; i--) {
      const x = lerp(0, cloud.width, i / steps);
      ctx.lineTo(x, sag * Math.sin(Math.PI * (i / steps)));
    }
  } else {
    ctx.lineTo(cloud.width, 0);
    ctx.lineTo(0, 0);
  }
  ctx.closePath();
}

/** Sample points inside the cloud and connect each to its nearest neighbours. */
function buildMesh(cloud: Cloud, seed: number, targetN: number): Mesh {
  const rnd = mulberry32(seed * 31 + 5);
  const nodes: MeshPoint[] = [];
  let guard = 0;
  while (nodes.length < targetN && guard++ < targetN * 120) {
    const x = rnd() * cloud.width;
    const yDown = rnd() * cloud.height * 1.05;
    if (insideCloud(cloud, x, yDown)) {
      nodes.push({ x, y: -yDown, p: rnd() * Math.PI * 2 });
    }
  }
  const maxEdge = cloud.width * 0.085;
  const edges: [MeshPoint, MeshPoint][] = [];
  for (let i = 0; i < nodes.length; i++) {
    const dists: [number, number][] = [];
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) {
        continue;
      }
      dists.push([Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y), j]);
    }
    dists.sort((a, b) => a[0] - b[0]);
    for (let k = 0; k < Math.min(3, dists.length); k++) {
      const [d, j] = dists[k];
      if (d < maxEdge && j > i) {
        edges.push([nodes[i], nodes[j]]);
      }
    }
  }
  return { nodes, edges };
}

@Component({
  selector: 'app-fluid-visual',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stage" aria-hidden="true"></div>
    @if (fallback()) {
      <div class="fallback" aria-hidden="true">
        <div class="fb-orb fb-orb--a"></div>
        <div class="fb-orb fb-orb--b"></div>
        <div class="fb-orb fb-orb--c"></div>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
      position: relative;
      width: 100%;
      height: 100%;
    }

    .stage {
      position: absolute;
      inset: 0;
    }

    .stage canvas {
      display: block;
      width: 100% !important;
      height: 100% !important;
    }

    .fallback {
      position: absolute;
      inset: 0;
      overflow: hidden;
    }

    .fb-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(70px);
    }

    .fb-orb--a {
      width: 55%;
      aspect-ratio: 1;
      background: radial-gradient(circle, rgb(0 133 110 / 0.5), transparent 70%);
      top: 10%;
      left: 15%;
      animation: fb-drift 12s ease-in-out infinite alternate;
    }

    .fb-orb--b {
      width: 45%;
      aspect-ratio: 1;
      background: radial-gradient(circle, rgb(0 201 167 / 0.4), transparent 70%);
      bottom: 8%;
      right: 10%;
      animation: fb-drift 16s ease-in-out infinite alternate-reverse;
    }

    .fb-orb--c {
      width: 30%;
      aspect-ratio: 1;
      background: radial-gradient(circle, rgb(0 133 110 / 0.3), transparent 70%);
      top: 35%;
      right: 30%;
      animation: fb-drift 20s ease-in-out infinite alternate;
    }

    @keyframes fb-drift {
      from {
        transform: translate3d(0, 0, 0) scale(1);
      }
      to {
        transform: translate3d(2rem, -1.5rem, 0) scale(1.1);
      }
    }
  `,
})
export class FluidVisual implements OnInit, OnDestroy {
  /** 'low' for mobile / small viewports, 'high' for desktop. */
  readonly density = input<'low' | 'high'>('high');

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zone = inject(NgZone);
  protected readonly fallback = signal(false);

  private cleanup: (() => void) | null = null;
  private observer: IntersectionObserver | null = null;

  ngOnInit(): void {
    const stage = this.elementRef.nativeElement.querySelector<HTMLElement>('.stage');
    if (!stage || typeof window === 'undefined') {
      this.fallback.set(true);
      return;
    }

    const reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion) {
      this.fallback.set(true);
      return;
    }

    // Defer the animation until the visual is actually near the viewport.
    if (typeof IntersectionObserver === 'undefined') {
      this.start(stage);
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.observer?.disconnect();
            this.observer = null;
            this.start(stage);
          }
        }
      },
      { rootMargin: '200px' },
    );
    this.observer.observe(stage);

    // IO-broken environments (suspended webviews): start directly after the
    // health deadline; on healthy browsers IO has fired long before this.
    setTimeout(() => {
      if (!isIoHealthy() && this.observer) {
        this.observer.disconnect();
        this.observer = null;
        this.start(stage);
      }
    }, 1400);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.cleanup?.();
    this.cleanup = null;
  }

  private start(stage: HTMLElement): void {
    this.zone.runOutsideAngular(() => {
      this.initScene(stage);
    });
  }

  private initScene(stage: HTMLElement): void {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      this.fallback.set(true);
      return;
    }
    stage.appendChild(canvas);

    const isLow = this.density() === 'low';
    const maxDpr = isLow ? 1.25 : 1.5;
    const meshScale = isLow ? 0.62 : 1;
    const areaFactor = isLow ? 24000 : 14000;
    const maxNodes = isLow ? 130 : 230;

    let W = 1;
    let H = 1;
    let linkDist = 110;

    let nodes: InfraNode[] = [];
    let ribbons: InfraRibbon[] = [];

    // --- Pointer parallax ----------------------------------------------------
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const onPointerMove = (event: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        return;
      }
      pointer.tx = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.ty = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    // --- Pause when off-screen ----------------------------------------------
    let visible = true;
    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
      },
      { threshold: 0 },
    );
    visibilityObserver.observe(stage);

    const themePalette = (): Palette =>
      document.documentElement.getAttribute('data-theme') === 'light' ? PALETTE.light : PALETTE.dark;

    // --- Layout --------------------------------------------------------------
    const build = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      W = stage.clientWidth || 1;
      H = stage.clientHeight || 1;
      canvas.width = Math.max(1, Math.round(W * dpr));
      canvas.height = Math.max(1, Math.round(H * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      linkDist = Math.max(95, Math.min(W, H) * 0.105);

      // Node fabric spread over the whole viewport.
      const rnd = mulberry32(42);
      const count = Math.min(maxNodes, Math.round((W * H) / areaFactor));
      nodes = [];
      for (let i = 0; i < count; i++) {
        nodes.push({
          x: rnd() * W,
          y: rnd() * H,
          z: 0.35 + rnd() * 0.65,
          r: 1.1 + rnd() * 1.9,
          tw: rnd() * Math.PI * 2,
          ts: 0.4 + rnd() * 1.1,
          c: Math.floor(rnd() * 3),
          sx: 0,
          sy: 0,
        });
      }

      // Flowing dashed data ribbons.
      ribbons = [];
      for (let i = 0; i < 4; i++) {
        const r2 = mulberry32(100 + i);
        ribbons.push({
          yBase: H * (0.16 + 0.66 * r2()),
          amp: H * (0.05 + 0.08 * r2()),
          freq: 1.2 + r2() * 1.4,
          phase: r2() * Math.PI * 2,
          speed: 16 + r2() * 34,
          dash: [2 + r2() * 5, 9 + r2() * 14],
          width: 0.8 + r2(),
          z: 0.4 + r2() * 0.6,
          alpha: 0.15 + r2() * 0.13,
        });
      }
    };

    build();

    // --- Cloud catalogue -----------------------------------------------------
    // Rebuilt after `build()` so sizes follow the viewport. The hero cloud
    // sits on the open right side of the frame (the copy fades in from the
    // left); distant clouds fill the remaining depth.
    const cloudOptions = (): CloudOptions[] => {
      const heroW = isLow ? Math.min(W * 0.66, H * 0.5) : Math.min(W * 0.32, H * 0.7);
      const list: CloudOptions[] = [
        { cx: isLow ? W * 0.6 : W * 0.69, cy: H * 0.44, w: heroW, opacity: 1, depth: 1, bob: 0, seed: 3, targetN: Math.round(110 * meshScale) },
        { cx: W * 0.28, cy: H * 0.22, w: W * 0.15, opacity: 0.5, depth: 0.7, bob: 1.7, seed: 11, targetN: Math.round(50 * meshScale) },
        { cx: W * 0.9, cy: H * 0.79, w: W * 0.12, opacity: 0.35, depth: 0.55, bob: 3.1, seed: 23, targetN: Math.round(40 * meshScale) },
      ];
      if (!isLow) {
        list.push({ cx: W * 0.1, cy: H * 0.82, w: W * 0.1, opacity: 0.3, depth: 0.45, bob: 4.4, seed: 37, targetN: 34 });
      }
      return list;
    };

    let clouds: { opt: CloudOptions; cloud: Cloud; mesh: Mesh; sag: number }[] = [];
    const rebuildClouds = () => {
      clouds = cloudOptions().map((opt) => {
        const cloud = makeCloud(opt.w, opt.seed);
        return { opt, cloud, mesh: buildMesh(cloud, opt.seed, opt.targetN), sag: cloud.height * 0.14 };
      });
    };
    rebuildClouds();

    // --- Cloud rendering -----------------------------------------------------
    const drawNetworkCloud = (t: number, P: Palette, isDark: boolean, entry: { opt: CloudOptions; cloud: Cloud; mesh: Mesh; sag: number }): void => {
      const { opt, cloud, mesh, sag } = entry;
      const x = opt.cx + Math.sin(t * 0.11 + opt.bob) * 10 + pointer.x * 22 * opt.depth;
      const y = opt.cy + Math.sin(t * 0.14 + opt.bob * 2) * 6 + pointer.y * 14 * opt.depth;

      ctx.save();
      ctx.translate(x - cloud.width / 2, y);
      ctx.globalAlpha = opt.opacity;

      // Soft light bloom behind the cloud.
      const R = opt.w * 1.5;
      const hg = ctx.createRadialGradient(cloud.width / 2, -cloud.height * 0.45, 0, cloud.width / 2, -cloud.height * 0.2, R);
      hg.addColorStop(0, `rgba(${P.cloudFill},${isDark ? 0.2 : 0.17})`);
      hg.addColorStop(0.5, `rgba(${P.cloudFill},${isDark ? 0.06 : 0.05})`);
      hg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = hg;
      ctx.fillRect(cloud.width / 2 - R, -cloud.height * 0.2 - R, R * 2, R * 2);

      // Data rays fanning down from the cloud base, with travelling packets.
      const rays = 7;
      ctx.globalAlpha = opt.opacity * (isDark ? 0.42 : 0.36);
      for (let i = 0; i < rays; i++) {
        const fx = cloud.width * (0.16 + 0.68 * (i / (rays - 1)));
        const spread = (fx - cloud.width / 2) / cloud.width;
        const len = cloud.height * (1.5 + 0.55 * Math.sin(t * 0.8 + i * 0.9));
        const ex = fx + spread * cloud.width * 1.5;
        const ey = len;
        const g = ctx.createLinearGradient(fx, 0, ex, ey);
        g.addColorStop(0, `rgba(${P.ray},0.7)`);
        g.addColorStop(0.55, `rgba(${P.ray},0.28)`);
        g.addColorStop(1, `rgba(${P.ray},0)`);
        ctx.strokeStyle = g;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(fx, 0);
        ctx.quadraticCurveTo((fx + ex) / 2, ey * 0.5, ex, ey);
        ctx.stroke();

        const p = (t * 0.28 + i * 0.13) % 1;
        const px = lerp(fx, ex, p);
        const py = lerp(0, ey, p) * (0.5 + 0.5 * p);
        ctx.fillStyle = `rgba(${P.ray},${0.9 * (1 - p)})`;
        ctx.beginPath();
        ctx.arc(px, py, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Volume fill.
      ctx.globalAlpha = opt.opacity;
      const fg = ctx.createLinearGradient(0, -cloud.height, 0, sag);
      fg.addColorStop(0, `rgba(${P.cloudFill},${isDark ? 0.18 : 0.14})`);
      fg.addColorStop(1, `rgba(${P.cloudFill},${isDark ? 0.03 : 0.03})`);
      cloudPath(ctx, cloud, sag);
      ctx.fillStyle = fg;
      ctx.fill();

      // Connected node mesh — one path for all edges.
      ctx.globalAlpha = opt.opacity * 0.95;
      ctx.strokeStyle = P.cloudEdge;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      for (const [a, b] of mesh.edges) {
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
      }
      ctx.stroke();

      // Neon rim.
      ctx.globalAlpha = opt.opacity;
      ctx.save();
      ctx.shadowColor = isDark ? 'rgba(103,232,249,0.95)' : 'rgba(8,145,178,0.4)';
      ctx.shadowBlur = 26;
      ctx.strokeStyle = P.cloudRim;
      ctx.lineWidth = 2.3;
      cloudPath(ctx, cloud, sag);
      ctx.stroke();
      ctx.restore();

      // Mesh nodes: two-pass glow (halo + core) instead of canvas shadows.
      ctx.fillStyle = P.cloudNode;
      for (const p of mesh.nodes) {
        const tw = 0.5 + 0.5 * Math.sin(t * 2.2 + p.p);
        ctx.globalAlpha = opt.opacity * 0.16 * tw;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = opt.opacity * (0.4 + 0.6 * tw);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    // --- Frame ---------------------------------------------------------------
    const startTime = performance.now();

    const drawFrame = (now: number) => {
      const t = (now - startTime) / 1000;
      const P = themePalette();
      const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
      pointer.x += (pointer.tx - pointer.x) * 0.04;
      pointer.y += (pointer.ty - pointer.y) * 0.04;

      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = 'round';

      // Ambient haze.
      const hazeBlobs: [number, number, number, number][] = [
        [0.72, 0.44, 0.62, 0.6],
        [0.2, 0.72, 0.5, 0.4],
        [0.45, 0.32, 0.55, 0.3],
      ];
      for (const [hx, hy, s, a] of hazeBlobs) {
        const g = ctx.createRadialGradient(W * hx, H * hy, 0, W * hx, H * hy, Math.max(W, H) * s * 0.55);
        g.addColorStop(0, `rgba(${P.haze},${a * 0.5})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }

      // Node fabric: resolve positions.
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        a.sx = a.x + pointer.x * 24 * a.z + Math.sin(t * 0.1 + a.x * 0.01) * 4 + Math.sin(t * 0.03) * 22 * a.z;
        a.sy = a.y + pointer.y * 16 * a.z + Math.cos(t * 0.08 + a.y * 0.01) * 4;
      }

      // Links batched into 3 alpha buckets → 3 strokes per frame.
      const buckets: number[][] = [[], [], []];
      const linkLimit = linkDist * linkDist;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.sx - b.sx;
          const dy = a.sy - b.sy;
          const d2 = dx * dx + dy * dy;
          if (d2 < linkLimit) {
            const d = Math.sqrt(d2);
            const bucket = Math.min(2, Math.floor((1 - d / linkDist) * 3));
            buckets[bucket].push(a.sx, a.sy, b.sx, b.sy);
          }
        }
      }
      ctx.lineWidth = 0.6;
      for (let b = 0; b < buckets.length; b++) {
        const seg = buckets[b];
        if (seg.length === 0) {
          continue;
        }
        ctx.strokeStyle = `rgba(${P.link},${0.06 + b * 0.055})`;
        ctx.beginPath();
        for (let i = 0; i < seg.length; i += 4) {
          ctx.moveTo(seg[i], seg[i + 1]);
          ctx.lineTo(seg[i + 2], seg[i + 3]);
        }
        ctx.stroke();
      }

      // Node cores.
      for (const a of nodes) {
        const glow = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * a.ts + a.tw));
        const col = P.node[a.c];
        ctx.fillStyle = col;
        ctx.globalAlpha = (isDark ? 0.16 : 0.22) * glow * a.z;
        ctx.beginPath();
        ctx.arc(a.sx, a.sy, a.r * 2.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = glow * a.z;
        ctx.beginPath();
        ctx.arc(a.sx, a.sy, a.r * a.z * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Data ribbons.
      for (const rb of ribbons) {
        ctx.save();
        ctx.strokeStyle = `rgba(${P.ribbon},${rb.alpha})`;
        ctx.lineWidth = rb.width;
        ctx.setLineDash(rb.dash);
        ctx.lineDashOffset = -t * rb.speed;
        ctx.beginPath();
        for (let x = -40; x <= W + 40; x += 16) {
          const y = rb.yBase + Math.sin((x / W) * Math.PI * 2 * rb.freq + rb.phase + t * 0.15) * rb.amp + pointer.y * 12 * rb.z;
          if (x === -40) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
        ctx.restore();
      }

      // Clouds: distant first, hero last (on top).
      for (let i = clouds.length - 1; i >= 0; i--) {
        drawNetworkCloud(t, P, isDark, clouds[i]);
      }
    };

    // --- Resize --------------------------------------------------------------
    const onResize = () => {
      build();
      rebuildClouds();
    };
    window.addEventListener('resize', onResize);

    // --- Render loop ---------------------------------------------------------
    let rafId = 0;
    let running = true;
    const tick = (now: number) => {
      if (!running) {
        return;
      }
      rafId = requestAnimationFrame(tick);
      if (!visible) {
        return;
      }
      drawFrame(now);
    };
    rafId = requestAnimationFrame(tick);

    this.cleanup = () => {
      running = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', onResize);
      visibilityObserver.disconnect();
      canvas.remove();
    };
  }
}
