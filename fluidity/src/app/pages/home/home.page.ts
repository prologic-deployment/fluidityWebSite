import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { I18nService } from '../../core/services/i18n.service';
import { SeoService } from '../../core/services/seo.service';
import { FlowField } from '../../shared/components/flow-field';
import { Hero } from './sections/hero/hero';
import { Stats } from './sections/stats/stats';
import { About } from './sections/about/about';
import { Services } from './sections/services/services';
import { Solutions } from './sections/solutions/solutions';
import { Why } from './sections/why/why';
import { Process } from './sections/process/process';
import { Projects } from './sections/projects/projects';
import { Tech } from './sections/tech/tech';
import { Testimonials } from './sections/testimonials/testimonials';
import { CtaSection } from '../../shared/components/cta-section';

@Component({
  selector: 'app-home-page',
  imports: [
    FlowField,
    Hero,
    Stats,
    About,
    Services,
    Solutions,
    Why,
    Process,
    Projects,
    Tech,
    Testimonials,
    CtaSection,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-flow-field />
    <div class="page-flow">
      <app-hero />
      <app-stats />
      <app-about />
      <app-services />
      <app-solutions />
      <app-why />
      <app-process />
      <app-projects />
      <app-tech />
      <app-testimonials />
      <app-cta-section />
    </div>
  `,
  styles: `
    :host {
      display: block;
      position: relative;
      overflow: clip;
    }

    .page-flow {
      position: relative;
      z-index: 1;
    }
  `,
})
export class HomePage {
  constructor() {
    const i18n = inject(I18nService);
    inject(SeoService).setSeoReactive(() => ({
      // setSeo already appends `| Fluidity`; adding the brand here doubled it.
      title: i18n.t('home.hero.seoTitle'),
      description: i18n.t('home.hero.subtitle'),
      path: '/',
    }));
  }
}
