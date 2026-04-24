import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const REGEX_PATTERNS = {
  URL: /^https?:\/\/.+/,
};

const DEFAULT_USER_AVATAR = '/images/default-avatar.svg';
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

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

function resolveAvatarSource(user) {
  if (typeof user === 'string') {
    return user;
  }

  return user?.displayName || user?.name || user?.username || user?.email || user?.id || '';
}

function normalizeAvatarUrl(value) {
  const normalized = String(value || '').trim();

  if (!normalized) {
    return '';
  }

  const lowered = normalized.toLowerCase();

  if (lowered === 'null' || lowered === 'undefined' || lowered === 'http://' || lowered === 'https://') {
    return '';
  }

  if (normalized.startsWith('/') || normalized.startsWith('data:image/')) {
    return normalized;
  }

  return isValidUrl(normalized) ? resolveVersionedImageUrl(normalized) : '';
}

function extractVersionFromImageUrl(value) {
  const normalized = String(value || '').trim();

  if (!normalized || normalized.startsWith('data:image/') || normalized.startsWith('blob:')) {
    return '';
  }

  try {
    const parsed = normalized.startsWith('/') ? new URL(normalized, 'https://tvizzie.local') : new URL(normalized);
    const versionMatch = parsed.pathname.match(VERSIONED_IMAGE_PATH_PATTERN);
    return versionMatch?.[1] || '';
  } catch {
    return '';
  }
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
    const parsed = isRelativeUrl ? new URL(normalized, 'https://tvizzie.local') : new URL(normalized);

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

function resolveAvatarUrlCandidate(user = {}) {
  if (typeof user === 'string') {
    return normalizeAvatarUrl(user);
  }

  const candidates = [
    user?.avatarUrl,
    user?.avatar_url,
    user?.photoURL,
    user?.photoUrl,
    user?.picture,
    user?.image,
    user?.user_metadata?.avatar_url,
    user?.user_metadata?.picture,
    user?.user_metadata?.avatar,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeAvatarUrl(candidate);

    if (normalized) {
      return normalized;
    }
  }

  return '';
}

function getAvatarInitial(user, fallback = 'A') {
  const source = String(resolveAvatarSource(user) || '')
    .trim()
    .replace(/^@+/, '');

  if (!source) {
    return fallback;
  }

  const firstCharacter = source.includes('@') ? source.split('@')[0]?.[0] : source[0];

  return String(firstCharacter || fallback).toUpperCase();
}

function createInitialAvatarDataUrl(letter = 'A') {
  const normalizedLetter = String(letter || 'A')
    .trim()
    .slice(0, 1)
    .toUpperCase();

  const svg = `
 <svg width="256" height="256" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
 <rect width="256" height="256" fill="#F5F5F4"/>
 <text
 x="50%"
 y="50%"
 text-anchor="middle"
 dominant-baseline="central"
 fill="#111111"
 font-family="ui-sans-serif, system-ui, sans-serif"
 font-size="104"
 font-weight="600"
 >
 ${normalizedLetter}
 </text>
 </svg>
 `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function getUserAvatarFallbackUrl(user = {}, fallbackUrl = DEFAULT_USER_AVATAR) {
  const fallbackInitial = getAvatarInitial(user);

  if (fallbackInitial) {
    return createInitialAvatarDataUrl(fallbackInitial);
  }

  const normalizedFallback = normalizeAvatarUrl(fallbackUrl);
  return normalizedFallback || DEFAULT_USER_AVATAR;
}

export function getUserAvatarUrl(user = {}) {
  const rawAvatarUrl = resolveAvatarUrlCandidate(user);

  if (rawAvatarUrl) {
    return rawAvatarUrl;
  }

  return getUserAvatarFallbackUrl(user);
}

export function applyAvatarFallback(event, fallbackUrl = DEFAULT_USER_AVATAR) {
  const target = event?.currentTarget;

  if (!target || typeof target !== 'object') {
    return;
  }

  if (target.dataset?.avatarFallbackApplied === 'true') {
    return;
  }

  const normalizedFallback = normalizeAvatarUrl(fallbackUrl) || DEFAULT_USER_AVATAR;

  if (target.dataset) {
    target.dataset.avatarFallbackApplied = 'true';
  }

  target.src = normalizedFallback;
}

export function isBrowser() {
  return typeof window !== 'undefined';
}

export function isString(value) {
  return typeof value === 'string';
}

export function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isValidUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }
  return REGEX_PATTERNS.URL.test(url);
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

    return NEXT_IMAGE_ALLOWED_HOSTS.includes(hostname) || hostname.endsWith('.googleusercontent.com');
  } catch {
    return false;
  }
}

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

export function uniqueBy(items, key = 'id') {
  if (!Array.isArray(items)) return [];
  const getKey = typeof key === 'function' ? key : (item) => item?.[key];
  const map = new Map();
  items.forEach((item) => {
    const value = getKey(item);
    if (value === undefined || value === null) return;
    if (!map.has(value)) map.set(value, item);
  });
  return Array.from(map.values());
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

export function cleanString(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function getDataErrorCode(error) {
  return typeof error?.code === 'string' ? error.code.trim().toLowerCase() : '';
}

export function isPermissionDeniedError(error) {
  const errorCode = getDataErrorCode(error);

  if (errorCode === 'permission-denied') {
    return true;
  }

  const message = typeof error?.message === 'string' ? error.message.trim().toLowerCase() : '';

  return message.includes('missing or insufficient permissions') || message.includes('permission denied');
}

export function logDataError(message, error, options = {}) {
  const { suppressPermissionDenied = true } = options;

  if (suppressPermissionDenied && isPermissionDeniedError(error)) {
    return false;
  }

  console.error(message, error);
  return true;
}

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

export function pipe(...providers) {
  return providers.reduce(
    (AccumulatedProviders, [Provider, props = {}]) =>
      ({ children }) => (
        <AccumulatedProviders>
          <Provider {...props}>{children}</Provider>
        </AccumulatedProviders>
      ),
    ({ children }) => <>{children}</>
  );
}
