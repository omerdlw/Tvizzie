const DEFAULT_WATCH_REGION = 'US';
const UNKNOWN_REGION_CODES = new Set(['A1', 'A2', 'AP', 'EU', 'T1', 'XX']);
const GEO_COUNTRY_HEADERS = [
  'cf-ipcountry',
  'x-vercel-ip-country',
  'cloudfront-viewer-country',
  'fastly-client-country',
  'x-appengine-country',
  'x-country-code',
];

export { DEFAULT_WATCH_REGION };

export function normalizeWatchRegion(value) {
  const normalized = String(value || '')
    .trim()
    .toUpperCase();

  if (!/^[A-Z]{2}$/.test(normalized) || UNKNOWN_REGION_CODES.has(normalized)) {
    return null;
  }

  return normalized;
}

export function resolveWatchRegionFromLocale(value) {
  const locale = String(value || '')
    .split(';')[0]
    .trim()
    .replace(/_/g, '-');

  if (!locale) {
    return null;
  }

  const parts = locale.split('-');

  for (const part of parts.slice(1)) {
    const region = normalizeWatchRegion(part);

    if (region) {
      return region;
    }
  }

  return null;
}

export function resolveWatchRegionFromAcceptLanguage(value) {
  return String(value || '')
    .split(',')
    .map((entry) => resolveWatchRegionFromLocale(entry))
    .find(Boolean);
}

export function resolveWatchRegionFromBrowser() {
  if (typeof navigator === 'undefined') {
    return null;
  }

  const locales = [...(Array.isArray(navigator.languages) ? navigator.languages : []), navigator.language];

  return locales.map((locale) => resolveWatchRegionFromLocale(locale)).find(Boolean) || null;
}

export function resolveWatchRegionFromRequestHeaders(requestHeaders) {
  const getHeader =
    requestHeaders && typeof requestHeaders.get === 'function' ? (key) => requestHeaders.get(key) : () => null;

  for (const headerName of GEO_COUNTRY_HEADERS) {
    const region = normalizeWatchRegion(getHeader(headerName));

    if (region) {
      return { region, source: 'geo' };
    }
  }

  const languageRegion = resolveWatchRegionFromAcceptLanguage(getHeader('accept-language'));

  if (languageRegion) {
    return { region: languageRegion, source: 'locale' };
  }

  return { region: DEFAULT_WATCH_REGION, source: 'fallback' };
}
