import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, ArrowRight, ArrowDown } from 'lucide-angular';

import { I18nService } from '../../../../core/services/i18n.service';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';
import { FluidVisual } from '../../../../shared/components/fluid-visual/fluid-visual';
import { useMediaQuery } from '../../../../shared/utils/media-query';

@Component({
  selector: 'app-hero',
  imports: [RouterLink, LucideAngularModule, RevealDirective, FluidVisual],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
})
export class Hero {
  protected readonly i18n = inject(I18nService);

  protected readonly arrowIcon = ArrowRight;
  protected readonly arrowDownIcon = ArrowDown;

  protected readonly isMobile = useMediaQuery('(max-width: 47.99em)');
  protected readonly density = computed<'low' | 'high'>(() => (this.isMobile() ? 'low' : 'high'));
}
