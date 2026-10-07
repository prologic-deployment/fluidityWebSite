import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { LucideAngularModule, ArrowUpRight } from 'lucide-angular';

import { I18nService } from '../../core/services/i18n.service';
import { SeoService } from '../../core/services/seo.service';
import { ProjectItem } from '../../core/models/site.model';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { CtaSection } from '../../shared/components/cta-section';

@Component({
  selector: 'app-projects-page',
  imports: [LucideAngularModule, RevealDirective, CtaSection],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page-hero">
      <div class="container">
        <p class="eyebrow" appReveal>{{ i18n.t('projectsPage.hero.eyebrow') }}</p>
        <h1 appReveal [appRevealDelay]="80">{{ i18n.t('projectsPage.hero.title') }}</h1>
        <p class="lede" appReveal [appRevealDelay]="160">{{ i18n.t('projectsPage.hero.subtitle') }}</p>
      </div>
    </section>

    <section class="section">
      <div class="container">
        @if (projects().length > 0) {
          <div class="grid">
            @for (project of projects(); track project.id; let i = $index) {
              <article class="card" appReveal [appRevealDelay]="(i % 2) * 90" [style.--p-hue]="project.hue">
                <div class="visual" aria-hidden="true">
                  <div class="visual-waves"></div>
                  <div class="visual-glow"></div>
                </div>
                <div class="body">
                  <p class="client">{{ project.client }} · {{ project.industry }}</p>
                  <h2>{{ project.title }}</h2>
                  <p class="desc">{{ project.description }}</p>
                  <div class="meta">
                    <div>
                      <span class="s-label">Services</span>
                      <div class="tags">
                        @for (s of project.services; track s) {
                          <span class="tag">{{ s }}</span>
                        }
                      </div>
                    </div>
                    <div>
                      <span class="s-label">Technologies</span>
                      <div class="tags">
                        @for (t of project.technologies; track t) {
                          <span class="tag tag--teal">{{ t }}</span>
                        }
                      </div>
                    </div>
                  </div>
                  <ul class="results">
                    @for (result of project.results; track result) {
                      <li>{{ result }}</li>
                    }
                  </ul>
                </div>
              </article>
            }
          </div>
        } @else {
          <div class="empty" appReveal>
            <img class="empty-art" src="images/illustrations/empty-references.svg" alt="" width="640" height="400" loading="lazy" />
            <p>{{ i18n.t('projectsPage.empty') }}</p>
          </div>
        }
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
      gap: 2rem;
    }

    @media (min-width: 64em) {
      .grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    .card {
      @include card;
      @include hover-lift;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .visual {
      position: relative;
      aspect-ratio: 16 / 9;
      background:
        radial-gradient(80% 90% at 30% 20%, hsl(var(--p-hue, 232) 70% 60% / 0.35), transparent 70%),
        radial-gradient(70% 80% at 75% 80%, hsl(calc(var(--p-hue, 232) + 90) 65% 55% / 0.3), transparent 70%),
        var(--bg-sunken);
      overflow: hidden;
    }

    .visual-waves {
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(
        105deg,
        transparent 0px,
        transparent 26px,
        rgb(255 255 255 / 0.07) 27px,
        transparent 28px
      );
    }

    .visual-glow {
      position: absolute;
      width: 60%;
      aspect-ratio: 1;
      border-radius: 50%;
      background: radial-gradient(circle, hsl(var(--p-hue, 232) 80% 65% / 0.5), transparent 70%);
      top: 20%;
      right: 10%;
      filter: blur(30px);
    }

    .body {
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .client {
      font-size: 0.78rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--text-3);
    }

    .body h2 {
      font-size: 1.35rem;
    }

    .desc {
      color: var(--text-2);
      font-size: 0.925rem;
    }

    .meta {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    @media (min-width: 48em) {
      .meta {
        grid-template-columns: 1fr 1fr;
      }
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

    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .tag {
      font-size: 0.72rem;
      font-weight: 600;
      padding: 0.25rem 0.6rem;
      border-radius: 999px;
      background: var(--accent-soft);
      color: var(--accent-strong);
    }

    .tag--teal {
      background: var(--teal-soft);
      color: var(--teal);
    }

    .results {
      list-style: none;
      margin: 0.25rem 0 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .results li {
      font-size: 0.9rem;
      color: var(--text-1);
      display: flex;
      gap: 0.45rem;
      align-items: flex-start;
    }

    .results li::before {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--teal);
      margin-top: 0.45rem;
      flex-shrink: 0;
    }

    .empty {
      padding: 3rem;
      border: 1px dashed var(--border-strong);
      border-radius: 24px;
      text-align: center;
      color: var(--text-3);
    }

    .empty-art {
      display: block;
      width: min(300px, 70%);
      height: auto;
      margin: 0 auto 1rem;
    }
  `,
})
export class ProjectsPage {
  protected readonly i18n = inject(I18nService);

  protected readonly projects = computed(() => this.i18n.data<ProjectItem[]>('projects') ?? []);

  constructor() {
    inject(SeoService).setSeoReactive(() => ({
      title: this.i18n.t('projectsPage.hero.title'),
      description: this.i18n.t('projectsPage.hero.subtitle'),
      path: '/projets',
    }));
  }
}
