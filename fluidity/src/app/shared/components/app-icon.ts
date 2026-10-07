import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LucideAngularModule, Sparkles } from 'lucide-angular';

import { FLUIDITY_ICONS } from '../../core/icon-registry';

@Component({
  selector: 'app-icon',
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<lucide-icon [img]="iconData()" [attr.aria-hidden]="true" />`,
  styles: `
    :host {
      display: inline-flex;
      line-height: 0;
    }
  `,
})
export class AppIcon {
  readonly name = input.required<string>();

  readonly iconData = computed(() => FLUIDITY_ICONS[this.name()] ?? Sparkles);
}
