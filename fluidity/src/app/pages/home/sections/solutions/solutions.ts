import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, Check } from 'lucide-angular';

import { I18nService } from '../../../../core/services/i18n.service';
import { SolutionItem } from '../../../../core/models/site.model';
import { SectionHeading } from '../../../../shared/components/section-heading';
import { AppIcon } from '../../../../shared/components/app-icon';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';

@Component({
  selector: 'app-solutions',
  imports: [RouterLink, LucideAngularModule, SectionHeading, AppIcon, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="solutions section" id="solutions">
      <div class="container">
        <app-section-heading
          [eyebrow]="i18n.t('home.solutions.eyebrow')"
          [title]="i18n.t('home.solutions.title')"
          [lede]="i18n.t('home.solutions.lede')"
        />

        <div class="cards">
          @for (solution of solutions(); track solution.id; let i = $index) {
            <article class="card" appReveal [appRevealDelay]="i * 90">
              <div class="card-art" aria-hidden="true">
                <img [src]="'images/illustrations/solution-' + solution.id + '.svg'" alt="" width="640" height="400" loading="lazy" />
              </div>
              <div class="card-head">
                <div class="card-icon">
                  <app-icon [name]="solution.icon" />
                </div>
                <h3>{{ solution.title }}</h3>
              </div>

              <div class="block block--problem">
                <span class="block-label">{{ i18n.t('home.solutions.problemLabel') }}</span>
                <p>{{ solution.problem }}</p>
              </div>

              <div class="block block--solution">
                <span class="block-label">{{ i18n.t('home.solutions.solutionLabel') }}</span>
                <p>{{ solution.solution }}</p>
              </div>

              <div class="benefits">
                <span class="block-label">{{ i18n.t('home.solutions.benefitsLabel') }}</span>
                <ul>
                  @for (benefit of solution.benefits; track benefit) {
                    <li>
                      <lucide-icon [img]="checkIcon" size="15" [attr.aria-hidden]="true" />
                      <span>{{ benefit }}</span>
                    </li>
                  }
                </ul>
              </div>
            </article>
          }
        </div>

        <div class="more" appReveal>
          <a routerLink="/solutions" class="btn btn-ghost">{{ i18n.t('home.solutions.all') }}</a>
        </div>
      </div>
    </section>
  `,
  styles: `
    @use 'tokens' as *;

    .cards {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
      margin-block-start: 3rem;
    }

    @media (min-width: 64em) {
      .cards {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    .card {
      @include card;
      @include hover-lift;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      padding: 1.75rem;
    }

    .card-head {
      display: flex;
      align-items: center;
      gap: 0.9rem;
    }

    .card-art {
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

    .card-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.75rem;
      height: 2.75rem;
      border-radius: 16px;
      background: var(--teal-soft);
      color: var(--teal);
      flex-shrink: 0;
    }

    .card-head h3 {
      font-size: 1.15rem;
    }

    .block {
      padding: 1rem 1.1rem;
      border-radius: 14px;
    }

    .block--problem {
      background: var(--bg-sunken);
    }

    .block--solution {
      background: var(--accent-soft-2);
    }

    .block-label {
      display: block;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--text-3);
      margin-block-end: 0.4rem;
    }

    .block p {
      font-size: 0.9375rem;
      color: var(--text-2);
    }

    .benefits ul {
      list-style: none;
      margin: 0.6rem 0 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .benefits li {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      font-size: 0.9rem;
      color: var(--text-1);
    }

    .benefits lucide-icon {
      color: var(--teal);
      flex-shrink: 0;
      margin-top: 0.2rem;
    }

    .more {
      display: flex;
      justify-content: center;
      margin-block-start: 2.5rem;
    }
  `,
})
export class Solutions {
  protected readonly i18n = inject(I18nService);
  protected readonly checkIcon = Check;
  protected readonly solutions = computed(() => this.i18n.data<SolutionItem[]>('solutions') ?? []);
}
