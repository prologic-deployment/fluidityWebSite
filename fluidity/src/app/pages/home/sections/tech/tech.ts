import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { I18nService } from '../../../../core/services/i18n.service';
import { TechCategory } from '../../../../core/models/site.model';
import { SectionHeading } from '../../../../shared/components/section-heading';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';

@Component({
  selector: 'app-tech',
  imports: [SectionHeading, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="tech section section-alt" id="technologies">
      <div class="container">
        <app-section-heading
          [eyebrow]="i18n.t('home.tech.eyebrow')"
          [title]="i18n.t('home.tech.title')"
          [lede]="i18n.t('home.tech.lede')"
        />

        <div class="cats">
          @for (cat of categories(); track cat.id; let i = $index) {
            <div class="cat" appReveal [appRevealDelay]="i * 80">
              <h3>{{ cat.title }}</h3>
              <div class="chips">
                @for (item of cat.items; track item) {
                  <span class="chip">{{ item }}</span>
                }
              </div>
            </div>
          }
        </div>
      </div>
    </section>
  `,
  styles: `
    .cats {
      display: grid;
      grid-template-columns: 1fr;
      gap: 2rem;
      margin-block-start: 3rem;
    }

    @media (min-width: 64em) {
      .cats {
        grid-template-columns: repeat(2, 1fr);
        gap: 2.5rem 4rem;
      }
    }

    .cat h3 {
      font-size: 1.05rem;
      color: var(--text-1);
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .cat h3::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--border);
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 1rem;
    }

    .chip {
      padding: 0.45rem 0.9rem;
      border-radius: 999px;
      border: 1px solid var(--border-strong);
      background: var(--surface);
      color: var(--text-2);
      font-size: 0.85rem;
      font-weight: 500;
      transition: border-color 0.25s ease, color 0.25s ease, transform 0.25s ease;
    }

    .chip:hover {
      border-color: var(--accent);
      color: var(--accent);
      transform: translateY(-2px);
    }
  `,
})
export class Tech {
  protected readonly i18n = inject(I18nService);
  protected readonly categories = computed(() => this.i18n.data<TechCategory[]>('tech') ?? []);
}
