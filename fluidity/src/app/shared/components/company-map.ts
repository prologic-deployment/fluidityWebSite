import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { LucideAngularModule, ArrowUpRight, MapPin } from 'lucide-angular';

import { I18nService } from '../../core/services/i18n.service';

/**
 * Fluidity SA — 9 Bis Impasse N°3, Rue 8612, ZI Charguia 1, 2035 Cité El Khadra, Tunis.
 * Keep in sync with the JSON-LD LocalBusiness block in index.html.
 */
const OFFICE = {
  lat: 36.82907997480159,
  lng: 10.203252253552552,
} as const;

const EMBED_TPL =
  'https://www.openstreetmap.org/export/embed.html?bbox={bbox}&layer=mapnik&marker={lat}%2C{lng}';

/**
 * Map box for the contact page: a bordered card embedding OpenStreetMap
 * (no API key, no cookies set by us) centered on the office, plus a caption
 * and a link to open the location on OpenStreetMap / Google Maps.
 */
@Component({
  selector: 'app-company-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <figure class="map-box">
      <div class="map-frame">
        @if (failed()) {
          <div class="map-fallback">
            <lucide-icon [img]="mapPin" size="28" [attr.aria-hidden]="true" />
            <p>{{ i18n.t('contact.map.unavailable') }}</p>
            <a class="map-link" [href]="osmLink" target="_blank" rel="noopener">
              {{ i18n.t('contact.map.openMaps') }}
              <lucide-icon [img]="arrowUpRight" size="14" [attr.aria-hidden]="true" />
            </a>
          </div>
        } @else {
          <iframe
            [title]="i18n.t('contact.map.title')"
            [srcdoc]="srcDoc()"
            loading="lazy"
            (error)="markFailed()"
          ></iframe>
          <div class="map-scrim" aria-hidden="true"></div>
        }
      </div>
      <figcaption class="map-caption">
        <div class="map-caption-text">
          <lucide-icon [img]="mapPin" size="14" [attr.aria-hidden]="true" />
          <span>{{ i18n.t('contact.map.caption') }}</span>
        </div>
        <a class="map-link" [href]="osmLink" target="_blank" rel="noopener">
          {{ i18n.t('contact.map.openMaps') }}
          <lucide-icon [img]="arrowUpRight" size="14" [attr.aria-hidden]="true" />
        </a>
      </figcaption>
    </figure>
  `,
  imports: [LucideAngularModule],
  styles: `
    @use 'tokens' as *;

    :host {
      display: block;
    }

    .map-box {
      @include card;
      margin: 0;
      overflow: hidden;
    }

    .map-frame {
      position: relative;
      aspect-ratio: 16 / 10;
      min-height: 13rem;
      background: var(--surface-2);

      iframe {
        display: block;
        width: 100%;
        height: 100%;
        border: 0;
      }
    }

    // Subtle veil so the third-party map blends with the site's surfaces,
    // following the site accent like the other decorative scrims.
    .map-scrim {
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: linear-gradient(180deg, rgb(0 133 110 / 0.08), transparent 35%);
    }

    .map-fallback {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: $space-2;
      padding: $space-5;
      text-align: center;
      color: var(--text-3);
      font-size: $font-size-300;

      lucide-icon {
        color: var(--accent);
      }
    }

    .map-caption {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: $space-3;
      padding: $space-3 $space-4;
      border-top: 1px solid var(--border);
      font-size: $font-size-300;
      color: var(--text-2);
    }

    .map-caption-text {
      display: flex;
      align-items: center;
      gap: $space-2;
      min-width: 0;

      lucide-icon {
        flex-shrink: 0;
        color: var(--accent);
      }

      span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .map-link {
      display: inline-flex;
      align-items: center;
      gap: $space-1;
      flex-shrink: 0;
      font-weight: 600;
      font-size: $font-size-200;
      color: var(--accent);
      text-decoration: none;
      transition: color 0.25s ease;

      &:hover {
        text-decoration: underline;
      }
    }
  `,
})
export class CompanyMap {
  protected readonly i18n = inject(I18nService);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly mapPin = MapPin;
  protected readonly arrowUpRight = ArrowUpRight;

  protected readonly failed = signal(false);

  /** Re-computed per locale so the embedded document's lang follows the UI language. */
  protected readonly srcDoc = computed(() => this.buildSrcDoc(this.i18n.locale()));

  /** Deep link centered on the office marker. */
  protected readonly osmLink = `https://www.openstreetmap.org/?mlat=${OFFICE.lat}&mlon=${OFFICE.lng}#map=12/${OFFICE.lat}/${OFFICE.lng}`;

  protected markFailed(): void {
    this.failed.set(true);
  }

  /**
   * Build a locale-aware OSM embed document. The srcdoc indirection keeps the
   * third-party iframe cookie-less (the embed URL is fetched by the inner
   * document, not by our page context) and lets us hide the OSM chrome.
   */
  private buildSrcDoc(locale: string): SafeHtml {
    const d = 0.012;
    const bbox = [
      (OFFICE.lng - d).toFixed(6),
      (OFFICE.lat - d / 2).toFixed(6),
      (OFFICE.lng + d).toFixed(6),
      (OFFICE.lat + d / 2).toFixed(6),
    ].join('%2C');
    const embed = EMBED_TPL.replace('{bbox}', bbox)
      .replace('{lat}', String(OFFICE.lat))
      .replace('{lng}', String(OFFICE.lng));

    // The document is entirely generated from constants above (no user input),
    // so bypassing sanitization is safe — Angular would otherwise strip the
    // whole document (srcdoc is a security-sensitive context).
    return this.sanitizer.bypassSecurityTrustHtml(
      `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<style>
  html, body { margin: 0; height: 100%; background: #e8e6e1; }
  iframe { display: block; width: 100%; height: 100%; border: 0; }
</style>
</head>
<body>
<iframe src="${embed}" title="Fluidity SA — map" loading="lazy"></iframe>
</body>
</html>`,
    );
  }
}
