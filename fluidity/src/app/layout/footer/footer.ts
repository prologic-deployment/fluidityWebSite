import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, Mail, MapPin, Phone, Send } from 'lucide-angular';

import { I18nService } from '../../core/services/i18n.service';
import { ServiceItem, SocialLink } from '../../core/models/site.model';
import { AppIcon } from '../../shared/components/app-icon';
import { RevealDirective } from '../../shared/directives/reveal.directive';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, LucideAngularModule, AppIcon, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class Footer {
  protected readonly services = computed(() => this.i18n.data<ServiceItem[]>('services') ?? []);
  protected readonly socialLinks = computed(() => this.i18n.data<SocialLink[]>('socialLinks') ?? []);
  protected readonly i18n = inject(I18nService);

  protected readonly mailIcon = Mail;
  protected readonly mapPinIcon = MapPin;
  protected readonly phoneIcon = Phone;
  protected readonly sendIcon = Send;

  protected readonly year = new Date().getFullYear();
}
