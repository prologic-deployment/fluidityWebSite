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
 * "The Flow Engine" — full-hero WebGL scene.
 *
 * A metaphor for what Fluidity does: a turbulent, chaotic particle storm on
 * the left gets pulled through a pulsing gradient gate into calm laminar
 * streams that converge into a living animated cloud on the right.
 */
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

    // Defer the heavy WebGL work until the visual is actually near the viewport.
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
      void this.initScene(stage);
    });
  }

  private async initScene(stage: HTMLElement): Promise<void> {
    let THREE: typeof import('three');
    try {
      THREE = await import('three');
    } catch {
      this.fallback.set(true);
      return;
    }

    const width = stage.clientWidth || 1;
    const height = stage.clientHeight || 1;

    let renderer: import('three').WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    } catch {
      this.fallback.set(true);
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.density() === 'low' ? 1.25 : 1.5));
    renderer.setSize(width, height);
    stage.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(-1.5, 0, 14);
    camera.lookAt(0, 0, 0);

    // --- Scene scale -----------------------------------------------------------
    // This scene is now a calm cloud-sky background, not the pipeline diagram it
    // used to be. Motion: slow horizontal drift, gentle camera breathing, one
    // readable focal cloud slightly behind the copy, distant cloud silhouettes
    // and a soft light horizon.
    const isLow = this.density() === 'low';
    // Lower silhouette sampling on small viewports: the shapes are smaller
    // on screen, so the curve detail would not be visible anyway.
    const SIL_SAMPLES = isLow ? 100 : 160;

    const accent = new THREE.Color('#00a583');
    const teal = new THREE.Color('#00c9a7');
    const mint = new THREE.Color('#a2efd0');
    const deep = new THREE.Color('#0b1020');

    const disposables: { dispose(): void }[] = [];

    // Soft radial glow texture, generated once and shared by all bloom sprites.
    const makeGlowTexture = (): import('three').CanvasTexture => {
      const size = 128;
      const cnv = document.createElement('canvas');
      cnv.width = size;
      cnv.height = size;
      const ctx = cnv.getContext('2d')!;
      const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.28)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      return new THREE.CanvasTexture(cnv);
    };

    // Build a row of overlapping billow arcs along a flat base line, wide
    // enough to read as a band of hills and flatter than the hero cloud so
    // the background reads as a sky, not as the centerpiece.
    const cloudPuffs = (seed: number, width: number, height: number): { arcs: [number, number, number][]; base: number } => {
      let s = seed;
      const next = () => {
        s = (s * 16807) % 2147483647;
        return s / 2147483647;
      };
      const base = -height * 0.42;
      const arcs: [number, number, number][] = [];
      const left = -width * 0.5;
      const right = width * 0.5;
      let cx = left;
      while (cx < right) {
        const r = (0.5 + next() * 0.9) * height * 0.5;
        arcs.push([cx, base, r]);
        cx += r * (0.72 + next() * 0.45);
      }
      return { arcs, base };
    };

    // Union silhouette of the puff arcs: for every x take the tallest arc
    // covering it, so overlapping semicircles merge into one clean closed
    // polygon (left to right along the top, closed along the base line).
    // Replaces the old absarc stitching, which self-intersected as soon as
    // the arcs were not in a strict angular order.
    const cloudSilhouette = (
      arcs: [number, number, number][],
      base: number,
      margin = 0,
      samples = 160,
      sagFrac = 0,
    ): import('three').Vector2[] => {
      let left = Infinity;
      let right = -Infinity;
      for (const [ax, , r0] of arcs) {
        const r = Math.max(r0 - margin, 0.01);
        left = Math.min(left, ax - r);
        right = Math.max(right, ax + r);
      }
      if (!Number.isFinite(left) || right <= left) {
        return [];
      }
      const topOf = (x: number): number => {
        let y = base;
        for (const [ax, , r0] of arcs) {
          const r = Math.max(r0 - margin, 0.01);
          const dx = x - ax;
          if (Math.abs(dx) < r) {
            const top = base + Math.sqrt(r * r - dx * dx);
            if (top > y) y = top;
          }
        }
        return y;
      };
      const pts: import('three').Vector2[] = [new THREE.Vector2(left, base)];
      let maxTop = base;
      for (let i = 1; i < samples; i++) {
        const x = left + ((right - left) * i) / samples;
        const y = topOf(x);
        if (y > maxTop) maxTop = y;
        pts.push(new THREE.Vector2(x, y));
      }
      pts.push(new THREE.Vector2(right, base));
      // Floating shapes (the focal cloud) close along a gently sagging
      // underside instead of a flat line, so no straight base edge shows
      // against the sky. Grounded shapes (the hills) keep the flat base.
      if (sagFrac > 0 && maxTop > base) {
        const sag = (maxTop - base) * sagFrac;
        for (let i = samples - 1; i >= 1; i--) {
          const x = left + ((right - left) * i) / samples;
          const t = (x - left) / (right - left);
          pts.push(new THREE.Vector2(x, base - sag * Math.sin(Math.PI * t)));
        }
      }
      return pts;
    };

    function makeCloudGeometry(arcs: [number, number, number][], base: number, margin = 0.06, sagFrac = 0): import('three').BufferGeometry {
      const pts = cloudSilhouette(arcs, base, margin, SIL_SAMPLES, sagFrac);
      const shape = new THREE.Shape(pts.map((p) => new THREE.Vector2(p.x, p.y)));
      return new THREE.ShapeGeometry(shape);
    }

    // The same silhouette as a line loop for the crisp rim on the near and
    // focal clouds. Points stay local: the mesh carries position and scale,
    // so fill and rim always line up exactly.
    function focusOutlinePts(arcs: [number, number, number][], base: number, margin = 0.05, sagFrac = 0): import('three').BufferGeometry {
      const g = new THREE.BufferGeometry();
      g.setFromPoints(cloudSilhouette(arcs, base, margin, SIL_SAMPLES, sagFrac).map((p) => new THREE.Vector3(p.x, p.y, 0)));
      return g;
    }

    // --- Pointer parallax ------------------------------------------------------
    let pointerX = 0;
    let pointerY = 0;
    const onPointerMove = (event: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointerY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    // --- Pause when off-screen -------------------------------------------------
    let visible = true;
    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
      },
      { threshold: 0 },
    );
    visibilityObserver.observe(stage);

    // --- Resize ----------------------------------------------------------------
    let currentW = width;
    let currentH = height;
    const onResize = () => {
      const w = stage.clientWidth || 1;
      const h = stage.clientHeight || 1;
      currentW = w;
      currentH = h;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      rebuildCloudBackground();
    };
    window.addEventListener('resize', onResize);

    // --- Cloud background scene ------------------------------------------------
    // A wide, soft background: distant cloud hills drift slowly, a focal cloud
    // sits behind the headline, and a faint haze lights the horizon. Dark theme
    // gets a deeper sky with a soft-horizon glow; light theme gets a paler
    // sky with a gentle warm horizon.
    let cloudBgGroup: import('three').Group;
    let farLayer: import('three').Mesh;
    let nearLayer: import('three').Mesh;
    let focalCloud: import('three').Mesh;
    let focalOutline: import('three').LineLoop;
    let horizonGlow: import('three').Sprite;
    let focalGlow: import('three').Sprite;
    let nearOutline: import('three').LineLoop;
    let driftT = 0;
    // World units per design pixel, measured at the focal plane (z = -10).
    // The camera sits at z = 14 with a 50 deg FOV, so the scene must not use
    // raw pixel coordinates or everything falls outside the frustum.
    let u = 1;

    const rebuildCloudBackground = () => {
      // Dispose the previous build first: resize triggers a rebuild.
      for (const d of disposables) {
        d.dispose();
      }
      disposables.length = 0;
      if (cloudBgGroup) {
        scene.remove(cloudBgGroup);
      }
      const w = currentW || 1;
      const h = currentH || 1;
      u = (2 * 24 * Math.tan(25 * (Math.PI / 180))) / h;
      cloudBgGroup = new THREE.Group();
      scene.add(cloudBgGroup);

      const focal = new THREE.Color('#9fd9c4');
      const rim = new THREE.Color('#22d3ee');

      // Distant cloud hills: faint teal/cyan silhouettes, low opacity.
      const far = cloudPuffs(7, w * 3.0, h * 0.55);
      const farGeo = makeCloudGeometry(far.arcs, far.base, 0.18);
      const farMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color('#2b6f8c'),
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.NormalBlending,
      });
      farLayer = new THREE.Mesh(farGeo, farMat);
      farLayer.position.set(0, 0, -18);
      farLayer.scale.setScalar(Math.min(1, (w / 1200) * 0.55 + 0.45) * u);
      cloudBgGroup.add(farLayer);
      disposables.push(farGeo, farMat);

      // Near clouds: soft hills rolling across the bottom of the frame.
      const near = cloudPuffs(13, w * 3.6, h * 0.75);
      const nearGeo = makeCloudGeometry(near.arcs, near.base, 0.08);
      const nearMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color('#3b8ba6'),
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.NormalBlending,
      });
      nearLayer = new THREE.Mesh(nearGeo, nearMat);
      nearLayer.position.set(0, 0, -14);
      nearLayer.scale.setScalar(Math.min(1, (w / 1200) * 0.8 + 0.4) * u);
      cloudBgGroup.add(nearLayer);
      disposables.push(nearGeo, nearMat);

      // Near cloud outline: crisp horizon rim; the tick loop nudges it
      // slightly in front of the fill each frame.
      const nearOutlineGeo = focusOutlinePts(near.arcs, near.base, 0.04);
      const nearOutlineMat = new THREE.LineBasicMaterial({
        color: new THREE.Color('#7fcfd6'),
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      });
      nearOutline = new THREE.LineLoop(nearOutlineGeo, nearOutlineMat);
      nearOutline.position.set(0, 0, -14);
      nearOutline.scale.copy(nearLayer.scale);
      cloudBgGroup.add(nearOutline);
      disposables.push(nearOutlineGeo, nearOutlineMat);

      // Focal cloud: the readable centerpiece, floating above the horizon on
      // the open right side of the frame. Soft teal fill with a cyan rim;
      // position and scale are driven per-frame by the tick loop.
      const focalPuffs = cloudPuffs(23, w * 0.3, h * 0.46);
      const focalGeo = makeCloudGeometry(focalPuffs.arcs, focalPuffs.base, 0.12, 0.35);
      const focalMat = new THREE.MeshBasicMaterial({
        color: focal,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.NormalBlending,
      });
      focalCloud = new THREE.Mesh(focalGeo, focalMat);
      const rebuildDir = document.documentElement.dir === 'rtl' ? -1 : 1;
      focalCloud.position.set(w * 0.16 * u * rebuildDir, h * 0.16 * u, -16);
      cloudBgGroup.add(focalCloud);
      disposables.push(focalGeo, focalMat);

      const focalOutlineGeo = focusOutlinePts(focalPuffs.arcs, focalPuffs.base, 0.06, 0.35);
      const focalOutlineMat = new THREE.LineBasicMaterial({
        color: rim,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      });
      focalOutline = new THREE.LineLoop(focalOutlineGeo, focalOutlineMat);
      focalOutline.position.copy(focalCloud.position);
      cloudBgGroup.add(focalOutline);
      disposables.push(focalOutlineGeo, focalOutlineMat);

      // Soft halo behind the focal cloud so it reads as a source of light,
      // echoing the glowing-cloud reference. The tick loop follows it.
      const focalGlowTex = makeGlowTexture();
      const focalGlowMat = new THREE.SpriteMaterial({
        map: focalGlowTex,
        color: new THREE.Color('#5fe0d6'),
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      focalGlow = new THREE.Sprite(focalGlowMat);
      cloudBgGroup.add(focalGlow);
      disposables.push(focalGlowTex, focalGlowMat);

      // Horizon glow: soft light bloom across the middle band.
      const glowTex = makeGlowTexture();
      const glowMat = new THREE.SpriteMaterial({
        map: glowTex,
        color: new THREE.Color('#5fe0d6'),
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      horizonGlow = new THREE.Sprite(glowMat);
      horizonGlow.scale.set(w * 1.9 * u, h * 0.7 * u, 1);
      horizonGlow.position.set(0, -h * 0.08 * u, -8);
      cloudBgGroup.add(horizonGlow);
      disposables.push(glowTex, glowMat);

      driftT = 0;
    };

    rebuildCloudBackground();

    // --- Render loop -----------------------------------------------------------
    let rafId = 0;
    let running = true;
    const clock = new THREE.Clock();

    const tick = () => {
      if (!running) {
        return;
      }
      rafId = requestAnimationFrame(tick);
      if (!visible) {
        return;
      }

      const t = clock.getElapsedTime();

      // Cloud sky tick: drift distant + near clouds, breathe the focal cloud,
      // and keep the horizon glow soft. No pipeline-particles anywhere.
      driftT += 0.004;
      if (cloudBgGroup) {
        const w = currentW || 1;
        const h = currentH || 1;
        // Static placement lives in these formulas (and in the initial mesh
        // positions); the sine terms are small deltas on top, so nothing is
        // ever applied twice. Drift spans stay narrower than the layer
        // widths so the hills never expose an edge.
        farLayer.position.x = ((driftT * 0.3) % (w * 0.6)) * u - w * 0.3 * u;
        farLayer.position.y = -h * 0.34 * u + Math.sin(t * 0.05) * 0.15;
        nearLayer.position.x = ((driftT * 0.55) % (w * 2)) * u - w * u;
        nearLayer.position.y = -h * 0.24 * u + Math.sin(t * 0.07 + 1) * 0.2;
        nearOutline.position.copy(nearLayer.position);
        nearOutline.position.z += 0.15;

        const breathe = 1 + 0.02 * Math.sin(t * 0.4);
        const sF = Math.min(1, (w / 1200) * 0.9 + 0.55) * Math.min(1, w / 760);
        // Mirror the focal cloud with the copy when the layout is RTL.
        const dirSign = document.documentElement.dir === 'rtl' ? -1 : 1;
        const fx = (w * 0.16 * u + Math.sin(t * 0.13) * w * 0.015 * u) * dirSign;
        const fy = h * 0.16 * u + Math.sin(t * 0.11 + 1.3) * 0.35;
        focalCloud.position.set(fx, fy, -16);
        focalCloud.scale.setScalar(sF * breathe * u);
        focalOutline.position.set(fx, fy, -15.9);
        focalOutline.scale.setScalar(sF * breathe * u);
        focalGlow.position.set(fx, fy - 1.2, -15.6);
        focalGlow.scale.set((w * 0.3 + 380) * u * 1.4 * sF, h * 0.32 * u * 1.4 * sF, 1);
        focalGlow.material.opacity = 0.3 * (0.85 + 0.15 * Math.sin(t * 0.4));

        const glowPulse = 0.85 + 0.15 * Math.sin(t * 0.3);
        if (horizonGlow.material) {
          horizonGlow.material.opacity = 0.22 * glowPulse;
        }
        horizonGlow.position.y = -h * 0.08 * u + Math.sin(t * 0.06) * 0.3;
      }

      // Camera: very gentle breathing + soft parallax from pointer, never sharp.
      const cxTarget = pointerX * 0.35 + Math.sin(t * 0.03) * 0.3;
      const cyTarget = -pointerY * 0.25 + Math.cos(t * 0.025) * 0.2;
      camera.position.x += (cxTarget - camera.position.x) * 0.015;
      camera.position.y += (cyTarget - camera.position.y) * 0.015;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };
    tick();

    this.cleanup = () => {
      running = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', onResize);
      visibilityObserver.disconnect();
      for (const disposable of disposables) {
        disposable.dispose();
      }
      renderer.dispose();
      renderer.domElement.remove();
    };
  }
}
