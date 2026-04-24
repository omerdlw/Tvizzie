'use client';

export const POSTER_PREFERENCE_CHANGE_EVENT = 'tvizzie:poster-preference-change';

export function notifyPosterPreferenceChange(detail = {}) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(POSTER_PREFERENCE_CHANGE_EVENT, { detail }));
}
