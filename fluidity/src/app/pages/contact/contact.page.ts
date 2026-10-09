import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule, AlertCircle, ChevronDown, Loader2, Send } from 'lucide-angular';

import { I18nService } from '../../core/services/i18n.service';
import { SeoService } from '../../core/services/seo.service';
import { ContactService, ContactResult } from '../../core/services/contact.service';
import { ServiceItem, SocialLink } from '../../core/models/site.model';
import { AppIcon } from '../../shared/components/app-icon';
import { CompanyMap } from '../../shared/components/company-map';
import { RevealDirective } from '../../shared/directives/reveal.directive';

@Component({
  selector: 'app-contact-page',
  imports: [ReactiveFormsModule, LucideAngularModule, AppIcon, CompanyMap, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contact.page.html',
  styleUrl: './contact.page.scss',
})
export class ContactPage {
  protected readonly i18n = inject(I18nService);
  private readonly fb = inject(FormBuilder);
  private readonly contactService = inject(ContactService);

  protected readonly alertIcon = AlertCircle;
  protected readonly chevronIcon = ChevronDown;
  protected readonly loaderIcon = Loader2;
  protected readonly sendIcon = Send;

  protected readonly services = computed(() => this.i18n.data<ServiceItem[]>('services') ?? []);
  protected readonly socialLinks = computed(() => this.i18n.data<SocialLink[]>('socialLinks') ?? []);

  protected readonly submitting = signal(false);
  protected readonly succeeded = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly usedMailto = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    company: [''],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    requestType: [''],
    service: [''],
    message: ['', [Validators.required, Validators.minLength(10)]],
  });

  constructor() {
    inject(SeoService).setSeoReactive(() => ({
      title: this.i18n.t('contact.hero.title'),
      description: this.i18n.t('contact.hero.subtitle'),
      path: '/contact',
    }));
  }

  protected errorFor(name: 'name' | 'email' | 'message'): string {
    const control = this.form.controls[name];
    if (!control.invalid || !control.touched) return '';
    if (control.hasError('required')) {
      return this.i18n.t(`contact.form.errors.${name === 'name' ? 'nameRequired' : name === 'email' ? 'emailRequired' : 'messageRequired'}`);
    }
    if (control.hasError('email')) return this.i18n.t('contact.form.errors.emailFormat');
    if (control.hasError('minlength')) {
      return name === 'message' ? this.i18n.t('contact.form.errors.messageMin') : '';
    }
    return '';
  }

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);

    const result: ContactResult = await this.contactService.send({
      ...this.form.getRawValue(),
      locale: this.i18n.locale(),
    });

    if (result.status === 'success') {
      this.usedMailto.set(false);
      this.succeeded.set(true);
    } else if (result.status === 'mailto') {
      this.usedMailto.set(true);
      this.succeeded.set(true);
    } else {
      this.usedMailto.set(false);
      this.submitError.set(this.i18n.t('contact.form.errors.submit'));
    }

    this.submitting.set(false);
  }

  protected reset(): void {
    this.form.reset();
    this.succeeded.set(false);
    this.usedMailto.set(false);
    this.submitError.set(null);
  }
}
