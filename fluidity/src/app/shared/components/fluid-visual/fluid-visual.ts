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

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(width, height);
    stage.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(-1.5, 0, 14);
    camera.lookAt(0, 0, 0);

    // --- Scene scale -----------------------------------------------------------
    const isLow = this.density() === 'low';
    const chaosCount = isLow ? 420 : 900;
    const streamCount = isLow ? 4 : 6;
    const perStream = isLow ? 70 : 120;
    const ribbonCount = isLow ? 0 : 4;
    const shardCount = isLow ? 14 : 24;
    const sparkCount = isLow ? 26 : 60;

    const accent = new THREE.Color('#00a583');
    const teal = new THREE.Color('#00c9a7');
    const pink = new THREE.Color('#e879f9');

    const disposables: { dispose(): void }[] = [];

    // Soft radial glow texture, generated once and shared by halo + sparks.
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

    // ---------------------------------------------------------------------------
    // 1. Chaos field — turbulence-driven particle storm on the left
    // ---------------------------------------------------------------------------
    const chaosPositions = new Float32Array(chaosCount * 3);
    const chaosSeeds = new Float32Array(chaosCount * 4); // x, y, z, phase
    const chaosColors = new Float32Array(chaosCount * 3);
    for (let i = 0; i < chaosCount; i++) {
      const sx = -11 - Math.random() * 4.5;
      const sy = (Math.random() - 0.5) * 11;
      const sz = (Math.random() - 0.5) * 7;
      const ph = Math.random() * Math.PI * 2;
      chaosSeeds[i * 4] = sx;
      chaosSeeds[i * 4 + 1] = sy;
      chaosSeeds[i * 4 + 2] = sz;
      chaosSeeds[i * 4 + 3] = ph;

      // Static tint: hot pink near the gate, cold indigo deep in the storm.
      const heat = Math.min(Math.abs(sx + 4) / 6, 1);
      chaosColors[i * 3] = pink.r + (accent.r - pink.r) * heat;
      chaosColors[i * 3 + 1] = pink.g + (accent.g - pink.g) * heat;
      chaosColors[i * 3 + 2] = pink.b + (accent.b - pink.b) * heat;
    }
    const chaosGeometry = new THREE.BufferGeometry();
    chaosGeometry.setAttribute('position', new THREE.BufferAttribute(chaosPositions, 3));
    chaosGeometry.setAttribute('color', new THREE.BufferAttribute(chaosColors, 3));
    const chaosMaterial = new THREE.PointsMaterial({
      size: isLow ? 0.06 : 0.075,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    scene.add(new THREE.Points(chaosGeometry, chaosMaterial));
    disposables.push(chaosGeometry, chaosMaterial);

    // ---------------------------------------------------------------------------
    // 2. The Gate — pulsing gradient ring at x = -4
    // ---------------------------------------------------------------------------
    const gateGroup = new THREE.Group();
    gateGroup.position.x = -4;
    gateGroup.rotation.y = Math.PI / 2;
    scene.add(gateGroup);

    const gateRings: import('three').Mesh[] = [];
    const gateRadii = [3.1, 2.7, 2.3];
    for (let i = 0; i < gateRadii.length; i++) {
      const geometry = new THREE.TorusGeometry(gateRadii[i], 0.016 + 0.006 * i, 8, 96);
      const material = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? accent : teal,
        transparent: true,
        opacity: 0.55 - i * 0.12,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(geometry, material);
      gateGroup.add(ring);
      gateRings.push(ring);
      disposables.push(geometry, material);
    }

    const gateGlowGeometry = new THREE.RingGeometry(2.0, 3.3, 48);
    const gateGlowMaterial = new THREE.MeshBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0.05,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const gateGlow = new THREE.Mesh(gateGlowGeometry, gateGlowMaterial);
    gateGroup.add(gateGlow);
    disposables.push(gateGlowGeometry, gateGlowMaterial);

    // ---------------------------------------------------------------------------
    // 3. Laminar streams — calm ribbons of particles converging toward the core
    // ---------------------------------------------------------------------------
    const streamAttributes: import('three').BufferAttribute[] = [];
    const streamSeeds: { offsets: Float32Array; yOff: number; zOff: number; phase: number; speed: number }[] = [];
    for (let s = 0; s < streamCount; s++) {
      const positions = new Float32Array(perStream * 3);
      const offsets = new Float32Array(perStream);
      for (let i = 0; i < perStream; i++) {
        offsets[i] = i / perStream;
      }

      const geometry = new THREE.BufferGeometry();
      const attribute = new THREE.BufferAttribute(positions, 3);
      geometry.setAttribute('position', attribute);

      const mix = s / Math.max(streamCount - 1, 1);
      const material = new THREE.PointsMaterial({
        size: isLow ? 0.05 : 0.065,
        color: accent.clone().lerp(teal, mix),
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      });

      scene.add(new THREE.Points(geometry, material));
      streamAttributes.push(attribute);
      streamSeeds.push({
        offsets,
        yOff: (Math.random() - 0.5) * 4.5,
        zOff: (Math.random() - 0.5) * 2.5,
        phase: (s / streamCount) * Math.PI * 2,
        speed: 0.055 + Math.random() * 0.05,
      });
      disposables.push(geometry, material);
    }

    // ---------------------------------------------------------------------------
    // 4. The Cloud — breathing cumulus on the right (keeps the old core's colors:
    //    teal solid masses + accent wireframe + teal halo)
    // ---------------------------------------------------------------------------
    const coreGroup = new THREE.Group();
    coreGroup.position.set(6.2, 0, 0);
    scene.add(coreGroup);

    const cloudGroup = new THREE.Group();
    coreGroup.add(cloudGroup);

    const puffGeometry = new THREE.SphereGeometry(1, 28, 20);
    const puffMaterial = new THREE.MeshBasicMaterial({
      color: teal,
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const puffWireMaterial = new THREE.MeshBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0.22,
      wireframe: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    disposables.push(puffGeometry, puffMaterial, puffWireMaterial);

    // Classic cumulus silhouette: big center, shoulders, crest, drifting edges.
    const puffs: { mesh: import('three').Mesh; radius: number; y: number; phase: number }[] = [];
    const puffLayout: [number, number, number][] = [
      [0, 0, 1.15], [-1.25, -0.2, 0.85], [1.3, -0.1, 0.95],
      [-2.1, -0.5, 0.55], [2.2, -0.45, 0.5], [-0.15, 0.85, 0.8],
      [0.95, 0.6, 0.55], [-0.5, -0.7, 0.6], [0.7, -0.65, 0.55],
    ];
    for (let i = 0; i < puffLayout.length; i++) {
      const [x, y, r] = puffLayout[i];
      const mesh = new THREE.Mesh(puffGeometry, puffMaterial);
      mesh.position.set(x, y, 0);
      mesh.scale.setScalar(r);
      cloudGroup.add(mesh);
      puffs.push({ mesh, radius: r, y, phase: (i / puffLayout.length) * Math.PI * 2 });
      // Accent wireframe over the three main masses keeps the crystalline feel;
      // parented to the puff so it tracks its breathing.
      if (i < 3) {
        const wire = new THREE.Mesh(puffGeometry, puffWireMaterial);
        wire.scale.setScalar(1.22);
        mesh.add(wire);
      }
    }

    const haloTexture = makeGlowTexture();
    const coreHaloMaterial = new THREE.SpriteMaterial({
      map: haloTexture,
      color: teal,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const coreHalo = new THREE.Sprite(coreHaloMaterial);
    coreHalo.scale.set(8, 8, 1);
    coreGroup.add(coreHalo);
    disposables.push(haloTexture, coreHaloMaterial);

    // ---------------------------------------------------------------------------
    // 5. Glass shards orbiting the cloud
    // ---------------------------------------------------------------------------
    const shards: { mesh: import('three').Mesh; radius: number; speed: number; phase: number; tilt: number; spin: number }[] = [];
    const blue = new THREE.Color('#2ed3b7');
    for (let i = 0; i < shardCount; i++) {
      const size = 0.12 + Math.random() * 0.2;
      const geometry = new THREE.TetrahedronGeometry(size);
      const material = new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? teal : i % 3 === 1 ? accent : blue,
        transparent: true,
        opacity: 0.5 + Math.random() * 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geometry, material);
      coreGroup.add(mesh);
      shards.push({
        mesh,
        radius: 2.4 + Math.random() * 2.4,
        speed: 0.15 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2,
        tilt: (Math.random() - 0.5) * 1.6,
        spin: 0.4 + Math.random() * 0.8,
      });
      disposables.push(geometry, material);
    }

    // ---------------------------------------------------------------------------
    // 6. Ribbon lines threading from gate toward core
    // ---------------------------------------------------------------------------
    const ribbonLines: import('three').Line[] = [];
    const ribbonSeeds: { yAmp: number; zAmp: number; phase: number; freq: number }[] = [];
    for (let r = 0; r < ribbonCount; r++) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(64 * 3), 3));
      const material = new THREE.LineBasicMaterial({
        color: r % 2 === 0 ? 0x7c8cf0 : 0x2ed3b7,
        transparent: true,
        opacity: 0.14,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const line = new THREE.Line(geometry, material);
      scene.add(line);
      ribbonLines.push(line);
      ribbonSeeds.push({
        yAmp: 0.8 + Math.random() * 2.2,
        zAmp: 0.6 + Math.random() * 1.4,
        phase: (r / ribbonCount) * Math.PI * 2,
        freq: 2 + Math.random() * 2,
      });
      disposables.push(geometry, material);
    }

    // ---------------------------------------------------------------------------
    // 7. Spark sprites that ignite at the gate and ride the streams
    // ---------------------------------------------------------------------------
    const sparkTexture = makeGlowTexture();
    disposables.push(sparkTexture);
    const sparks: { sprite: import('three').Sprite; offset: number; lane: number; speed: number }[] = [];
    for (let i = 0; i < sparkCount; i++) {
      const material = new THREE.SpriteMaterial({
        map: sparkTexture,
        color: i % 2 === 0 ? 0x8b9bf1 : 0x2ed3b7,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(material);
      const scale = 0.25 + Math.random() * 0.35;
      sprite.scale.set(scale, scale, 1);
      scene.add(sprite);
      sparks.push({ sprite, offset: Math.random(), lane: Math.random(), speed: 0.08 + Math.random() * 0.1 });
      disposables.push(material);
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
    const onResize = () => {
      const w = stage.clientWidth || 1;
      const h = stage.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

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

      // 1. Chaos storm: turbulent jitter around each seed position.
      const cAttr = chaosGeometry.getAttribute('position') as import('three').BufferAttribute;
      const cArr = cAttr.array as Float32Array;
      for (let i = 0; i < chaosCount; i++) {
        const i4 = i * 4;
        const i3 = i * 3;
        const ph = chaosSeeds[i4 + 3];
        cArr[i3] = chaosSeeds[i4] + Math.sin(t * (0.6 + (ph % 1)) + ph * 3.1) * 0.9;
        cArr[i3 + 1] = chaosSeeds[i4 + 1] + Math.cos(t * (0.5 + (ph % 0.7)) + ph * 2.3) * 0.9;
        cArr[i3 + 2] = chaosSeeds[i4 + 2] + Math.sin(t * 0.8 + ph * 4.7) * 0.6;
      }
      cAttr.needsUpdate = true;

      // 2. Gate: rings pulse and rotate at slightly different rates.
      for (let i = 0; i < gateRings.length; i++) {
        gateRings[i].rotation.z = t * (0.1 + i * 0.06) * (i % 2 === 0 ? 1 : -1);
        (gateRings[i].material as import('three').MeshBasicMaterial).opacity =
          (0.55 - i * 0.12) * (0.75 + 0.25 * Math.sin(t * 1.2 + i * 2.1));
      }
      gateGlow.rotation.z = t * 0.05;
      (gateGlow.material as import('three').MeshBasicMaterial).opacity = 0.05 + 0.025 * Math.sin(t * 0.9);

      // 3. Laminar streams: particles glide from gate to core on smooth curves.
      for (let s = 0; s < streamAttributes.length; s++) {
        const data = streamSeeds[s];
        const array = streamAttributes[s].array as Float32Array;
        for (let i = 0; i < data.offsets.length; i++) {
          const u = (data.offsets[i] + t * data.speed) % 1;
          const i3 = i * 3;
          array[i3] = -4 + u * 10.2; // gate x=-4 → core x=6.2
          array[i3 + 1] =
            data.yOff * (1 - u) +
            Math.sin(u * Math.PI * 2 + t * 0.7 + data.phase) * 0.5 * (1 - u) +
            Math.sin(u * Math.PI) * 0.3;
          array[i3 + 2] =
            data.zOff * (1 - u) +
            Math.cos(u * Math.PI * 1.5 + t * 0.5 + data.phase) * 0.4 * (1 - u);
        }
        streamAttributes[s].needsUpdate = true;
      }

      // 4. Cloud: slow yaw drift, gentle bob, per-puff breathing.
      cloudGroup.rotation.y = t * 0.1;
      coreGroup.position.y = Math.sin(t * 0.6) * 0.25;
      for (const puff of puffs) {
        const breathe = 1 + 0.05 * Math.sin(t * 1.3 + puff.phase);
        puff.mesh.scale.setScalar(puff.radius * breathe);
        puff.mesh.position.y = puff.y + 0.08 * Math.sin(t * 0.8 + puff.phase);
      }

      // 5. Shards orbit on tilted ellipses while tumbling.
      for (const shard of shards) {
        const a = t * shard.speed + shard.phase;
        shard.mesh.position.set(
          Math.cos(a) * shard.radius,
          Math.sin(a * 0.9 + shard.tilt) * shard.radius * 0.55,
          Math.sin(a) * shard.radius * 0.4,
        );
        shard.mesh.rotation.x = t * shard.spin;
        shard.mesh.rotation.y = t * shard.spin * 0.7;
      }

      // 6. Ribbon lines flow from gate toward core.
      for (let r = 0; r < ribbonLines.length; r++) {
        const data = ribbonSeeds[r];
        const attr = ribbonLines[r].geometry.getAttribute('position') as import('three').BufferAttribute;
        const arr = attr.array as Float32Array;
        const count = arr.length / 3;
        for (let i = 0; i < count; i++) {
          const u = i / (count - 1);
          const i3 = i * 3;
          arr[i3] = -4 + u * 10.2;
          arr[i3 + 1] =
            Math.sin(u * Math.PI * data.freq + t * 0.35 + data.phase) * data.yAmp * (1 - u * 0.5) +
            Math.sin(u * Math.PI) * 0.4;
          arr[i3 + 2] =
            Math.cos(u * Math.PI * data.freq * 0.5 + t * 0.3 + data.phase) * data.zAmp * (1 - u * 0.5);
        }
        attr.needsUpdate = true;
      }

      // 7. Sparks ignite at the gate, brighten, then fade into the core.
      for (const spark of sparks) {
        const u = (spark.offset + t * spark.speed) % 1;
        spark.sprite.position.set(
          -4 + u * 10.2,
          Math.sin(u * Math.PI * 2 + spark.lane * Math.PI * 2) * 0.9 * (1 - u),
          Math.cos(u * Math.PI + spark.lane * 5) * 0.8 * (1 - u),
        );
        (spark.sprite.material as import('three').SpriteMaterial).opacity = Math.sin(u * Math.PI) * 0.9;
      }

      // Camera: gentle breathing drift + pointer parallax.
      camera.position.x += (-1.5 + pointerX * 0.5 + Math.sin(t * 0.05) * 0.4 - camera.position.x) * 0.02;
      camera.position.y += (-pointerY * 0.35 + Math.cos(t * 0.04) * 0.25 - camera.position.y) * 0.02;
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
