import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, ArrowUpRight } from 'lucide-angular';

import { I18nService } from '../../../../core/services/i18n.service';
import { ProjectItem } from '../../../../core/models/site.model';
import { SectionHeading } from '../../../../shared/components/section-heading';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';

@Component({
  selector: 'app-projects',
  imports: [RouterLink, LucideAngularModule, SectionHeading, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="projects section" id="projets">
      <div class="container">
        <app-section-heading
          [eyebrow]="i18n.t('home.projects.eyebrow')"
          [title]="i18n.t('home.projects.title')"
          [lede]="i18n.t('home.projects.lede')"
        />

        <div class="grid">
          @for (project of projects(); track project.id; let i = $index) {
            <article class="card" appReveal [appRevealDelay]="(i % 3) * 90" [style.--p-hue]="project.hue">
              <div class="visual" aria-hidden="true">
                <div class="visual-waves"></div>
                <div class="visual-glow"></div>
              </div>
              <div class="body">
                <p class="client">{{ project.client }} · {{ project.industry }}</p>
                <h3>{{ project.title }}</h3>
                <p class="desc">{{ project.description }}</p>
                <div class="tags">
                  @for (tech of project.technologies; track tech) {
                    <span class="tag">{{ tech }}</span>
                  }
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

        <div class="more" appReveal>
          <a routerLink="/projets" class="btn btn-ghost">{{ i18n.t('home.projects.all') }}</a>
        </div>
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
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .visual {
      position: relative;
      aspect-ratio: 16 / 10;
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
      transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
    }

    .card:hover .visual-glow {
      transform: scale(1.15) translate(-4%, -4%);
    }

    .body {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      flex: 1;
    }

    .client {
      font-size: 0.78rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--text-3);
    }

    .body h3 {
      font-size: 1.25rem;
    }

    .desc {
      color: var(--text-2);
      font-size: 0.925rem;
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

    .results {
      list-style: none;
      margin: 0.25rem 0 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .results li {
      font-size: 0.85rem;
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

    .more {
      display: flex;
      justify-content: center;
      margin-block-start: 2.5rem;
    }
  `,
})
export class Projects {
  protected readonly i18n = inject(I18nService);
  protected readonly projects = computed(() => this.i18n.data<ProjectItem[]>('projects') ?? []);
}
