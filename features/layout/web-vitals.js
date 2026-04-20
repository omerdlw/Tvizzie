'use client';

import { useReportWebVitals } from 'next/web-vitals';

const WEB_VITALS_ENDPOINT = '/api/observability/web-vitals';
const TRACKED_METRICS = new Set(['CLS', 'FCP', 'INP', 'LCP', 'TTFB']);

function sanitizeMetric(metric) {
  return {
    delta: Number(metric?.delta) || 0,
    id: String(metric?.id || '').slice(0, 120),
    name: String(metric?.name || '').slice(0, 40),
    navigationType: String(metric?.navigationType || '').slice(0, 40) || 'navigate',
    pathname: typeof window === 'undefined' ? null : window.location.pathname,
    rating: String(metric?.rating || '').slice(0, 40) || 'unknown',
    value: Number(metric?.value) || 0,
  };
}

function postWebVital(metric) {
  if (!TRACKED_METRICS.has(metric?.name)) {
    return;
  }

  const body = JSON.stringify(sanitizeMetric(metric));

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(WEB_VITALS_ENDPOINT, blob);
      return;
    }

    fetch(WEB_VITALS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      keepalive: true,
      body,
    }).catch(() => null);
  } catch {
    // Web vitals reporting must stay non-blocking.
  }
}

export function WebVitals() {
  useReportWebVitals(postWebVital);

  return null;
}
