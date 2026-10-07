import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

import { I18nService } from '../../core/services/i18n.service';
import { SeoService } from '../../core/services/seo.service';
import { SectionHeading } from '../../shared/components/section-heading';
import { AppIcon } from '../../shared/components/app-icon';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { ValueItem, WhyItem } from '../../core/models/site.model';

import { CtaSection } from '../../shared/components/cta-section';

@Component({
  selector: 'app-about-page',
  imports: [LucideAngularModule, SectionHeading, AppIcon, RevealDirective, CtaSection],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page-hero">
      <div class="container">
        <p class="eyebrow" appReveal>{{ i18n.t('aboutPage.hero.eyebrow') }}</p>
        <h1 appReveal [appRevealDelay]="80">{{ i18n.t('aboutPage.hero.title') }}</h1>
        <p class="lede" appReveal [appRevealDelay]="160">{{ i18n.t('aboutPage.hero.subtitle') }}</p>
      </div>
    </section>

    <section class="section">
      <div class="container story">
        <div class="story-text">
          <app-section-heading
            [eyebrow]="i18n.t('aboutPage.story.eyebrow')"
            [title]="i18n.t('aboutPage.story.title')"
          />
          <p>{{ i18n.t('aboutPage.story.text1') }}</p>
          <p>{{ i18n.t('aboutPage.story.text2') }}</p>
        </div>
        <aside class="story-aside" appReveal [appRevealDelay]="140">
          <div class="mv-card">
            <h3>{{ i18n.t('home.about.missionTitle') }}</h3>
            <p>{{ i18n.t('home.about.mission') }}</p>
  </div>
          <div class="mv-card">
            <h3>{{ i18n.t('home.about.visionTitle') }}</h3>
            <p>{{ i18n.t('home.about.vision') }}</p>
          </div>
        </aside>
      </div>
    </section>

    <section class="section section-alt">
      <div class="container">
        <app-section-heading
          [eyebrow]="i18n.t('aboutPage.valuesEyebrow')"
          [title]="i18n.t('aboutPage.valuesTitle')"
          align="center"
        />
        <div class="values-grid">
          @for (value of values(); track value.id; let i = $index) {
            <article class="value-card" appReveal [appRevealDelay]="i * 80">
              <div class="value-icon">
                <app-icon [name]="value.icon" />
              </div>
              <h3>{{ value.title }}</h3>
              <p>{{ value.description }}</p>
            </article>
          }
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <app-section-heading
          [eyebrow]="i18n.t('aboutPage.whyEyebrow')"
          [title]="i18n.t('aboutPage.whyTitle')"
        />
        <ol class="why-list">
          @for (item of whyItems(); track item.id; let i = $index) {
            <li class="why-item" appReveal [appRevealDelay]="i * 80">
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

    <app-cta-section />
  `,
  styles: `
    @use 'tokens' as *;

    .page-hero {
      padding-block: 9rem 3rem;
      background:
        radial-gradient(50% 70% at 80% 10%,  rgb(0 201 167 / 0.4), transparent 70%),
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

    .story {
      display: grid;
      grid-template-columns: 1fr;
      gap: 2.5rem;
    }

    @media (min-width: 64em) {
      .story {
        grid-template-columns: 1.2fr 0.8fr;
      }
    }

    .story-text {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      color: var(--text-2);
    }

    .story-aside {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .mv-card {
      @include card;
      padding: 1.5rem;
    }

    .mv-card h3 {
      color: var(--accent);
      font-size: 1rem;
      margin-bottom: 0.5rem;
    }

    .mv-card p {
      color: var(--text-2);
      font-size: 0.925rem;
    }

    .values-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.25rem;
      margin-top: 3rem;
    }

    @media (min-width: 48em) {
      .values-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (min-width: 64em) {
      .values-grid {
        grid-template-columns: repeat(4, 1fr);
      }
    }

    .value-card {
      @include card;
      @include hover-lift;
      padding: 1.75rem;
    }

    .value-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.75rem;
      height: 2.75rem;
      border-radius: 16px;
      background: var(--accent-soft);
      color: var(--accent);
    }

    .value-card h3 {
      margin-top: 1rem;
      font-size: 1.15rem;
    }

    .value-card p {
      margin-top: 0.5rem;
      font-size: 0.9rem;
      color: var(--text-2);
    }

    .why-list {
      list-style: none;
      margin: 3rem 0 0;
      padding: 0;
      display: grid;
      grid-template-columns: 1fr;
      gap: 2rem;
    }

    @media (min-width: 48em) {
      .why-list {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    .why-item {
      display: flex;
      gap: 1.25rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 2rem;
    }

    .num {
      font-family: var(--font-display, 'Sora Variable');
      font-size: 2rem;
      font-weight: 700;
      line-height: 1;
      background: var(--grad-brand);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      color: transparent;
    }

    .why-item h3 {
      font-size: 1.2rem;
    }

    .why-item p {
      margin-top: 0.5rem;
      color: var(--text-2);
      font-size: 0.9375rem;
    }
  `,
})
export class AboutPage {
  protected readonly i18n = inject(I18nService);
  protected readonly values = computed(() => this.i18n.data<ValueItem[]>('values') ?? []);
  protected readonly whyItems = computed(() => this.i18n.data<WhyItem[]>('why') ?? []);

  constructor() {
    inject(SeoService).setSeoReactive(() => ({
      title: this.i18n.t('aboutPage.hero.title'),
      description: this.i18n.t('aboutPage.hero.subtitle'),
      path: '/a-propos',
    }));
  }
}
