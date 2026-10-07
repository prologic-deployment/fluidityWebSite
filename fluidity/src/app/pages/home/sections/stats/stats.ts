import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { I18nService } from '../../../../core/services/i18n.service';
import { StatItem } from '../../../../core/models/site.model';
import { StatCounter } from '../../../../shared/components/stat-counter';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';

@Component({
  selector: 'app-stats',
  imports: [StatCounter, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="stats section-alt" aria-label="{{ i18n.t('home.stats.note') }}">
      <div class="container">
        <div class="grid" appReveal>
          @for (stat of stats(); track stat.id) {
            <app-stat-counter
              [value]="stat.value"
              [suffix]="stat.suffix"
              [label]="stat.label"
              [note]="stat.note || ''"
            />
          }
        </div>
        <p class="note">{{ i18n.t('home.stats.note') }}</p>
      </div>
    </section>
  `,
  styles: `
    .grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 2rem 1.5rem;
    }

    @media (min-width: 64em) {
      .grid {
        grid-template-columns: repeat(4, 1fr);
      }
    }

    .note {
      margin-block-start: 1.5rem;
      font-size: 0.75rem;
      color: var(--text-3);
    }
  `,
})
export class Stats {
  protected readonly i18n = inject(I18nService);
  protected readonly stats = computed(() => this.i18n.data<StatItem[]>('stats') ?? []);
}
