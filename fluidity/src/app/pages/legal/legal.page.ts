import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { I18nService } from '../../core/services/i18n.service';
import { SeoService } from '../../core/services/seo.service';
import { RevealDirective } from '../../shared/directives/reveal.directive';

@Component({
  selector: 'app-legal-page',
  imports: [RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page-hero">
      <div class="container">
        <h1 appReveal>{{ title() }}</h1>
        <p class="updated" appReveal [appRevealDelay]="80">{{ updated() }}</p>
      </div>
    </section>

    <section class="section">
      <div class="container-narrow legal-body" appReveal>
        @for (block of blocks(); track block.title) {
          <h2>{{ block.title }}</h2>
          <p>{{ block.text }}</p>
        }
      </div>
    </section>
  `,
  styles: `
    .page-hero {
      padding-block: 9rem 2rem;
    }

    .page-hero h1 {
      font-size: clamp(2rem, 1.5rem + 2.6vw, 3rem);
      font-weight: 800;
      letter-spacing: -0.03em;
    }

    .updated {
      margin-top: 0.75rem;
      color: var(--text-3);
      font-size: 0.875rem;
    }

    .legal-body {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .legal-body h2 {
      font-size: 1.25rem;
      margin-top: 1.5rem;
    }

    .legal-body p {
      color: var(--text-2);
      line-height: 1.7;
    }
  `,
})
export class LegalPage {
  protected readonly i18n = inject(I18nService);
  private readonly route = inject(ActivatedRoute);

  protected readonly variant = signal<'mentions' | 'privacy'>('mentions');

  protected readonly title = computed(() => this.i18n.t(`legalPage.${this.variant()}.title`));
  protected readonly updated = computed(() => this.i18n.t(`legalPage.${this.variant()}.updated`));

  protected readonly blocks = computed(() => {
    const prefix = `legalPage.${this.variant()}`;
    const keys = ['editor', 'host', 'contact', 'ip', 'data', 'usage', 'rights'];
    const blocks: { title: string; text: string }[] = [];
    for (const key of keys) {
      const title = this.i18n.t(`${prefix}.${key}Title`);
      const text = this.i18n.t(`${prefix}.${key}Text`);
      if (title !== `${prefix}.${key}Title`) {
        blocks.push({ title, text });
      }
    }
    return blocks;
  });

  constructor() {
    const data = this.route.snapshot.data['legal'];
    this.variant.set(data === 'privacy' ? 'privacy' : 'mentions');

    const seo = inject(SeoService);
    effect(() => {
      seo.setSeo({
        title: this.title(),
        description: this.i18n.t(`legalPage.${this.variant()}.intro`),
        path: this.variant() === 'privacy' ? '/politique-confidentialite' : '/mentions-legales',
      });
    });
  }
}
