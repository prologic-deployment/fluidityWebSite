import { Directive, ElementRef, OnDestroy, OnInit, inject, input, numberAttribute } from '@angular/core';

/**
 * Some embedding environments (throttled webviews, suspended renderers) never
 * deliver IntersectionObserver callbacks, which would leave every revealed
 * element stuck at opacity 0. We track IO "health" globally: if no callback
 * has fired anywhere within a short deadline, we force-reveal everything —
 * real browsers fire the first callback within a frame or two, so the
 * scroll-reveal effect is unaffected there.
 */
let ioHealthy = false;
let ioDeadlinePassed = false;
let timerStarted = false;
const waiting: HTMLElement[] = [];

function startFallbackTimer(): void {
  if (timerStarted) {
    return;
  }
  timerStarted = true;
  setTimeout(() => {
    ioDeadlinePassed = true;
    if (!ioHealthy) {
      // IO is broken here; likely a suspended compositor too, where CSS
      // transitions never progress. Reveal instantly, without transitions.
      document.documentElement.classList.add('reveal-instant');
      for (const node of waiting.splice(0)) {
        node.classList.add('reveal-done');
      }
    }
  }, 1200);
}

function register(node: HTMLElement): void {
  if (ioDeadlinePassed && !ioHealthy) {
    // IO is known-broken in this environment: reveal immediately.
    node.classList.add('reveal-done');
    return;
  }
  waiting.push(node);
}

/** True once any IntersectionObserver callback has fired in this page. */
export function isIoHealthy(): boolean {
  return ioHealthy;
}

@Directive({
  selector: '[appReveal]',
  host: { class: 'reveal' },
})
export class RevealDirective implements OnInit, OnDestroy {
  readonly revealDelay = input(0, { transform: numberAttribute, alias: 'appRevealDelay' });

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private observer: IntersectionObserver | null = null;
  private revealed = false;

  ngOnInit(): void {
    const node = this.elementRef.nativeElement;

    const reducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (typeof IntersectionObserver === 'undefined' || reducedMotion) {
      this.reveal(node);
      return;
    }

    node.style.setProperty('--reveal-delay', `${this.revealDelay()}ms`);
    startFallbackTimer();
    register(node);

    this.observer = new IntersectionObserver(
      (entries) => {
        ioHealthy = true;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.reveal(node);
            this.observer?.disconnect();
            this.observer = null;
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    );

    this.observer.observe(node);
  }

  private reveal(node: HTMLElement): void {
    if (this.revealed) {
      return;
    }
    this.revealed = true;
    node.classList.add('reveal-done');
    const index = waiting.indexOf(node);
    if (index !== -1) {
      waiting.splice(index, 1);
    }
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.reveal(this.elementRef.nativeElement);
  }
}
