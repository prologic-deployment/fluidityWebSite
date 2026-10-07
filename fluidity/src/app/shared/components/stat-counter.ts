import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  input,
  numberAttribute,
  signal,
} from '@angular/core';

import { RevealDirective, isIoHealthy } from '../directives/reveal.directive';

@Component({
  selector: 'app-stat-counter',
  imports: [RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stat" appReveal>
      <div class="stat-value">
        <span class="number">{{ display() }}</span
        ><span class="suffix">{{ suffix() }}</span>
      </div>
      <div class="stat-label">{{ label() }}</div>
      @if (note()) {
        <div class="stat-note">{{ note() }}</div>
      }
    </div>
  `,
  styles: `
    .stat {
      text-align: start;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .stat-value {
      font-family: var(--font-display, 'Sora Variable');
      font-size: clamp(2.2rem, 1.6rem + 2vw, 3.2rem);
      font-weight: 700;
      line-height: 1;
      letter-spacing: -0.03em;
      background: var(--grad-brand);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      color: transparent;
    }

    .suffix {
      font-size: 0.65em;
    }

    .stat-label {
      font-weight: 600;
      color: var(--text-1);
      font-size: 0.9375rem;
    }

    .stat-note {
      font-size: 0.75rem;
      color: var(--text-3);
    }
  `,
})
export class StatCounter implements OnInit, OnDestroy {
  readonly value = input.required({ transform: numberAttribute });
  readonly suffix = input<string>('');
  readonly label = input.required<string>();
  readonly note = input<string>('');

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private observer: IntersectionObserver | null = null;
  private readonly current = signal(0);

  readonly display = computed(() => {
    const v = Math.round(this.current());
    // Years (e.g. 2025) render without thousand separators.
    if (this.value() >= 1900 && this.value() <= 2100) {
      return String(v);
    }
    return v.toLocaleString('fr-FR');
  });

  ngOnInit(): void {
    const node = this.elementRef.nativeElement;

    const reducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (typeof IntersectionObserver === 'undefined' || reducedMotion) {
      this.current.set(this.value());
      return;
    }

    // IO-broken environments (suspended webviews): show the final value directly.
    if (isIoHealthy() === false) {
      setTimeout(() => {
        if (!isIoHealthy()) {
          this.current.set(this.value());
        }
      }, 1300);
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.animate();
            this.observer?.disconnect();
            this.observer = null;
          }
        }
      },
      { threshold: 0.4 },
    );
    this.observer.observe(node);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  private animate(): void {
    const target = this.value();
    const duration = 1400;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      this.current.set(target * eased);
      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  }
}
