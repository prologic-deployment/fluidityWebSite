import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, Compass } from 'lucide-angular';

import { I18nService } from '../../core/services/i18n.service';
import { SeoService } from '../../core/services/seo.service';
import { RevealDirective } from '../../shared/directives/reveal.directive';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink, LucideAngularModule, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="nf">
      <div class="nf-bg" aria-hidden="true"></div>
      <div class="container nf-inner">
        <p class="code" appReveal>404</p>
        <h1 appReveal [appRevealDelay]="80">{{ i18n.t('notFound.title') }}</h1>
        <p class="text" appReveal [appRevealDelay]="160">{{ i18n.t('notFound.text') }}</p>
        <a routerLink="/" class="btn btn-primary btn-lg" appReveal [appRevealDelay]="240">
          {{ i18n.t('notFound.action') }}
        </a>
      </div>
    </section>
  `,
  styles: `
    .nf {
      position: relative;
      min-height: 80vh;
      display: flex;
      align-items: center;
      overflow: clip;
    }

    .nf-bg {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(55% 65% at 25% 30%, rgb(102 126 234 / 0.16), transparent 70%),
        radial-gradient(45% 55% at 75% 70%, rgb(0 201 167 / 0.12), transparent 70%),
        var(--bg);
    }

    .nf-inner {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
      padding-block: 6rem;
    }

    .code {
      font-family: var(--font-display, 'Sora Variable');
      font-size: clamp(5rem, 4rem + 8vw, 9rem);
      font-weight: 800;
      line-height: 1;
      background: var(--grad-brand);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      color: transparent;
    }

    h1 {
      font-size: clamp(1.6rem, 1.3rem + 2vw, 2.4rem);
    }

    .text {
      color: var(--text-2);
      max-width: 32rem;
    }

    .btn {
      margin-top: 1rem;
    }
  `,
})
export class NotFoundPage {
  protected readonly i18n = inject(I18nService);

  constructor() {
    inject(SeoService).setSeoReactive(() => ({
      title: this.i18n.t('notFound.title'),
      description: this.i18n.t('notFound.text'),
      path: '/404',
    }));
  }
}
