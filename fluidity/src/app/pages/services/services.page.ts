import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, ArrowRight, Check } from 'lucide-angular';

import { I18nService } from '../../core/services/i18n.service';
import { SeoService } from '../../core/services/seo.service';
import { ServiceItem, ProcessStep } from '../../core/models/site.model';
import { SectionHeading } from '../../shared/components/section-heading';
import { AppIcon } from '../../shared/components/app-icon';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { CtaSection } from '../../shared/components/cta-section';

@Component({
  selector: 'app-services-page',
  imports: [RouterLink, LucideAngularModule, SectionHeading, AppIcon, RevealDirective, CtaSection],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page-hero">
      <div class="container">
        <p class="eyebrow" appReveal>{{ i18n.t('servicesPage.hero.eyebrow') }}</p>
        <h1 appReveal [appRevealDelay]="80">{{ i18n.t('servicesPage.hero.title') }}</h1>
        <p class="lede" appReveal [appRevealDelay]="160">{{ i18n.t('servicesPage.hero.subtitle') }}</p>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="grid">
          @for (service of services(); track service.id; let i = $index) {
            <article class="card" appReveal [appRevealDelay]="(i % 3) * 80">
              <div class="card-top">
                <div class="card-icon">
                  <app-icon [name]="service.icon" />
                </div>
                <span class="card-num">0{{ i + 1 }}</span>
              </div>
              <div class="card-art" aria-hidden="true">
                <img [src]="'images/illustrations/' + service.id + '.svg'" alt="" width="640" height="400" loading="lazy" />
              </div>
              <h2>{{ service.title }}</h2>
              <p>{{ service.description }}</p>
              <ul class="points">
                @for (point of service.points; track point) {
                  <li>
                    <lucide-icon [img]="checkIcon" size="15" [attr.aria-hidden]="true" />
                    <span>{{ point }}</span>
                  </li>
                }
              </ul>
              <a routerLink="/contact" class="card-link">
                {{ i18n.t('home.services.discover') }}
                <lucide-icon [img]="arrowIcon" size="16" [attr.aria-hidden]="true" />
              </a>
            </article>
          }
        </div>
      </div>
    </section>

    <section class="section section-alt">
      <div class="container">
        <app-section-heading
          [eyebrow]="i18n.t('servicesPage.processEyebrow')"
          [title]="i18n.t('servicesPage.processTitle')"
          align="center"
        />
        <ol class="mini-process">
          @for (step of steps(); track step.id; let i = $index) {
            <li appReveal [appRevealDelay]="i * 60">
              <span class="step-num">{{ i + 1 }}</span>
              {{ step.title }}
            </li>
          }
        </ol>
      </div>
    </section>

    <app-cta-section />
  `,
  styles: `
    @use 'tokens' as *;

    .page-hero {
      padding-block: 9rem 3rem;
      background:
        radial-gradient(50% 70% at 80% 10%, rgb(0 201 167 / 0.4), transparent 70%),
        var(--bg);
    }

    .page-hero h1 {
      font-size: clamp(2.2rem, 1.5rem + 3.2vw, 3.5rem);
      font-weight: 800;
      letter-spacing: -0.03em;
      margin-top: 1rem;
    }

    .lede {
      margin-top: 1.25rem;
      font-size: 1.125rem;
      color: var(--text-2);
      max-width: 38rem;
    }

    .grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }

    @media (min-width: 48em) {
      .grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (min-width: 64em) {
      .grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    .card {
      @include card;
      @include hover-lift;
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
    }

    .card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .card-num {
      font-family: var(--font-display, 'Sora Variable');
      font-weight: 700;
      color: var(--text-3);
    }

    .card-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.75rem;
      height: 2.75rem;
      border-radius: 16px;
      background: var(--accent-soft);
      color: var(--accent);
    }

    .card-art {
      margin-top: 1.25rem;
      border-radius: 14px;
      overflow: hidden;
      border: 1px solid var(--border);
      background: var(--bg-sunken);

      img {
        display: block;
        width: 100%;
        height: auto;
      }
    }

    .card h2 {
      font-size: 1.25rem;
      margin-top: 1.25rem;
    }

    .card p {
      margin-top: 0.6rem;
      color: var(--text-2);
      font-size: 0.925rem;
    }

    .points {
      list-style: none;
      margin: 1.25rem 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .points li {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      font-size: 0.9rem;
      color: var(--text-1);
    }

    .points lucide-icon {
      color: var(--teal);
      flex-shrink: 0;
      margin-top: 0.2rem;
    }

    .card-link {
      margin-top: auto;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      color: var(--accent);
      font-weight: 600;
      font-size: 0.925rem;
      text-decoration: none;
    }

    .card-link:hover lucide-icon {
      transform: translateX(4px);
    }

    .card-link lucide-icon {
      transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
    }

    [dir='rtl'] .card-link lucide-icon {
      transform: scaleX(-1);
    }

    .mini-process {
      list-style: none;
      margin: 3rem 0 0;
      padding: 0;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 1rem 2rem;
    }

    .mini-process li {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      font-weight: 600;
      color: var(--text-2);
    }

    .step-num {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.9rem;
      height: 1.9rem;
      border-radius: 50%;
      background: var(--accent-soft);
      color: var(--accent-strong);
      font-size: 0.85rem;
      font-weight: 700;
    }
  `,
})
export class ServicesPage {
  protected readonly i18n = inject(I18nService);
  protected readonly services = computed(() => this.i18n.data<ServiceItem[]>('services') ?? []);
  protected readonly steps = computed(() => this.i18n.data<ProcessStep[]>('process') ?? []);
  protected readonly arrowIcon = ArrowRight;
  protected readonly checkIcon = Check;

  constructor() {
    inject(SeoService).setSeoReactive(() => ({
      title: this.i18n.t('servicesPage.hero.title'),
      description: this.i18n.t('servicesPage.hero.subtitle'),
      path: '/services',
    }));
  }
}
