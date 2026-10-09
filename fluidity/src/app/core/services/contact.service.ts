import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { I18nService } from './i18n.service';

/** Recipient of every request submitted through the contact form. */
export const CONTACT_EMAIL = 'contact@fluidity.tn';

/** Set to your real API endpoint when a backend is available. Empty = mailto delivery. */
export const CONTACT_API_URL = '';

export interface ContactPayload {
  readonly name: string;
  readonly company: string;
  readonly email: string;
  readonly phone: string;
  readonly requestType: string;
  readonly service: string;
  readonly message: string;
  readonly locale: string;
}

export type ContactResult =
  | { readonly status: 'success' }
  | { readonly status: 'mailto' }
  | { readonly status: 'unavailable'; readonly message: string }
  | { readonly status: 'error'; readonly message: string };

@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);
  private readonly i18n = inject(I18nService);

  /**
   * Delivers a contact request to {@link CONTACT_EMAIL}.
   *
   * With a backend configured (`CONTACT_API_URL`), the payload is POSTed and the
   * request is stored server-side. Otherwise the visitor's own mail client is
   * opened with the request pre-filled and addressed to contact@fluidity.tn.
   */
  async send(payload: ContactPayload): Promise<ContactResult> {
    if (CONTACT_API_URL) {
      try {
        await firstValueFrom(this.http.post(CONTACT_API_URL, payload));
        return { status: 'success' };
      } catch {
        return { status: 'error', message: 'contact.form.errors.submit' };
      }
    }

    return this.deliverByEmail(payload);
  }

  /** Builds the `mailto:` URL that pre-fills the visitor's mail client. */
  mailtoHref(payload: ContactPayload): string {
    const subject = `[Fluidity] ${payload.name}${payload.company ? ' — ' + payload.company : ''}`;
    return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(this.messageBody(payload))}`;
  }

  private deliverByEmail(payload: ContactPayload): ContactResult {
    const view = this.document.defaultView;
    if (!view) {
      // Server-side render: there is no mail client to hand off to.
      return { status: 'unavailable', message: 'contact.form.errors.submit' };
    }

    const link = this.document.createElement('a');
    link.href = this.mailtoHref(payload);
    link.rel = 'noopener';
    this.document.body.appendChild(link);
    link.click();
    link.remove();

    return { status: 'mailto' };
  }

  private messageBody(payload: ContactPayload): string {
    const label = (key: string): string => this.i18n.t(key);
    const rows: readonly [string, string][] = [
      [label('contact.form.name'), payload.name],
      [label('contact.form.company'), payload.company],
      [label('contact.form.email'), payload.email],
      [label('contact.form.phone'), payload.phone],
      [label('contact.form.requestType'), this.requestTypeLabel(payload.requestType)],
      [label('contact.form.service'), this.serviceLabel(payload.service)],
    ];

    const header = rows
      .filter(([, value]) => value.trim().length > 0)
      .map(([name, value]) => `${name}: ${value}`)
      .join('\n');

    return `${header}\n\n${label('contact.form.message')}:\n${payload.message}\n\n--\n${label('contact.form.language')}: ${payload.locale}`;
  }

  private requestTypeLabel(requestType: string): string {
    const map: Record<string, string> = {
      quote: 'contact.form.requestQuote',
      meeting: 'contact.form.requestMeeting',
      info: 'contact.form.requestInfo',
    };
    return map[requestType] ? this.i18n.t(map[requestType]) : '';
  }

  private serviceLabel(service: string): string {
    if (!service) return '';
    if (service === 'other') return this.i18n.t('contact.form.serviceNone');
    const services = this.i18n.data<readonly { id: string; title: string }[]>('services') ?? [];
    return services.find((item) => item.id === service)?.title ?? service;
  }
}
