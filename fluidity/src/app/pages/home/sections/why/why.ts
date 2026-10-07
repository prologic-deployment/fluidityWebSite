import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { I18nService } from '../../../../core/services/i18n.service';
import { WhyItem } from '../../../../core/models/site.model';
import { SectionHeading } from '../../../../shared/components/section-heading';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';

@Component({
  selector: 'app-why',
  imports: [SectionHeading, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="why section" id="pourquoi">
      <div class="container">
        <app-section-heading
          [eyebrow]="i18n.t('home.why.eyebrow')"
          [title]="i18n.t('home.why.title')"
        />

        <ol class="list">
          @for (item of items(); track item.id; let i = $index) {
            <li class="item" appReveal [appRevealDelay]="i * 80">
              <span class="num">0{{ i + 1 }}</span>
              <div>
                <h3>{{ item.title }}</h3>
                <p>{{ item.description }}</p>
              </div>
            </li>
          }
        </ol>
      </div>
    </section>
  `,
  styles: `
    .list {
      list-style: none;
      margin: 3rem 0 0;
      padding: 0;
      display: grid;
      grid-template-columns: 1fr;
      gap: 2rem;
    }

    @media (min-width: 48em) {
      .list {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    .item {
      display: flex;
      gap: 1.25rem;
      padding-block-end: 2rem;
      border-bottom: 1px solid var(--border);
    }

    .num {
      font-family: var(--font-display, 'Sora Variable');
      font-size: 2.2rem;
      font-weight: 700;
      line-height: 1;
      background: var(--grad-brand);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      color: transparent;
    }

    .item h3 {
      font-size: 1.2rem;
    }

    .item p {
      margin-top: 0.5rem;
      color: var(--text-2);
      font-size: 0.9375rem;
    }
  `,
})
export class Why {
  protected readonly i18n = inject(I18nService);
  protected readonly items = computed(() => this.i18n.data<WhyItem[]>('why') ?? []);
}
