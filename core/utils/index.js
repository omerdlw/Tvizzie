import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  SLUG: /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/,
  URL: /^https?:\/\/.+/,
};

const DEFAULT_COLOR_FALLBACK = '#F9F8F4';
const DEFAULT_RGB = '0, 0, 0';
export const DEFAULT_USER_AVATAR = '/images/default-avatar.svg';
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

export function isFunction(value) {
  return typeof value === 'function';
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

function normalizeHex(hex) {
  if (!isString(hex)) return null;

  const value = hex.trim().replace('#', '');
  if (value.length === 3) {
    return value
      .split('')
      .map((char) => `${char}${char}`)
      .join('');
  }

  if (value.length === 6) return value;
  return null;
}

function parseRgbString(color) {
  if (!isString(color)) return null;

  const trimmed = color.trim();
  if (!/^rgba?\(/i.test(trimmed)) return null;

  const channels = trimmed
    .match(/\d+(?:\.\d+)?/g)
    ?.slice(0, 3)
    ?.map((value) => Math.round(Number(value)));

  if (!channels || channels.length < 3) return null;

  const [r, g, b] = channels;

  if ([r, g, b].some((channel) => Number.isNaN(channel) || channel < 0 || channel > 255)) {
    return null;
  }

  return `${r}, ${g}, ${b}`;
}

function resolveCssVar(value) {
  if (!isString(value)) return value;

  const trimmed = value.trim();
  const match = trimmed.match(/^var\(\s*(--[a-zA-Z0-9_-]+)\s*(?:,\s*([^)]+)\s*)?\)$/);
  if (!match) return trimmed;

  const cssVarName = match[1];
  const fallbackValue = match[2]?.trim() || null;

  if (!isBrowser()) return fallbackValue;

  const resolved = getComputedStyle(document.documentElement).getPropertyValue(cssVarName).trim();

  return resolved || fallbackValue;
}

function parseColorToRgb(value) {
  const resolved = resolveCssVar(value);
  if (!resolved) return null;

  const rgb = parseRgbString(resolved);
  if (rgb) return rgb;

  const normalizedHex = normalizeHex(resolved);
  if (!normalizedHex) return null;

  const r = parseInt(normalizedHex.slice(0, 2), 16);
  const g = parseInt(normalizedHex.slice(2, 4), 16);
  const b = parseInt(normalizedHex.slice(4, 6), 16);

  return `${r}, ${g}, ${b}`;
}

export function hexToRgb(value, fallback = DEFAULT_COLOR_FALLBACK) {
  return parseColorToRgb(value) || parseColorToRgb(fallback) || DEFAULT_RGB;
}

export function hexToRgba(value, alpha = 1, fallback = DEFAULT_COLOR_FALLBACK) {
  void alpha;

  const resolved = resolveCssVar(value) || resolveCssVar(fallback) || fallback;
  const normalizedHex = normalizeHex(resolved);

  if (normalizedHex) {
    return `#${normalizedHex}`;
  }

  const rgb = parseRgbString(resolved);

  if (rgb) {
    return `rgb(${rgb})`;
  }

  return resolved;
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

export function formatVotes(count) {
  if (!count || typeof count !== 'number') return null;
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

export function formatList(items, limit = 3) {
  if (!Array.isArray(items) || items.length === 0) return 'N/A';
  const names = items.map((item) => (typeof item === 'string' ? item : item?.name)).filter(Boolean);
  if (names.length === 0) return 'N/A';
  return names.slice(0, limit).join(', ');
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

