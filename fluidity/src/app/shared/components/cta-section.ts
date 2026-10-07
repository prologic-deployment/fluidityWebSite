import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, ArrowRight } from 'lucide-angular';

import { I18nService } from '../../core/services/i18n.service';
import { RevealDirective } from '../directives/reveal.directive';

@Component({
  selector: 'app-cta-section',
  imports: [RouterLink, LucideAngularModule, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="cta section" appReveal>
      <div class="cta-bg" aria-hidden="true">
        <div class="orb orb--a"></div>
        <div class="orb orb--b"></div>
      </div>
      <div class="container cta-inner">
        <h2 class="cta-title">{{ i18n.t('home.cta.title') }}</h2>
        <p class="cta-text">{{ i18n.t('home.cta.text') }}</p>
        <a routerLink="/contact" class="btn btn-primary btn-lg">
          <span>{{ i18n.t('home.cta.action') }}</span>
          <lucide-icon [img]="arrowIcon" size="18" [attr.aria-hidden]="true" />
        </a>
      </div>
    </section>
  `,
  styles: `
    .cta {
      position: relative;
      overflow: clip;
    }

    .cta-bg {
      position: absolute;
      inset: 0;
      background: var(--bg-sunken);
    }

    .orb {
      position: absolute;
      width: 34rem;
      height: 34rem;
      border-radius: 50%;
      filter: blur(90px);
      opacity: 0.5;
    }

    .orb--a {
      top: -12rem;
      inset-inline-start: -8rem;
      background: radial-gradient(circle, rgb(0 133 110 / 0.45), transparent 65%);
      animation: drift 14s ease-in-out infinite alternate;
    }

    .orb--b {
      bottom: -14rem;
      inset-inline-end: -6rem;
      background: radial-gradient(circle, rgb(0 201 167 / 0.35), transparent 65%);
      animation: drift 18s ease-in-out infinite alternate-reverse;
    }

    @keyframes drift {
      from {
        transform: translate3d(0, 0, 0) scale(1);
      }
      to {
        transform: translate3d(3rem, 2rem, 0) scale(1.12);
      }
    }

    .cta-inner {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.25rem;
      text-align: center;
    }

    .cta-title {
      font-size: clamp(2rem, 1.5rem + 2.6vw, 3.2rem);
      font-weight: 700;
      max-width: 46rem;
    }

    .cta-text {
      font-size: 1.125rem;
      color: var(--text-2);
      max-width: 36rem;
    }

    .cta-inner .btn {
      margin-block-start: 0.75rem;
    }
  `,
})
export class CtaSection {
  protected readonly i18n = inject(I18nService);
  protected readonly arrowIcon = ArrowRight;
}
