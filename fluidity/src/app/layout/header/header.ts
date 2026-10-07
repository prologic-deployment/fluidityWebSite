import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule, Menu, X } from 'lucide-angular';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';

import { I18nService } from '../../core/services/i18n.service';
import { LanguageSelector } from '../../shared/components/language-selector';
import { ThemeToggle } from '../../shared/components/theme-toggle';
import { useMediaQuery } from '../../shared/utils/media-query';

interface NavItem {
  readonly path: string;
  readonly labelKey: string;
}

const NAV_ITEMS: readonly NavItem[] = [
  { path: '/', labelKey: 'header.nav.home' },
  { path: '/a-propos', labelKey: 'header.nav.about' },
  { path: '/services', labelKey: 'header.nav.services' },
  { path: '/solutions', labelKey: 'header.nav.solutions' },
  { path: '/projets', labelKey: 'header.nav.projects' },
  { path: '/contact', labelKey: 'header.nav.contact' },
];

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, LucideAngularModule, LanguageSelector, ThemeToggle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './header.html',
  styleUrl: './header.scss',
  host: {
    '(document:keydown.escape)': 'closeMenu()',
  },
})
export class Header implements OnInit, OnDestroy {
  protected readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  protected readonly navItems = NAV_ITEMS;
  protected readonly menuIcon = Menu;
  protected readonly closeIcon = X;

  protected readonly scrolled = signal(false);
  protected readonly menuOpen = signal(false);
  protected readonly isDesktop = useMediaQuery('(min-width: 64em)');

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected readonly isHome = computed(() => this.currentUrl() === '/');

  constructor() {
    // Close the mobile menu after any successful navigation
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this.menuOpen.set(false));
  }

  ngOnInit(): void {
    if (typeof window === 'undefined') {
      return;
    }
    window.addEventListener('scroll', this.onScroll, { passive: true });
    this.onScroll();
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('scroll', this.onScroll);
    }
    this.setScrollLock(false);
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => {
      this.setScrollLock(!open);
      return !open;
    });
  }

  protected closeMenu(): void {
    if (this.menuOpen()) {
      this.menuOpen.set(false);
      this.setScrollLock(false);
    }
  }

  private setScrollLock(locked: boolean): void {
    this.document.body.classList.toggle('menu-locked', locked);
  }

  private readonly onScroll = (): void => {
    this.scrolled.set(window.scrollY > 24);
  };
}
