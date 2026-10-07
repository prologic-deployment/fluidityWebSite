import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  inject,
} from '@angular/core';

/**
 * "Flow field" — the home page's living background, inspired by a reference
 * video of organic glowing drifts over near-black (analyzed in
 * scripts/analyze-video.mjs). Translated to Fluidity's palette: brand green /
 * cyan glow blobs drifting like fluid, twinkling particles, slow ribbon
 * waves, periodic brand-gradient "blooms" and a rare Tunisian-red spark.
 *
 * Dark mode renders the scene near-verbatim on the deep background; light
 * mode keeps the same choreography as a pastel whisper. All motion scales to
 * zero under prefers-reduced-motion (a single static frame is painted).
 */
interface Blob {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  color: [number, number, number];
  alpha: number;
  phase: number;
  wander: number;
}

interface Particle {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  color: [number, number, number];
  baseAlpha: number;
  freq: number;
  phase: number;
}

interface Ribbon {
  yBase: number; // 0..1 of height
  amp: number;
  wavelength: number;
  speed: number;
  phase: number;
  color: [number, number, number];
  alpha: number;
}

interface Bloom {
  x: number;
  y: number;
  startedAt: number;
  color: [number, number, number];
}

const GREEN: [number, number, number] = [0, 165, 131];
const CYAN: [number, number, number] = [34, 211, 238];
const EMERALD: [number, number, number] = [0, 133, 110];
const RED: [number, number, number] = [231, 0, 19];
const BLOOM_PERIOD = 7000;
const BLOOM_LIFE = 2600;

@Component({
  selector: 'app-flow-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<canvas aria-hidden="true"></canvas>`,
  styles: `
    // Fixed to the viewport: the scene is sized to what the user actually
    // sees, stays dense at every scroll position, and never repaints on
    // scroll. It is destroyed with the home page (SPA navigation), so it
    // never bleeds onto other routes.
    :host {
      position: fixed;
      inset: 0;
      display: block;
      overflow: hidden;
      pointer-events: none;
      z-index: 0;
    }

    canvas {
      display: block;
      width: 100%;
      height: 100%;
    }
  `,
})
export class FlowField implements OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private raf = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private framesDrawn = 0;
  private lastT = 0;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private disposed = false;

  private blobs: Blob[] = [];
  private particles: Particle[] = [];
  private ribbons: Ribbon[] = [];
  private blooms: Bloom[] = [];
  private lastBloom = 0;

  private motionScale = 1;
  private dark = true;
  private resizeObserver: ResizeObserver | null = null;
  private themeObserver: MutationObserver | null = null;
  private onVisibility: (() => void) | null = null;

  constructor() {
    afterNextRender(() => this.init());
  }

  private init(): void {
    if (typeof window === 'undefined') return;
    this.canvas = this.host.nativeElement.querySelector('canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) return;

    this.motionScale = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1;
    this.readTheme();
    this.resize();

    const reduced = this.motionScale === 0;
    this.seed(reduced);

    if (reduced) {
      this.drawFrame(0); // one static, representative frame
    } else {
      this.lastT = performance.now();
      this.raf = requestAnimationFrame(this.loop);
      // Suspended webviews never fire rAF — fall back to a timer loop,
      // mirroring the reveal directive's IO-health fallback.
      setTimeout(() => {
        if (!this.disposed && this.framesDrawn === 0) this.startIntervalFallback();
      }, 1200);
    }

    this.resizeObserver = new ResizeObserver(() => {
      this.resize();
      if (this.motionScale === 0) this.drawFrame(0);
    });
    this.resizeObserver.observe(this.host.nativeElement);

    this.themeObserver = new MutationObserver(() => this.readTheme());
    this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });

    this.onVisibility = () => {
      if (!document.hidden && this.motionScale === 1) {
        this.lastT = performance.now();
      }
    };
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  private readTheme(): void {
    const attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'dark' || attr === 'light') {
      this.dark = attr === 'dark';
    } else {
      this.dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
  }

  private resize(): void {
    if (!this.canvas || !this.ctx) return;
    const box = this.host.nativeElement.getBoundingClientRect();
    this.width = Math.max(1, Math.round(box.width));
    this.height = Math.max(1, Math.round(box.height));
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  /** Populate the scene, denser on big screens. */
  private seed(staticScene: boolean): void {
    // Viewport-scaled density: the scene must read as "alive" on a phone
    // (440×987) as well as on a desktop (1440×900).
    const area = (this.width * this.height) / (1440 * 900);
    const blobCount = Math.max(5, Math.round(8 * Math.min(area, 1.5)));
    const particleCount = Math.max(26, Math.round(52 * Math.min(area, 1.5)));

    const blobColors: Array<[number, number, number]> = [GREEN, GREEN, CYAN, CYAN, EMERALD, GREEN, RED];
    this.blobs = Array.from({ length: blobCount }, (_, i) => ({
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      r: 90 + Math.random() * 140,
      vx: (Math.random() - 0.5) * 22,
      vy: (Math.random() - 0.5) * 16,
      color: blobColors[i % blobColors.length],
      alpha: i === blobColors.length - 1 ? 0.30 : 0.16 + Math.random() * 0.1,
      phase: Math.random() * Math.PI * 2,
      wander: 0.2 + Math.random() * 0.3,
    }));

    this.particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      r: 0.8 + Math.random() * 1.5,
      vx: (Math.random() - 0.5) * 26,
      vy: (Math.random() - 0.5) * 18,
      color: Math.random() < 0.75 ? GREEN : CYAN,
      baseAlpha: 0.25 + Math.random() * 0.5,
      freq: 0.4 + Math.random() * 1.4,
      phase: Math.random() * Math.PI * 2,
    }));

    this.ribbons = [
      { yBase: 0.28, amp: 26, wavelength: 520, speed: 0.12, phase: 0, color: GREEN, alpha: 0.10 },
      { yBase: 0.55, amp: 34, wavelength: 680, speed: 0.09, phase: 2.1, color: CYAN, alpha: 0.08 },
      { yBase: 0.78, amp: 22, wavelength: 440, speed: 0.15, phase: 4.4, color: EMERALD, alpha: 0.07 },
    ];

    if (staticScene) {
      // Give the static frame a couple of settled blooms so it isn't empty.
      this.blooms = [
        { x: this.width * 0.3, y: this.height * 0.35, startedAt: 0, color: GREEN },
        { x: this.width * 0.72, y: this.height * 0.62, startedAt: -900, color: CYAN },
      ];
    }
  }

  private loop = (t: number): void => {
    if (this.disposed) return;
    const dt = Math.min((t - this.lastT) / 1000, 0.05);
    this.lastT = t;
    this.step(dt, t);
    this.drawFrame(t);
    this.raf = requestAnimationFrame(this.loop);
  };

  private startIntervalFallback(): void {
    if (this.intervalId !== null || this.disposed) return;
    this.intervalId = setInterval(() => {
      if (this.disposed) return;
      const t = performance.now();
      const dt = Math.min((t - this.lastT) / 1000, 0.05);
      this.lastT = t;
      this.step(dt, t);
      this.drawFrame(t);
    }, 33);
  }

  private step(dt: number, t: number): void {
    const s = this.motionScale;
    for (const b of this.blobs) {
      b.phase += dt * b.wander * s;
      b.x += (b.vx + Math.cos(b.phase) * 12) * dt * s;
      b.y += (b.vy + Math.sin(b.phase * 1.3) * 10) * dt * s;
      this.wrap(b, b.r);
    }
    for (const p of this.particles) {
      p.x += p.vx * dt * s;
      p.y += (p.vy + Math.sin(t / 900 + p.phase) * 4) * dt * s;
      this.wrap(p, 4);
    }
    for (const rb of this.ribbons) {
      rb.phase += dt * rb.speed * s;
    }
    this.blooms = this.blooms.filter((bl) => t - bl.startedAt < BLOOM_LIFE);
    if (t - this.lastBloom > BLOOM_PERIOD && this.blobs.length) {
      this.lastBloom = t;
      const host = this.blobs[Math.floor(Math.random() * this.blobs.length)];
      const color = Math.random() < 0.12 ? RED : Math.random() < 0.5 ? GREEN : CYAN;
      this.blooms.push({ x: host.x, y: host.y, startedAt: t, color });
    }
  }

  private wrap(item: { x: number; y: number }, margin: number): void {
    if (item.x < -margin) item.x = this.width + margin;
    if (item.x > this.width + margin) item.x = -margin;
    if (item.y < -margin) item.y = this.height + margin;
    if (item.y > this.height + margin) item.y = -margin;
  }

  private drawFrame(t: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    this.framesDrawn++;

    ctx.clearRect(0, 0, this.width, this.height);

    // Compositing: additive glow on the dark scene, plain translucency on light.
    ctx.globalCompositeOperation = this.dark ? 'lighter' : 'source-over';

    // Glow blobs.
    for (const b of this.blobs) {
      const [r, g, bl] = b.color;
      const alpha = this.dark ? b.alpha : b.alpha * 0.35;
      const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      grad.addColorStop(0, `rgba(${r},${g},${bl},${alpha})`);
      grad.addColorStop(0.55, `rgba(${r},${g},${bl},${alpha * 0.45})`);
      grad.addColorStop(1, `rgba(${r},${g},${bl},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ribbon waves.
    for (const rb of this.ribbons) {
      const [r, g, bl] = rb.color;
      const y0 = rb.yBase * this.height;
      ctx.strokeStyle = `rgba(${r},${g},${bl},${this.dark ? rb.alpha : rb.alpha * 0.8})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      const stepX = Math.max(24, this.width / 40);
      for (let x = -stepX; x <= this.width + stepX; x += stepX) {
        const y =
          y0 +
          Math.sin((x + rb.phase * 900) / (rb.wavelength / (Math.PI * 2))) * rb.amp +
          Math.sin((x + rb.phase * 500) / (rb.wavelength / (Math.PI * 4))) * rb.amp * 0.4;
        if (x <= 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Twinkling particles.
    for (const p of this.particles) {
      const [r, g, bl] = p.color;
      const tw = 0.55 + 0.45 * Math.sin(t / 1000 * p.freq * Math.PI * 2 + p.phase);
      const alpha = p.baseAlpha * tw * (this.dark ? 1 : 0.5);
      ctx.fillStyle = `rgba(${r},${g},${bl},${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Blooms: expanding flashes riding an existing blob's position.
    for (const bl of this.blooms) {
      const age = (t - bl.startedAt) / BLOOM_LIFE;
      if (age < 0 || age > 1) continue;
      const eased = 1 - Math.pow(1 - age, 2);
      const radius = 40 + eased * Math.min(this.width, this.height) * 0.55;
      const alpha = (1 - age) * (this.dark ? 0.22 : 0.10);
      const [r, g, b2] = bl.color;
      const grad = ctx.createRadialGradient(bl.x, bl.y, 0, bl.x, bl.y, radius);
      grad.addColorStop(0, `rgba(${r},${g},${b2},${alpha})`);
      grad.addColorStop(1, `rgba(${r},${g},${b2},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(bl.x, bl.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
  }

  ngOnDestroy(): void {
    this.disposed = true;
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.themeObserver?.disconnect();
    this.themeObserver = null;
    if (this.onVisibility) {
      document.removeEventListener('visibilitychange', this.onVisibility);
      this.onVisibility = null;
    }
  }
}
