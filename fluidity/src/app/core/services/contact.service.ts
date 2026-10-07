import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

/** Set to your real API endpoint when the backend is available. Empty = demo mode. */
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
  | { readonly status: 'unavailable'; readonly message: string }
  | { readonly status: 'error'; readonly message: string };

@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly http = inject(HttpClient);

  async send(payload: ContactPayload): Promise<ContactResult> {
    if (!CONTACT_API_URL) {
      // No backend configured yet: simulate a short latency so the UI
      // exercises its loading and success states, then accept the submission.
      await new Promise((resolve) => setTimeout(resolve, 900));
      return { status: 'success' };
    }

    try {
      await firstValueFrom(this.http.post(CONTACT_API_URL, payload));
      return { status: 'success' };
    } catch {
      return {
        status: 'error',
        message: 'contact.form.errors.submit',
      };
    }
  }
}
