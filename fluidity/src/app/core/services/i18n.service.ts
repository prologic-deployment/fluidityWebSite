import { Injectable, computed, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';

import fr from '../i18n/fr.json';
import en from '../i18n/en.json';
import ar from '../i18n/ar.json';

export type Language = 'fr' | 'en' | 'ar';

export interface LanguageMeta {
  readonly label: string;
  readonly dir: 'ltr' | 'rtl';
  readonly locale: string;
}

export const LANGUAGES: readonly Language[] = ['fr', 'en', 'ar'];

export const LANGUAGE_META: Record<Language, LanguageMeta> = {
  fr: { label: 'Français', dir: 'ltr', locale: 'fr' },
  en: { label: 'English', dir: 'ltr', locale: 'en' },
  ar: { label: 'العربية', dir: 'rtl', locale: 'ar' },
};

const STORAGE_KEY = 'fluidity-lang';

/** Safely reads a dot path like 'header.nav.services' from a nested JSON object. */
function readPath(source: unknown, path: string): string {
  let current: unknown = source;
  for (const key of path.split('.')) {
    if (current !== null && typeof current === 'object' && key in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return '';
    }
  }
  return typeof current === 'string' ? current : '';
}

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly document = inject(DOCUMENT);

  readonly language = signal<Language>(this.initialLanguage());
  readonly dir = computed<'ltr' | 'rtl'>(() => LANGUAGE_META[this.language()].dir);
  readonly locale = computed(() => LANGUAGE_META[this.language()].locale);

  constructor() {
    this.applyToDocument();
  }

  setLanguage(language: Language): void {
    this.language.set(language);
    this.applyToDocument();
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // storage unavailable — language resets on next visit
    }
  }

  /** Translate a dot path; falls back to French, then the raw key for missing entries. */
  t(path: string): string {
    const lang = this.language();
    return (
      readPath(TRANSLATIONS[lang], path) ||
      readPath(TRANSLATIONS.fr, path) ||
      path
    );
  }

  /** Typed access to structured (non-scalar) content from the dictionaries. */
  data<T>(path: string): T {
    let current: unknown = TRANSLATIONS[this.language()];
    for (const key of path.split('.')) {
      if (current !== null && typeof current === 'object' && key in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>)[key];
      } else {
        return undefined as T;
      }
    }
    return current as T;
  }

  private initialLanguage(): Language {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && stored in LANGUAGE_META) {
        return stored as Language;
      }
    } catch {
      // storage unavailable
    }
    return 'fr';
  }

  private applyToDocument(): void {
    const html = this.document.documentElement;
    const meta = LANGUAGE_META[this.language()];
    html.lang = meta.locale;
    html.dir = meta.dir;
    this.document.documentElement.classList.toggle('rtl', meta.dir === 'rtl');
  }
}

const TRANSLATIONS: Record<Language, unknown> = { fr, en, ar };
