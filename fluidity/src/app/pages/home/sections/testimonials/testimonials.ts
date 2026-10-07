import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { LucideAngularModule, MessageCircle } from 'lucide-angular';

import { I18nService } from '../../../../core/services/i18n.service';
import { TestimonialItem } from '../../../../core/models/site.model';
import { SectionHeading } from '../../../../shared/components/section-heading';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';

@Component({
  selector: 'app-testimonials',
  imports: [LucideAngularModule, SectionHeading, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="testimonials section" id="temoignages">
      <div class="container">
        <app-section-heading
          [eyebrow]="i18n.t('home.testimonials.eyebrow')"
          [title]="i18n.t('home.testimonials.title')"
        />

        @if (items().length > 0) {
          <div class="grid">
            @for (item of items(); track item.id; let i = $index) {
              <figure class="quote-card" appReveal [appRevealDelay]="i * 90">
                <lucide-icon [img]="quoteIcon" size="22" [attr.aria-hidden]="true" class="quote-mark" />
                <blockquote>{{ item.quote }}</blockquote>
                <figcaption>
                  <span class="author">{{ item.author }}</span>
                  <span class="role">{{ item.role }} — {{ item.company }}</span>
                </figcaption>
              </figure>
            }
          </div>
        } @else {
          <div class="empty" appReveal>
            <lucide-icon [img]="quoteIcon" size="26" [attr.aria-hidden]="true" />
            <p>{{ i18n.t('home.testimonials.empty') }}</p>
          </div>
        }
      </div>
    </section>
  `,
  styles: `
    @use 'tokens' as *;

    .grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
      margin-block-start: 3rem;
    }

    @media (min-width: 64em) {
      .grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    .quote-card {
      @include card;
      margin: 0;
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .quote-mark {
      color: var(--accent);
    }

    blockquote {
      margin: 0;
      font-size: 1rem;
      line-height: 1.6;
      color: var(--text-1);
    }

    figcaption {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      margin-top: auto;
    }

    .author {
      font-weight: 700;
      font-size: 0.95rem;
    }

    .role {
      font-size: 0.825rem;
      color: var(--text-3);
    }

    .empty {
      margin-block-start: 3rem;
      padding: 2.5rem;
      border: 1px dashed var(--border-strong);
      border-radius: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      text-align: center;
      color: var(--text-3);
    }

    .empty p {
      max-width: 34rem;
      font-size: 0.95rem;
    }
  `,
})
export class Testimonials {
  protected readonly i18n = inject(I18nService);
  protected readonly quoteIcon = MessageCircle;

  protected readonly items = computed(() => this.i18n.data<TestimonialItem[]>('testimonials') ?? []);
}
