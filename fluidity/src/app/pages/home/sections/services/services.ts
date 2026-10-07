import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, ArrowLeft, ArrowRight } from 'lucide-angular';

import { I18nService } from '../../../../core/services/i18n.service';
import { ServiceItem } from '../../../../core/models/site.model';
import { SectionHeading } from '../../../../shared/components/section-heading';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';

/**
 * Coverflow services carousel: the focused card sits large and centered while
 * neighbours shrink and fade towards the edges. Navigation loops endlessly in
 * both directions; cards mirror their offsets automatically in RTL. Driven by
 * transforms (not native scroll) so the loop is seamless — swipe, arrow keys,
 * prev/next buttons and clicking a side card all change the focus.
 */
const SCALES = [1, 0.86, 0.74, 0.66] as const;
const OPACITIES = [1, 0.5, 0.22, 0] as const;

@Component({
  selector: 'app-services',
  imports: [RouterLink, LucideAngularModule, SectionHeading, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="services section section-alt" id="services">
      <div class="container">
        <app-section-heading
          [eyebrow]="i18n.t('home.services.eyebrow')"
          [title]="i18n.t('home.services.title')"
          [lede]="i18n.t('home.services.lede')"
        />

        <div class="carousel-head" appReveal>
          <span class="count">{{ activeLabel() }}</span>
          <div class="controls">
            <button
              type="button"
              class="ctrl"
              (click)="prev()"
              [attr.aria-label]="i18n.t('home.services.prev')"
            >
              <lucide-icon [img]="isRtl() ? arrowRight : arrowLeft" size="18" [attr.aria-hidden]="true" />
            </button>
            <button
              type="button"
              class="ctrl"
              (click)="next()"
              [attr.aria-label]="i18n.t('home.services.next')"
            >
              <lucide-icon [img]="isRtl() ? arrowLeft : arrowRight" size="18" [attr.aria-hidden]="true" />
            </button>
          </div>
        </div>
      </div>

      <div
        class="viewport"
        appReveal
        tabindex="0"
        role="group"
        [attr.aria-label]="i18n.t('home.services.title')"
        (pointerdown)="onPointerDown($event)"
        (pointermove)="onPointerMove($event)"
        (pointerup)="onPointerUp($event)"
        (pointerleave)="onPointerUp($event)"
        (keydown.arrowRight)="onArrow(1)"
        (keydown.arrowLeft)="onArrow(-1)"
      >
        <div class="track" #track [style.height.px]="trackHeight() || null">
          @for (service of services(); track service.id; let i = $index) {
            <article
              class="card"
              [class.card--center]="rel(i) === 0"
              [style.transform]="cardTransform(i)"
              [style.opacity]="cardOpacity(i)"
              [style.z-index]="cardZ(i)"
              [style.pointer-events]="cardInteractive(i) ? null : 'none'"
              (click)="onCardClick(i, $event)"
            >
              <div class="card-art" aria-hidden="true">
                <img
                  [src]="'images/illustrations/' + service.id + '.svg'"
                  alt=""
                  width="640"
                  height="400"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div class="card-body">
                <div class="card-top">
                  <span class="card-num">0{{ i + 1 }}</span>
                  <h3>{{ service.title }}</h3>
                </div>
                <p class="desc">{{ service.description }}</p>
                <ul class="points">
                  @for (point of service.points; track point) {
                    <li>{{ point }}</li>
                  }
                </ul>
                <a routerLink="/services" class="card-link">
                  {{ i18n.t('home.services.discover') }}
                  <lucide-icon [img]="arrowIcon" size="16" [attr.aria-hidden]="true" />
                </a>
              </div>
            </article>
          }
        </div>
      </div>

      <div class="container">
        <div class="progress" aria-hidden="true">
          <div class="progress-fill" [style.width.%]="progress()"></div>
        </div>
        <div class="more" appReveal>
          <a routerLink="/services" class="btn btn-ghost">{{ i18n.t('home.services.all') }}</a>
        </div>
      </div>
    </section>
  `,
  styles: `
    @use 'tokens' as *;

    .carousel-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-block-start: 2rem;
    }

    .count {
      font-family: var(--font-display, 'Sora Variable');
      font-size: $font-size-300;
      font-weight: 700;
      color: var(--text-3);
      letter-spacing: 0.08em;
    }

    .controls {
      display: flex;
      gap: $space-2;
    }

    .ctrl {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.6rem;
      height: 2.6rem;
      border-radius: $radius-full;
      border: 1px solid var(--border-strong);
      background: var(--surface);
      color: var(--text-1);
      cursor: pointer;
      transition: border-color 0.25s ease, color 0.25s ease, transform 0.25s ease;

      &:hover {
        border-color: var(--accent);
        color: var(--accent);
        transform: translateY(-2px);
      }
    }

    // 3D stage: shared perspective gives the side cards their coverflow tilt.
    .viewport {
      overflow: hidden;
      perspective: 1400px;
      margin-block-start: $space-4;
      padding-block: $space-2;
      touch-action: pan-y;
      outline: none;

      &:focus-visible {
        box-shadow: inset 0 0 0 2px var(--accent-soft);
        border-radius: $radius-lg;
      }
    }

    .track {
      position: relative;
      // Deterministic fallback until the measured height lands client-side.
      min-height: calc(min(21rem, 82vw) * 0.625 + 15rem);
    }

    .card {
      position: absolute;
      top: 0;
      left: 50%;
      width: min(21rem, 82vw);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      @include card;
      box-shadow: 0 18px 40px -18px rgb(90 110 232 / 0.35);
      transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.4s ease;
      will-change: transform, opacity;
      cursor: pointer;
    }

    .card--center {
      cursor: default;
    }

    .card-art {
      aspect-ratio: 16 / 10;
      background: var(--bg-sunken);
      border-block-end: 1px solid var(--border);
      flex-shrink: 0;

      img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    .card-body {
      display: flex;
      flex-direction: column;
      flex: 1;
      padding: $space-5;
    }

    .card-top {
      display: flex;
      align-items: baseline;
      gap: $space-3;

      h3 {
        font-size: $font-size-500;
      }
    }

    .card-num {
      font-family: var(--font-display, 'Sora Variable');
      font-weight: 700;
      color: var(--accent);
    }

    .desc {
      margin-block-start: $space-3;
      color: var(--text-2);
      font-size: $font-size-300;
    }

    .points {
      list-style: none;
      margin: $space-4 0;
      padding: 0;
      display: flex;
      flex-wrap: wrap;
      gap: $space-2;

      li {
        font-size: $font-size-200;
        padding: 0.25rem 0.6rem;
        border-radius: $radius-full;
        background: var(--accent-soft);
        color: var(--accent-strong);
      }
    }

    .card-link {
      margin-block-start: auto;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      color: var(--accent);
      font-weight: 600;
      font-size: $font-size-300;
      text-decoration: none;

      lucide-icon {
        transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
      }

      &:hover lucide-icon {
        transform: translateX(4px);
      }
    }

    [dir='rtl'] .card-link lucide-icon {
      transform: scaleX(-1);
    }

    [dir='rtl'] .card-link:hover lucide-icon {
      transform: scaleX(-1) translateX(4px);
    }

    .progress {
      margin-block-start: $space-5;
      height: 3px;
      border-radius: $radius-full;
      background: var(--border);
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: var(--grad-brand);
      border-radius: $radius-full;
      transition: width 0.45s cubic-bezier(0.22, 1, 0.36, 1);
    }

    .more {
      display: flex;
      justify-content: center;
      margin-block-start: $space-6;
    }

    @media (prefers-reduced-motion: reduce) {
      .card {
        transition: none;
      }
    }
  `,
})
export class Services implements OnDestroy {
  protected readonly i18n = inject(I18nService);
  protected readonly arrowIcon = ArrowRight;
  protected readonly arrowLeft = ArrowLeft;
  protected readonly arrowRight = ArrowRight;
  protected readonly services = computed(() => this.i18n.data<ServiceItem[]>('services') ?? []);
  protected readonly isRtl = computed(() => this.i18n.dir() === 'rtl');

  private readonly trackRef = viewChild.required<ElementRef<HTMLElement>>('track');

  protected readonly active = signal(0);
  /** Horizontal distance between adjacent card centers, in px. */
  protected readonly spacing = signal(320);
  /** Measured tallest card height so the absolute-positioned stage fits. */
  protected readonly trackHeight = signal(0);

  private pointerStart: { x: number; y: number } | null = null;
  private dragged = false;
  private suppressClick = false;
  private cleanupResize: (() => void) | null = null;

  protected readonly activeLabel = computed(() => {
    const total = this.services().length;
    const current = Math.min(this.active() + 1, total);
    return `${current} / ${total}`;
  });

  /** Loop position indicator: full circle = back at the first card. */
  protected readonly progress = computed(
    () => ((this.active() + 1) / Math.max(this.services().length, 1)) * 100,
  );

  constructor() {
    afterNextRender(() => this.measure());
  }

  /** Signed circular distance from the focused card: -n/2 … +n/2. */
  protected rel(i: number): number {
    const n = this.services().length || 1;
    let d = (((i - this.active()) % n) + n) % n;
    if (d > n / 2) d -= n;
    return d;
  }

  protected cardTransform(i: number): string {
    const d = this.rel(i);
    const x = d * this.spacing() * (this.isRtl() ? -1 : 1);
    const abs = Math.min(Math.abs(d), 3);
    const rot = Math.max(-12, Math.min(12, -d * 7)) * (this.isRtl() ? -1 : 1);
    return `translateX(calc(-50% + ${x.toFixed(1)}px)) scale(${SCALES[abs]}) rotateY(${rot.toFixed(1)}deg)`;
  }

  protected cardOpacity(i: number): number {
    return OPACITIES[Math.min(Math.abs(this.rel(i)), 3)];
  }

  protected cardZ(i: number): number {
    return 20 - Math.abs(this.rel(i));
  }

  protected cardInteractive(i: number): boolean {
    return Math.abs(this.rel(i)) < 3;
  }

  protected next(): void {
    const n = this.services().length;
    if (n) this.active.set((this.active() + 1) % n);
  }

  protected prev(): void {
    const n = this.services().length;
    if (n) this.active.set((this.active() - 1 + n) % n);
  }

  protected onArrow(dir: 1 | -1): void {
    // Arrow keys follow the visual direction, mirrored in RTL.
    if (this.isRtl()) {
      dir === 1 ? this.prev() : this.next();
    } else {
      dir === 1 ? this.next() : this.prev();
    }
  }

  protected focus(i: number): void {
    const n = this.services().length;
    if (n) this.active.set(((i % n) + n) % n);
  }

  protected onCardClick(i: number, ev: MouseEvent): void {
    if (this.suppressClick) {
      this.suppressClick = false;
      return;
    }
    // Clicking a side card brings it to the center instead of navigating.
    if (this.rel(i) !== 0) {
      ev.preventDefault();
      ev.stopPropagation();
      this.focus(i);
    }
  }

  protected onPointerDown(ev: PointerEvent): void {
    this.pointerStart = { x: ev.clientX, y: ev.clientY };
    this.dragged = false;
    this.suppressClick = false;
  }

  protected onPointerMove(ev: PointerEvent): void {
    if (!this.pointerStart) return;
    if (
      Math.abs(ev.clientX - this.pointerStart.x) > 10 ||
      Math.abs(ev.clientY - this.pointerStart.y) > 10
    ) {
      this.dragged = true;
    }
  }

  protected onPointerUp(ev: PointerEvent): void {
    if (!this.pointerStart) return;
    const dx = ev.clientX - this.pointerStart.x;
    this.pointerStart = null;
    if (!this.dragged || Math.abs(dx) < 40) return;
    const forward = this.isRtl() ? dx > 0 : dx < 0;
    if (forward) {
      this.next();
    } else {
      this.prev();
    }
    // The swipe ends over a card — don't let the click also fire.
    this.suppressClick = true;
  }

  private measure(): void {
    const track = this.trackRef().nativeElement;
    const card = track.querySelector<HTMLElement>('.card');
    if (card) this.spacing.set(card.offsetWidth * 0.78);
    const heights = Array.from(track.querySelectorAll<HTMLElement>('.card')).map((c) => c.offsetHeight);
    const max = Math.max(0, ...heights);
    if (max > 0) this.trackHeight.set(max);

    if (!this.cleanupResize && typeof window !== 'undefined') {
      const onResize = () => this.measure();
      window.addEventListener('resize', onResize, { passive: true });
      this.cleanupResize = () => window.removeEventListener('resize', onResize);
    }
  }

  ngOnDestroy(): void {
    this.cleanupResize?.();
    this.cleanupResize = null;
  }
}
