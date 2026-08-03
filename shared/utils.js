import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ============================================================
// String Utilities
// ============================================================

export function normalizeValue(value) {
  return String(value || '').trim();
}

export function normalizeLowerValue(value) {
  return normalizeValue(value).toLowerCase();
}

export function normalizeEmailValue(value) {
  return normalizeLowerValue(value);
}

export function cleanString(value) {
  if (value === undefined || value === null) return '';
  return normalizeValue(value);
}

// ============================================================
// Type Utilities
// ============================================================

export function isBrowser() {
  return typeof window !== 'undefined';
}

export function isString(value) {
  return typeof value === 'string';
}

export function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// ============================================================
// Number Utilities
// ============================================================

export function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

// ============================================================
// URL Utilities
// ============================================================

const REGEX_PATTERNS = {
  URL: /^https?:\/\/.+/,
};

export function isValidUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }
  return REGEX_PATTERNS.URL.test(url);
}

// ============================================================
// Classnames
// ============================================================

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// ============================================================
// Format Utilities
// ============================================================

export function formatDate(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatYear(value) {
  if (!value) return 'N/A';
  const year = String(value).slice(0, 4);
  return year || 'N/A';
}

export function formatRuntime(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return 'N/A';
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (!hours) return `${mins} minutes`;
  if (!mins) return `${hours} hours`;
  return `${hours} hours ${mins} minutes`;
}

export function formatCurrency(value) {
  if (!Number.isFinite(value) || value <= 0) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function normalizeTimestamp(value) {
  if (!value) return null;

  if (typeof value?.toDate === 'function') {
    return value.toDate().toISOString();
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.toISOString();
}

// ============================================================
// Feedback Utilities
// ============================================================

export function normalizeFeedbackText(value) {
  if (typeof value !== 'string') {
    return value;
  }

  let normalizedValue = value.replace(/\u2026/g, '...').trim();

  while (normalizedValue.endsWith('...') || normalizedValue.endsWith('.')) {
    normalizedValue = normalizedValue.endsWith('...')
      ? normalizedValue.slice(0, -3).trimEnd()
      : normalizedValue.slice(0, -1).trimEnd();
  }

  return normalizedValue;
}

export function normalizeFeedbackContent(value) {
  return typeof value === 'string' ? normalizeFeedbackText(value) : value;
}

// ============================================================
// React Utilities
// ============================================================

export function pipe(...providers) {
  return providers.reduce(
    (AccumulatedProviders, [Provider, props = {}]) =>
      ({ children }) => (
        <AccumulatedProviders>
          <Provider {...props}>{children}</Provider>
        </AccumulatedProviders>
      ),
    ({ children }) => <>{children}</>,
  );
}

// ============================================================
// Image Utilities
// ============================================================

const NEXT_IMAGE_ALLOWED_HOSTS = Object.freeze([
  'image.tmdb.org',
  'i.ytimg.com',
  'img.youtube.com',
  'm.media-amazon.com',
  'api.dicebear.com',
  'lh3.googleusercontent.com',
]);

const IMAGE_QUALITY_PRESETS = Object.freeze({
  hero: 88,
  feature: 82,
  poster: 78,
  grid: 74,
  thumbnail: 72,
});

const VERSIONED_IMAGE_PATH_PATTERN = /-(\d{13})-[^/]+\.[a-z0-9]+$/i;

function extractVersionFromImageUrl(value) {
  const normalized = String(value || '').trim();

  if (!normalized || normalized.startsWith('data:image/') || normalized.startsWith('blob:')) {
    return '';
  }

  try {
    const parsed = normalized.startsWith('/')
      ? new URL(normalized, 'https://tvizzie.local')
      : new URL(normalized);
    const versionMatch = parsed.pathname.match(VERSIONED_IMAGE_PATH_PATTERN);
    return versionMatch?.[1] || '';
  } catch {
    return '';
  }
}

function hashString(value) {
  const input = String(value || '');
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

function getPlaceholderColor(seed) {
  const hash = hashString(seed);
  const hue = hash % 360;
  const saturation = 24 + (hash % 16);
  const lightness = 18 + (hash % 10);

  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

export function resolveVersionedImageUrl(value, version = '') {
  const normalized = String(value || '').trim();

  if (!normalized || normalized.startsWith('data:image/') || normalized.startsWith('blob:')) {
    return normalized;
  }

  const resolvedVersion = String(version || extractVersionFromImageUrl(normalized)).trim();

  if (!resolvedVersion) {
    return normalized;
  }

  try {
    const isRelativeUrl = normalized.startsWith('/');
    const parsed = isRelativeUrl
      ? new URL(normalized, 'https://tvizzie.local')
      : new URL(normalized);

    if (parsed.searchParams.get('v') === resolvedVersion) {
      return normalized;
    }

    parsed.searchParams.set('v', resolvedVersion);

    return isRelativeUrl ? `${parsed.pathname}${parsed.search}${parsed.hash}` : parsed.toString();
  } catch {
    return normalized;
  }
}

export function resolveImageQuality(preset = 'poster', explicitQuality = undefined) {
  const parsedQuality = Number(explicitQuality);

  if (Number.isFinite(parsedQuality) && parsedQuality > 0) {
    return parsedQuality;
  }

  return IMAGE_QUALITY_PRESETS[preset] ?? IMAGE_QUALITY_PRESETS.poster;
}

export function resolveImageLoading({ loading, priority = false } = {}) {
  if (priority) {
    return loading === 'lazy' ? undefined : loading;
  }

  return loading || 'lazy';
}

export function resolveImageFetchPriority({ fetchPriority, priority = false } = {}) {
  if (fetchPriority) {
    return fetchPriority;
  }

  return priority ? 'high' : undefined;
}

export function canUseNextImageOptimization(src) {
  const value = String(src || '').trim();

  if (!value) {
    return false;
  }

  if (value.startsWith('/') || value.startsWith('data:image/') || value.startsWith('blob:')) {
    return true;
  }

  try {
    const { hostname, protocol } = new URL(value);

    if (!['http:', 'https:'].includes(protocol)) {
      return false;
    }

    return (
      NEXT_IMAGE_ALLOWED_HOSTS.includes(hostname) || hostname.endsWith('.googleusercontent.com')
    );
  } catch {
    return false;
  }
}

export function getImagePlaceholderDataUrl(seed, { width = 64, height = 64 } = {}) {
  const background = getPlaceholderColor(seed);
  const highlight = getPlaceholderColor(`${seed}-highlight`);
  const svg = `
 <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
 <defs>
 <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
 <stop offset="0%" stop-color="${background}" />
 <stop offset="100%" stop-color="${highlight}" />
 </linearGradient>
 </defs>
 <rect width="${width}" height="${height}" fill="url(#bg)" />
 </svg>
 `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
