import 'server-only';

const ADMIN_TIME_WINDOWS_HOURS = Object.freeze([24, 168, 720]);

function normalizeValue(value) {
  return String(value || '').trim();
}

export function listAdminTimeWindows() {
  return [...ADMIN_TIME_WINDOWS_HOURS];
}

export function resolveAdminWindowHours(value, { fallback = 24 } = {}) {
  const normalizedFallback = ADMIN_TIME_WINDOWS_HOURS.includes(Number(fallback)) ? Number(fallback) : 24;
  const parsed = Number(normalizeValue(value));

  if (!Number.isFinite(parsed)) {
    return normalizedFallback;
  }

  if (!ADMIN_TIME_WINDOWS_HOURS.includes(parsed)) {
    return normalizedFallback;
  }

  return parsed;
}

export function readAdminWindowHoursFromRequest(request, { fallback = 24 } = {}) {
  const url = new URL(request.url);
  return resolveAdminWindowHours(url.searchParams.get('windowHours'), { fallback });
}
