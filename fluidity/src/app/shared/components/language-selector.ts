import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal } from '@angular/core';
import { LucideAngularModule, Check, ChevronDown, Globe } from 'lucide-angular';

import { I18nService, LANGUAGES, LANGUAGE_META, Language } from '../../core/services/i18n.service';

@Component({
  selector: 'app-language-selector',
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
  },
  template: `
    <div class="wrap" (keydown.escape)="close()">
      <button
        type="button"
        class="trigger"
        (click)="toggle()"
        [attr.aria-expanded]="open()"
        aria-haspopup="listbox"
        [attr.aria-label]="i18n.t('language.label')"
      >
        <lucide-icon [img]="globeIcon" size="16" [attr.aria-hidden]="true" />
        <span class="code">{{ i18n.language().toUpperCase() }}</span>
        <lucide-icon [img]="chevronIcon" size="14" [attr.aria-hidden]="true" class="chev" [class.chev--open]="open()" />
      </button>

      @if (open()) {
        <ul class="menu" role="listbox" [attr.aria-label]="i18n.t('language.label')">
          @for (lang of languages; track lang) {
            <li>
              <button
                type="button"
                role="option"
                class="option"
                [class.option--active]="i18n.language() === lang"
                [attr.aria-selected]="i18n.language() === lang"
                (click)="select(lang)"
              >
                <span>{{ LANGUAGE_META[lang].label }}</span>
                @if (i18n.language() === lang) {
                  <lucide-icon [img]="checkIcon" size="15" [attr.aria-hidden]="true" />
                }
              </button>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: `
    .wrap {
      position: relative;
    }

    .trigger {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.45rem 0.75rem;
      border-radius: var(--radius-full, 999px);
      border: 1px solid var(--hdr-border, var(--border-strong));
      background: transparent;
      color: var(--hdr-fg, var(--text-1));
      font-size: 0.8125rem;
      font-weight: 600;
      transition: border-color 0.25s ease, color 0.25s ease;
    }

    .trigger:hover,
    .trigger[aria-expanded='true'] {
      border-color: var(--accent);
      color: var(--accent);
    }

    .chev {
      transition: transform 0.25s ease;
    }

    .chev--open {
      transform: rotate(180deg);
    }

    .menu {
      position: absolute;
      top: calc(100% + 0.5rem);
      inset-inline-end: 0;
      min-width: 11rem;
      margin: 0;
      padding: 0.35rem;
      list-style: none;
      background: var(--surface-raised);
      border: 1px solid var(--border);
      border-radius: var(--radius-md, 16px);
      box-shadow: var(--shadow-3);
      z-index: 60;
    }

    .option {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      width: 100%;
      padding: 0.55rem 0.75rem;
      border: 0;
      border-radius: var(--radius-sm, 10px);
      background: transparent;
      color: var(--text-1);
      font-size: 0.875rem;
      font-weight: 500;
      text-align: start;
    }

    .option:hover {
      background: var(--accent-soft);
    }

    .option--active {
      color: var(--accent-strong);
      font-weight: 600;
    }
  `,
})
export class LanguageSelector {
  protected readonly i18n = inject(I18nService);
  protected readonly languages = LANGUAGES;
  protected readonly LANGUAGE_META = LANGUAGE_META;

  protected readonly open = signal(false);

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly globeIcon = Globe;
  protected readonly chevronIcon = ChevronDown;
  protected readonly checkIcon = Check;

  protected toggle(): void {
    this.open.update((v) => !v);
  }

  protected onDocumentClick(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  protected close(): void {
    this.open.set(false);
  }

  protected select(language: Language): void {
    this.i18n.setLanguage(language);
    this.open.set(false);
  }
}
