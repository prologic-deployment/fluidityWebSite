import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

import { I18nService } from './i18n.service';

export interface SeoContent {
  readonly title: string;
  readonly description: string;
  readonly path: string;
}

/** Production domain TBD — confirmed by the client at deployment. */
export const SITE_URL = 'https://www.fluidity.example';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly i18n = inject(I18nService);

  setSeo(content: SeoContent): void {
    const fullTitle = `${content.title} | Fluidity`;
    const url = `${SITE_URL}${content.path === '/' ? '' : content.path}`;
    const keywords = this.i18n.t('meta.seoKeywords');

    this.title.setTitle(fullTitle);
    this.meta.updateTag({ name: 'description', content: content.description });
    if (keywords) {
      this.meta.updateTag({ name: 'keywords', content: keywords });
    }
    this.setLinkCanonical(url);
    this.meta.updateTag({ property: 'og:title', content: fullTitle });
    this.meta.updateTag({ property: 'og:description', content: content.description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: fullTitle });
    this.meta.updateTag({ name: 'twitter:description', content: content.description });
  }

  /**
   * Same as {@link setSeo} but re-runs whenever signals read inside `source` change
   * (e.g. after a language switch). Must be called from an injection context.
   */
  setSeoReactive(source: () => SeoContent): void {
    effect(() => this.setSeo(source()));
  }

  private setLinkCanonical(url: string): void {
    let link = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.rel = 'canonical';
      this.document.head.appendChild(link);
    }
    link.href = url;
  }
}
