import { DestroyRef, inject, signal } from '@angular/core';

/** Returns a signal mirroring a media query, SSR/dev-server safe. */
export function useMediaQuery(query: string) {
  const matches = signal(false);

  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return matches.asReadonly();
  }

  const list = window.matchMedia(query);
  matches.set(list.matches);
  const listener = (event: MediaQueryListEvent) => matches.set(event.matches);
  list.addEventListener('change', listener);
  inject(DestroyRef).onDestroy(() => list.removeEventListener('change', listener));

  return matches.asReadonly();
}
