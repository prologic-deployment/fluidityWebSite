import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, ArrowRight } from 'lucide-angular';

@Component({
  selector: 'app-arrow-link',
  imports: [RouterLink, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (fragment()) {
      <a
        class="arrow-link link-underline"
        [routerLink]="routerLink()"
        [fragment]="fragment()"
      >
        <span>{{ label() }}</span>
        <lucide-icon [img]="arrowIcon" size="17" [attr.aria-hidden]="true" />
      </a>
    } @else {
      <a class="arrow-link link-underline" [routerLink]="routerLink()">
        <span>{{ label() }}</span>
        <lucide-icon [img]="arrowIcon" size="17" [attr.aria-hidden]="true" />
      </a>
    }
  `,
  styles: `
    .arrow-link {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 600;
      font-size: 0.9375rem;
      color: var(--accent);
    }

    .arrow-link:hover {
      color: var(--accent-strong);
    }

    lucide-icon {
      transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
    }

    [dir='rtl'] lucide-icon {
      transform: scaleX(-1);
    }

    .arrow-link:hover lucide-icon,
    .arrow-link:focus-visible lucide-icon {
      transform: translateX(4px);
    }

    [dir='rtl'] .arrow-link:hover lucide-icon,
    [dir='rtl'] .arrow-link:focus-visible lucide-icon {
      transform: scaleX(-1) translateX(4px);
    }
  `,
})
export class ArrowLink {
  readonly routerLink = input.required<string>();
  readonly label = input.required<string>();
  readonly fragment = input<string>('');

  protected readonly arrowIcon = ArrowRight;
}
