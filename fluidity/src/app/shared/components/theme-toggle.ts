import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { LucideAngularModule, Moon, Sun } from 'lucide-angular';

import { I18nService } from '../../core/services/i18n.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="theme-toggle"
      (click)="theme.toggle()"
      [attr.aria-label]="label()"
      [attr.title]="label()"
    >
      @if (theme.isDark()) {
        <lucide-icon [img]="sunIcon" size="18" [attr.aria-hidden]="true" />
      } @else {
        <lucide-icon [img]="moonIcon" size="18" [attr.aria-hidden]="true" />
      }
    </button>
  `,
  styles: `
    .theme-toggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.5rem;
      height: 2.5rem;
      border-radius: var(--radius-full, 999px);
      border: 1px solid var(--hdr-border, var(--border-strong));
      background: transparent;
      color: var(--hdr-fg, var(--text-1));
      transition: border-color 0.25s ease, color 0.25s ease, transform 0.25s ease;
    }

    .theme-toggle:hover {
      border-color: var(--accent);
      color: var(--accent);
      transform: rotate(12deg);
    }
  `,
})
export class ThemeToggle {
  protected readonly theme = inject(ThemeService);
  private readonly i18n = inject(I18nService);

  protected readonly sunIcon = Sun;
  protected readonly moonIcon = Moon;

  protected readonly label = computed(() =>
    this.theme.isDark() ? this.i18n.t('theme.toLight') : this.i18n.t('theme.toDark'),
  );
}
