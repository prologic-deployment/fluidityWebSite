import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { LucideAngularModule, Check, ArrowRight } from 'lucide-angular';

import { I18nService } from '../../core/services/i18n.service';
import { SeoService } from '../../core/services/seo.service';
import { SolutionItem } from '../../core/models/site.model';
import { AppIcon } from '../../shared/components/app-icon';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { CtaSection } from '../../shared/components/cta-section';

@Component({
  selector: 'app-solutions-page',
  imports: [LucideAngularModule, AppIcon, RevealDirective, CtaSection],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page-hero">
      <div class="container">
        <p class="eyebrow" appReveal>{{ i18n.t('solutionsPage.hero.eyebrow') }}</p>
        <h1 appReveal [appRevealDelay]="80">{{ i18n.t('solutionsPage.hero.title') }}</h1>
        <p class="lede" appReveal [appRevealDelay]="160">{{ i18n.t('solutionsPage.hero.subtitle') }}</p>
      </div>
    </section>

    <section class="section">
      <div class="container stack">
        @for (solution of solutions(); track solution.id; let i = $index) {
          <article class="solution" appReveal [appRevealDelay]="80">
            <div class="s-head">
              <div class="s-icon">
                <app-icon [name]="solution.icon" />
              </div>
              <div>
                <span class="s-index">0{{ i + 1 }}</span>
                <h2>{{ solution.title }}</h2>
              </div>
            </div>

            <div class="s-art" aria-hidden="true">
              <img [src]="'images/illustrations/solution-' + solution.id + '.svg'" alt="" width="640" height="400" loading="lazy" />
            </div>

            <div class="s-grid">
              <div class="s-block s-block--problem">
                <span class="s-label">{{ i18n.t('home.solutions.problemLabel') }}</span>
                <p>{{ solution.problem }}</p>
              </div>
              <div class="s-block s-block--solution">
                <span class="s-label">{{ i18n.t('home.solutions.solutionLabel') }}</span>
                <p>{{ solution.solution }}</p>
              </div>
            </div>

            <div class="s-cols">
              <div>
                <span class="s-label">{{ i18n.t('home.solutions.benefitsLabel') }}</span>
                <ul class="s-list">
                  @for (benefit of solution.benefits; track benefit) {
                    <li><lucide-icon [img]="checkIcon" size="15" [attr.aria-hidden]="true" />{{ benefit }}</li>
                  }
                </ul>
              </div>
              <div>
                <span class="s-label">Fonctionnalités</span>
                <ul class="s-list">
                  @for (feature of solution.features; track feature) {
                    <li><lucide-icon [img]="checkIcon" size="15" [attr.aria-hidden]="true" />{{ feature }}</li>
                  }
                </ul>
              </div>
            </div>
          </article>
        }
      </div>
    </section>

    <app-cta-section />
  `,
  styles: `
    .page-hero {
      padding-block: 9rem 3rem;
      background:
        radial-gradient(50% 70% at 80% 10%,rgb(0 201 167 / 0.4), transparent 70%),
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

    .stack {
      display: flex;
      flex-direction: column;
      gap: 4rem;
    }

    .s-head {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .s-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 3rem;
      height: 3rem;
      border-radius: 16px;
      background: var(--teal-soft);
      color: var(--teal);
      flex-shrink: 0;
    }

    .s-index {
      font-family: var(--font-display, 'Sora Variable');
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text-3);
      letter-spacing: 0.1em;
    }

    .s-head h2 {
      font-size: clamp(1.4rem, 1.1rem + 1.4vw, 2rem);
      margin-top: 0.15rem;
    }

    .s-art {
      margin-top: 1.5rem;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid var(--border);
      background: var(--bg-sunken);

      img {
        display: block;
        width: 100%;
        height: auto;
      }
    }

    .s-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
      margin-top: 1.75rem;
    }

    @media (min-width: 48em) {
      .s-grid {
        grid-template-columns: 1fr 1fr;
      }
    }

    .s-block {
      padding: 1.25rem 1.4rem;
      border-radius: 16px;
    }

    .s-block--problem {
      background: var(--bg-sunken);
    }

    .s-block--solution {
      background: var(--accent-soft-2);
    }

    .s-label {
      display: block;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--text-3);
      margin-bottom: 0.45rem;
    }

    .s-block p {
      color: var(--text-2);
      font-size: 0.95rem;
    }

    .s-cols {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
      margin-top: 1.75rem;
    }

    @media (min-width: 48em) {
      .s-cols {
        grid-template-columns: 1fr 1fr;
      }
    }

    .s-list {
      list-style: none;
      margin: 0.6rem 0 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .s-list li {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      font-size: 0.925rem;
      color: var(--text-1);
    }

    .s-list lucide-icon {
      color: var(--teal);
      flex-shrink: 0;
      margin-top: 0.2rem;
    }
  `,
})
export class SolutionsPage {
  protected readonly i18n = inject(I18nService);
  protected readonly solutions = computed(() => this.i18n.data<SolutionItem[]>('solutions') ?? []);
  protected readonly checkIcon = Check;
  protected readonly arrowIcon = ArrowRight;

  constructor() {
    inject(SeoService).setSeoReactive(() => ({
      title: this.i18n.t('solutionsPage.hero.title'),
      description: this.i18n.t('solutionsPage.hero.subtitle'),
      path: '/solutions',
    }));
  }
}
