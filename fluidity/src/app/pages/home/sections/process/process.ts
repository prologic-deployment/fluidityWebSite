import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { LucideAngularModule, ArrowLeft, ArrowRight, Check, Pause, Play } from 'lucide-angular';

import { I18nService } from '../../../../core/services/i18n.service';
import { ProcessStep } from '../../../../core/models/site.model';
import { SectionHeading } from '../../../../shared/components/section-heading';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';

const STEP_MS = 5000;
const RING_R = 21;
const RING_C = 2 * Math.PI * RING_R;

/**
 * "Notre méthode" as a self-playing stepper: six numbered nodes on a flow
 * rail; every 5 s the next step is selected (looping back to the first).
 * The active node carries a countdown ring showing the time to the next
 * step. Manual interaction (node click, prev/next, keyboard) selects a step
 * immediately and restarts the countdown; the pause button freezes playback.
 */
@Component({
  selector: 'app-process',
  imports: [SectionHeading, RevealDirective, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="process section section-alt" id="process">
      <div class="container">
        <app-section-heading
          [eyebrow]="i18n.t('home.process.eyebrow')"
          [title]="i18n.t('home.process.title')"
          [lede]="i18n.t('home.process.lede')"
        />

        <div class="stepper" appReveal role="tablist" [attr.aria-label]="i18n.t('home.process.title')">
          <div class="stepper-top">
            <div class="rail" aria-hidden="true">
              <div class="rail-fill" [style.width.%]="railProgress()"></div>
            </div>

            <ol class="nodes">
              @for (step of steps(); track step.id; let i = $index) {
                <li class="node-item">
                  <button
                    type="button"
                    role="tab"
                    class="node"
                    [class.node--active]="i === selected()"
                    [class.node--done]="i < selected()"
                    [attr.aria-selected]="i === selected()"
                    [attr.aria-label]="i18n.t('home.process.stepLabel') + ' ' + (i + 1) + ' — ' + step.title"
                    (click)="select(i)"
                  >
                    <span class="node-num">
                      @if (i < selected()) {
                        <lucide-icon [img]="checkIcon" size="14" [attr.aria-hidden]="true" />
                      } @else {
                        0{{ i + 1 }}
                      }
                      @if (i === selected()) {
                        <svg
                          class="ring"
                          viewBox="0 0 56 56"
                          [style.--ring-len]="ringLen + 'px'"
                          aria-hidden="true"
                        >
                          <circle class="ring-bg" cx="28" cy="28" [attr.r]="ringR" />
                          <circle
                            class="ring-fill"
                            cx="28"
                            cy="28"
                            [attr.r]="ringR"
                            [style.stroke-dashoffset]="ringOffset()"
                          />
                        </svg>
                      }
                    </span>
                    <span class="node-title">{{ step.title }}</span>
                  </button>
                </li>
              }
            </ol>
          </div>

          <div class="panel-zone">
            <!-- Keyed by the selected index: Angular re-creates the element on
                 step change, which restarts the entrance animation. -->
            @for (idx of [selected()]; track idx) {
              @if (current(); as step) {
                <article class="panel" role="tabpanel">
                  <span class="panel-index">{{ selected() + 1 }} / {{ steps().length }}</span>
                  <h3>{{ step.title }}</h3>
                  <p>{{ step.description }}</p>
                  <div class="panel-nav">
                    <button
                      type="button"
                      class="pn"
                      (click)="togglePlay()"
                      [attr.aria-pressed]="!playing()"
                      [attr.aria-label]="playing() ? i18n.t('home.process.pause') : i18n.t('home.process.play')"
                    >
                      <lucide-icon [img]="playing() ? pauseIcon : playIcon" size="15" [attr.aria-hidden]="true" />
                    </button>
                    <button
                      type="button"
                      class="pn"
                      (click)="select(selected() - 1)"
                      [attr.aria-label]="i18n.t('home.process.prev')"
                    >
                      <lucide-icon [img]="isRtl() ? arrowRight : arrowLeft" size="16" [attr.aria-hidden]="true" />
                    </button>
                    <button
                      type="button"
                      class="pn"
                      (click)="select(selected() + 1)"
                      [attr.aria-label]="i18n.t('home.process.next')"
                    >
                      <lucide-icon [img]="isRtl() ? arrowLeft : arrowRight" size="16" [attr.aria-hidden]="true" />
                    </button>
                  </div>
                </article>
              }
            }
          </div>
        </div>
      </div>
    </section>
  `,
  styles: `
    @use 'tokens' as *;

    .stepper {
      margin-block-start: $space-7;
      position: relative;
    }

    // --- flow rail ----------------------------------------------------------
    .stepper-top {
      position: relative;
    }

    .rail {
      position: absolute;
      inset-block-start: 1.4rem;
      inset-inline: calc(100% / 6 / 2);
      height: 2px;
      background: var(--border);
      border-radius: $radius-full;
      z-index: 0;
    }

    .rail-fill {
      height: 100%;
      background: var(--grad-brand);
      border-radius: $radius-full;
      transition: width 0.45s cubic-bezier(0.22, 1, 0.36, 1);
    }

    .nodes {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      position: relative;
      z-index: 1;
    }

    .node-item {
      display: flex;
      justify-content: center;
    }

    .node {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: $space-2;
      background: none;
      border: 0;
      padding: 0;
      cursor: pointer;
      font: inherit;
      color: inherit;
    }

    .node-num {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.8rem;
      height: 2.8rem;
      border-radius: $radius-full;
      border: 1px solid var(--border-strong);
      background: var(--surface);
      font-family: var(--font-display, 'Sora Variable');
      font-weight: 700;
      font-size: $font-size-300;
      color: var(--text-3);
      transition: background 0.3s ease, color 0.3s ease, border-color 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease;
    }

    .node:hover .node-num {
      border-color: var(--accent);
      color: var(--accent);
      transform: translateY(-3px);
    }

    .node--done .node-num {
      border-color: var(--accent);
      color: var(--accent);
      background: var(--accent-soft);
    }

    .node--active .node-num {
      background: var(--grad-brand);
      border-color: transparent;
      color: #fff;
      box-shadow: 0 10px 24px -10px rgb(0 133 110 / 0.65);
      transform: translateY(-3px) scale(1.08);
    }

    // Countdown ring on the active node (SVG circle around the number).
    .ring {
      position: absolute;
      inset: -5px;
      width: calc(100% + 10px);
      height: calc(100% + 10px);
      transform: rotate(-90deg);
      pointer-events: none;
    }

    .ring circle {
      fill: none;
      stroke-width: 2.5;
    }

    .ring-bg {
      stroke: var(--border-strong);
      opacity: 0.5;
    }

    .ring-fill {
      stroke: var(--accent);
      stroke-linecap: round;
      stroke-dasharray: var(--ring-len);
      transition: stroke-dashoffset 0.1s linear;
    }

    .node-title {
      font-size: $font-size-200;
      font-weight: 600;
      color: var(--text-3);
      text-align: center;
      max-width: 7rem;
      transition: color 0.3s ease;
    }

    .node--active .node-title,
    .node--done .node-title {
      color: var(--text-1);
    }

    // --- detail panel ---------------------------------------------------------
    .panel-zone {
      margin-block-start: $space-6;
      min-height: 11rem;
    }

    .panel {
      @include card;
      padding: $space-6;
      animation: panel-in 0.45s cubic-bezier(0.22, 1, 0.36, 1);
    }

    @keyframes panel-in {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: none; }
    }

    .panel-index {
      font-family: var(--font-display, 'Sora Variable');
      font-size: $font-size-200;
      font-weight: 700;
      letter-spacing: 0.1em;
      color: var(--accent);
    }

    .panel h3 {
      margin-block-start: $space-2;
      font-size: $font-size-600;
    }

    .panel p {
      margin-block-start: $space-3;
      color: var(--text-2);
      font-size: $font-size-400;
      max-width: 46rem;
    }

    .panel-nav {
      display: flex;
      gap: $space-2;
      margin-block-start: $space-5;
    }

    .pn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.3rem;
      height: 2.3rem;
      border-radius: $radius-full;
      border: 1px solid var(--border-strong);
      background: var(--surface);
      color: var(--text-1);
      cursor: pointer;
      transition: border-color 0.25s ease, color 0.25s ease, opacity 0.25s ease;

      &:hover:not(:disabled) {
        border-color: var(--accent);
        color: var(--accent);
      }

      &:disabled {
        opacity: 0.35;
        cursor: default;
      }
    }

    // --- small screens: horizontal chip scroller ------------------------------
    @media (max-width: 63.94em) {
      .rail {
        display: none;
      }

      .nodes {
        display: flex;
        overflow-x: auto;
        scrollbar-width: none;
        gap: $space-2;
        padding-block-end: $space-2;

        &::-webkit-scrollbar {
          display: none;
        }
      }

      .node-item {
        flex: 0 0 auto;
      }

      .node {
        flex-direction: row;
        gap: $space-2;
        padding: 0.4rem 0.7rem;
        border-radius: $radius-full;
        border: 1px solid var(--border);
        background: var(--surface);
      }

      .node--active {
        border-color: var(--accent);
        background: var(--accent-soft);
      }

      .node-num {
        width: 1.8rem;
        height: 1.8rem;
        font-size: $font-size-200;
      }

      .ring {
        display: none;
      }

      .node-title {
        max-width: none;
        white-space: nowrap;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .panel {
        animation: none;
      }

      .ring-fill {
        transition: none;
      }
    }
  `,
})
export class Process implements OnDestroy {
  protected readonly i18n = inject(I18nService);
  protected readonly steps = computed(() => this.i18n.data<ProcessStep[]>('process') ?? []);
  protected readonly isRtl = computed(() => this.i18n.dir() === 'rtl');

  protected readonly checkIcon = Check;
  protected readonly arrowLeft = ArrowLeft;
  protected readonly arrowRight = ArrowRight;
  protected readonly pauseIcon = Pause;
  protected readonly playIcon = Play;

  protected readonly ringR = RING_R;
  protected readonly ringLen = RING_C;

  protected readonly selected = signal(0);
  protected readonly playing = signal(true);
  /** 0 → 1 countdown fraction within the current step. */
  protected readonly tick = signal(0);

  protected readonly current = computed(() => this.steps()[this.selected()] ?? null);

  /** Rail fills up to the selected node: 0% before the first, 100% at the last. */
  protected readonly railProgress = computed(() => {
    const total = this.steps().length;
    if (total <= 1) return 100;
    return (this.selected() / (total - 1)) * 100;
  });

  /** SVG dash offset for the active node's countdown ring. */
  protected readonly ringOffset = computed(() => {
    const len = 2 * Math.PI * this.ringR;
    const shown = len * (1 - this.tick());
    return `${shown.toFixed(1)}px`;
  });

  private timer: ReturnType<typeof setInterval> | null = null;
  /** Timestamp the current step's 5 s countdown started from. */
  private stepStartedAt = Date.now();

  constructor() {
    // One persistent interval for the whole component lifetime — select()
    // only resets the timestamp, so no timer ever needs restarting (which
    // could race or pile up in throttled environments).
    if (typeof window !== 'undefined') {
      this.stepStartedAt = Date.now();
      this.timer = setInterval(() => {
        if (!this.playing()) return;
        const fraction = (Date.now() - this.stepStartedAt) / STEP_MS;
        const n = this.steps().length;
        if (n && fraction >= 1) {
          this.stepStartedAt = Date.now();
          this.selected.update((v) => (v + 1) % n); // loop back to the first step
        } else {
          this.tick.set(fraction);
        }
      }, 100);
    }
  }

  protected select(index: number): void {
    const n = this.steps().length;
    if (!n) return;
    this.selected.set(((index % n) + n) % n);
    this.stepStartedAt = Date.now(); // restart the countdown from zero
    this.tick.set(0);
  }

  protected togglePlay(): void {
    this.playing.set(!this.playing());
    if (this.playing()) {
      this.stepStartedAt = Date.now();
      this.tick.set(0);
    }
  }

  ngOnDestroy(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
