import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { RevealDirective } from '../directives/reveal.directive';

@Component({
  selector: 'app-section-heading',
  imports: [RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="heading" [class.heading--center]="align() === 'center'" appReveal>
      <p class="eyebrow">{{ eyebrow() }}</p>
      <h2 class="section-title">{{ title() }}</h2>
      @if (lede()) {
        <p class="section-lede">{{ lede() }}</p>
      }
    </div>
  `,
  styles: `
    .heading {
      max-width: 44rem;
    }

    .heading--center {
      margin-inline: auto;
      text-align: center;
    }

    .heading--center .eyebrow {
      justify-content: center;
    }

    .heading--center .section-lede {
      margin-inline: auto;
    }
  `,
})
export class SectionHeading {
  readonly eyebrow = input.required<string>();
  readonly title = input.required<string>();
  readonly lede = input<string>('');
  readonly align = input<'start' | 'center'>('start');
}
