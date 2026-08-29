import React from 'react';

const {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} = React || {};

export const Z_INDEX = Object.freeze({
  DEBUG_OVERLAY: 9999,
  MODAL_BACKDROP: 90,
  ERROR_OVERLAY: 200,
  NOTIFICATION: 110,
  NAV_BACKDROP: 40,
  BACKGROUND: -10,
  UI_ELEMENT: 10,
  DROPDOWN: 110,
  LOADING: 150,
  TOOLTIP: 250,
  SELECT: 120,
  MODAL: 100,
  NAV: 100,
});

export const SEMANTIC_SURFACE_CLASSES = Object.freeze({
  error: Object.freeze({
    icon: 'ring-1 ring-inset ring-error/10 bg-error/10 text-error',
    surface: 'bg-error/10 ring-1 ring-inset ring-error/50',
    description: 'text-error',
    title: 'text-error',
  }),
  info: Object.freeze({
    icon: 'ring-1 ring-inset ring-info/10 bg-info/10 text-info',
    surface: 'bg-info/10 ring-1 ring-inset ring-info/50',
    description: 'text-info',
    title: 'text-info',
  }),
  success: Object.freeze({
    icon: 'ring-1 ring-inset ring-success/10 bg-success/10 text-success',
    description: 'text-success',
    surface: 'bg-success/10 ring-1 ring-inset ring-success/50',
    title: 'text-success',
  }),
  warning: Object.freeze({
    icon: 'ring-1 ring-inset ring-warning/10 bg-warning/10 text-warning',
    description: 'text-warning',
    surface: 'bg-warning/20 ring-1 ring-inset ring-warning/50',
    title: 'text-warning',
  }),
});

export const DESTRUCTIVE_ACTION_TONE_CLASS =
  'ring-1 ring-inset ring-error/10 bg-error/10 text-error hover:bg-error hover:text-black hover:ring-error';

export const INFO_ACTION_TONE_CLASS =
  'ring-1 ring-inset ring-info/10 bg-info/10 text-info hover:bg-info hover:text-black hover:ring-info';

export const SUCCESS_ACTION_TONE_CLASS =
  'ring-1 ring-inset ring-success/10 bg-success/10 text-success hover:bg-success hover:text-black hover:ring-success';

export const WARNING_ACTION_TONE_CLASS =
  'ring-1 ring-inset ring-warning/10 bg-warning/10 text-warning hover:bg-warning hover:text-black hover:ring-warning';

export const TMDB_API_URL = 'https://api.themoviedb.org/3';
export const TMDB_IMG = 'https://image.tmdb.org/t/p';
export const PAGE_SHELL_MAX_WIDTH_CLASS = 'max-w-6xl';
export const HOME_PAGE_MAX_WIDTH_CLASS = 'max-w-screen-2xl';
export const ACCOUNT_ROUTE_MAX_WIDTH_CLASS = PAGE_SHELL_MAX_WIDTH_CLASS;
export const ACCOUNT_ROUTE_SHELL_CLASS = `mx-auto box-border w-full ${ACCOUNT_ROUTE_MAX_WIDTH_CLASS}`;
export const ACCOUNT_SECTION_SHELL_CLASS = `${ACCOUNT_ROUTE_SHELL_CLASS} account-detail-section-shell`;

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

export function chunkArray(values = [], size = 100) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

export function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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

export const MOVIE_MEDIA_TYPE = 'movie';
export const PERSON_MEDIA_TYPE = 'person';
export const TV_MEDIA_TYPE = 'tv';
export const LIST_SUBJECT_TYPE = 'list';
export const USER_SUBJECT_TYPE = 'user';

export function normalizeMediaType(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export function isMovieMediaType(value) {
  return normalizeMediaType(value) === MOVIE_MEDIA_TYPE;
}

export function isPersonMediaType(value) {
  return normalizeMediaType(value) === PERSON_MEDIA_TYPE;
}

export function isTvMediaType(value) {
  return normalizeMediaType(value) === TV_MEDIA_TYPE;
}

export function isTitleMediaType(value) {
  const normalizedType = normalizeMediaType(value);
  return normalizedType === MOVIE_MEDIA_TYPE || normalizedType === TV_MEDIA_TYPE;
}

export function isListSubjectType(value) {
  return normalizeMediaType(value) === LIST_SUBJECT_TYPE;
}

export function isUserSubjectType(value) {
  return normalizeMediaType(value) === USER_SUBJECT_TYPE;
}

export function resolveExplicitMediaType(item = {}, fallbackValue = '') {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return normalizeMediaType(item || fallbackValue);
  }

  return normalizeMediaType(item?.entityType ?? item?.media_type ?? item?.type ?? fallbackValue);
}

export function isTvReference(value) {
  const normalizedValue = String(value || '').trim();

  return normalizedValue.startsWith('/tv/') || normalizedValue.includes('tv_');
}

export function isSupportedContentSubjectType(value) {
  return isTitleMediaType(value) || isListSubjectType(value) || isUserSubjectType(value);
}

export function getMediaDetailPath({ entityId, entityType, id, media_type: mediaType } = {}) {
  const resolvedType = normalizeMediaType(entityType || mediaType);
  const resolvedId = String(entityId ?? id ?? '').trim();

  if (!resolvedId || !isTitleMediaType(resolvedType)) {
    return null;
  }

  return `/${resolvedType}/${resolvedId}`;
}

export const MOTION_EASINGS = Object.freeze({
  CINEMATIC: Object.freeze([0.76, 0, 0.24, 1]),
  EMPHASIZED: Object.freeze([0.16, 1, 0.3, 1]),
  SOFT: Object.freeze([0.22, 1, 0.36, 1]),
  EXIT: Object.freeze([0.7, 0, 0.84, 0]),
  SOFT_EXIT: Object.freeze([0.4, 0, 0.2, 1]),
});

export const MOTION_SPRINGS = Object.freeze({
  PRESS: Object.freeze({ type: 'spring', stiffness: 520, damping: 30, mass: 0.28 }),
  BADGE: Object.freeze({ type: 'spring', stiffness: 360, damping: 20, mass: 0.42 }),
  PANEL: Object.freeze({ type: 'spring', stiffness: 180, damping: 24, mass: 0.8 }),
  FEEDBACK: Object.freeze({ type: 'spring', stiffness: 320, damping: 26, mass: 0.5 }),
});

const HTTP_URL_PATTERN = /^https?:\/\/.+/;

export function isValidUrl(url) {
  return typeof url === 'string' && HTTP_URL_PATTERN.test(url);
}

export const ACCOUNT_SECTION_KEYS = Object.freeze([
  'activity',
  'diary',
  'likes',
  'watched',
  'watchlist',
  'reviews',
  'lists',
]);

export const RESERVED_ACCOUNT_SEGMENTS = new Set([...ACCOUNT_SECTION_KEYS, 'edit']);

export function isReservedAccountSegment(value) {
  return RESERVED_ACCOUNT_SEGMENTS.has(
    String(value || '')
      .trim()
      .toLowerCase(),
  );
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

const NEXT_IMAGE_ALLOWED_HOSTS = Object.freeze([
  'image.tmdb.org',
  'media.themoviedb.org',
  'www.themoviedb.org',
  'themoviedb.org',
  'assets.themoviedb.org',
  'i.ytimg.com',
  'img.youtube.com',
  'm.media-amazon.com',
  'api.dicebear.com',
  'lh3.googleusercontent.com',
  'i.pinimg.com',
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

const CSRF_COOKIE_NAME = 'tvz_auth_csrf';
const CSRF_ENDPOINT = '/api/auth/csrf';
const RETRIABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

let csrfRequest = null;

export class ApiRequestError extends Error {
  constructor(payload, fallbackMessage = 'Request failed', status = 0) {
    super(payload?.error || payload?.message || fallbackMessage);
    this.name = 'ApiRequestError';
    this.code = payload?.code || null;
    this.data = payload || null;
    this.status = status;
  }
}

function buildUrl(path, query = {}) {
  const params = new URLSearchParams();

  Object.entries(query || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params.set(key, String(value));
  });

  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
}

function readBrowserCookie(name) {
  if (typeof document === 'undefined') return '';

  const prefix = `${name}=`;
  const entry = String(document.cookie || '')
    .split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(prefix));

  if (!entry) return '';

  try {
    return decodeURIComponent(entry.slice(prefix.length));
  } catch {
    return '';
  }
}

function hasHeader(headers, targetName) {
  const normalizedTarget = targetName.toLowerCase();
  return Object.keys(headers).some((name) => name.toLowerCase() === normalizedTarget);
}

function isFormData(value) {
  return typeof FormData !== 'undefined' && value instanceof FormData;
}

function createRequestBody(body, headers) {
  if (body === undefined) return undefined;
  if (isFormData(body)) return body;

  if (!hasHeader(headers, 'Content-Type')) {
    headers['Content-Type'] = 'application/json';
  }

  return JSON.stringify(body);
}

function createTimeout(timeoutMs) {
  const controller = new AbortController();
  const duration = Number(timeoutMs);
  const timeoutId =
    Number.isFinite(duration) && duration > 0
      ? setTimeout(() => controller.abort(), duration)
      : null;

  return {
    signal: timeoutId ? controller.signal : undefined,
    clear: () => {
      if (timeoutId) clearTimeout(timeoutId);
    },
  };
}

function isRetriableNetworkError(error) {
  return ['ETIMEDOUT', 'ECONNRESET', 'UND_ERR_CONNECT_TIMEOUT'].includes(error?.code);
}

function wait(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(delayMs) || 0)));
}

function getCsrfToken() {
  return readBrowserCookie(CSRF_COOKIE_NAME);
}

async function ensureCsrfToken({ force = false } = {}) {
  const existingToken = !force && getCsrfToken();
  if (existingToken) return existingToken;
  if (!force && csrfRequest) return csrfRequest;

  const request = requestJson(CSRF_ENDPOINT, {
    csrf: false,
    fallbackMessage: 'CSRF token could not be initialized',
    retryCount: 0,
  })
    .then((payload) => {
      if (!payload?.csrfToken) {
        throw new ApiRequestError(payload, 'CSRF token could not be initialized');
      }
      return payload.csrfToken;
    })
    .finally(() => {
      if (csrfRequest === request) csrfRequest = null;
    });

  csrfRequest = request;
  return request;
}

export async function requestJson(
  path,
  {
    body,
    cache = 'no-store',
    credentials = 'include',
    csrf = true,
    fallbackMessage = 'Request failed',
    headers = {},
    keepalive = false,
    method = 'GET',
    query = null,
    retryCount,
    retryDelayMs = 120,
    timeoutMs = 15000,
  } = {},
) {
  const normalizedMethod = String(method || 'GET').toUpperCase();
  const maxAttempts = Math.max(
    1,
    Number(retryCount === undefined ? (normalizedMethod === 'GET' ? 1 : 0) : retryCount) + 1,
  );
  const requestHeaders = { Accept: 'application/json', ...headers };

  if (csrf && !SAFE_METHODS.has(normalizedMethod) && !hasHeader(requestHeaders, 'X-CSRF-Token')) {
    requestHeaders['X-CSRF-Token'] = await ensureCsrfToken();
  }

  const requestBody = createRequestBody(body, requestHeaders);
  const url = buildUrl(path, query);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const timeout = createTimeout(timeoutMs);

    try {
      const response = await fetch(url, {
        body: requestBody,
        cache,
        credentials,
        headers: requestHeaders,
        keepalive,
        method: normalizedMethod,
        signal: timeout.signal,
      });
      const payload = await response.json().catch(() => null);

      if (response.ok) return payload;

      const error = new ApiRequestError(payload, fallbackMessage, response.status);
      if (attempt >= maxAttempts || !RETRIABLE_STATUS_CODES.has(response.status)) throw error;
    } catch (error) {
      const normalizedError =
        error?.name === 'AbortError'
          ? Object.assign(new ApiRequestError(null, 'Request timed out', 408), {
              code: 'ETIMEDOUT',
            })
          : error;
      const canRetry =
        attempt < maxAttempts &&
        (isRetriableNetworkError(normalizedError) ||
          RETRIABLE_STATUS_CODES.has(Number(normalizedError?.status)));

      if (!canRetry) throw normalizedError;
    } finally {
      timeout.clear();
    }

    await wait(retryDelayMs);
  }

  throw new ApiRequestError(null, fallbackMessage);
}

class EventEmitter {
  constructor() {
    this.events = {};
    this.debugMode = false;
  }

  setDebugMode(enabled) {
    this.debugMode = Boolean(enabled);
  }

  subscribe(event, callback) {
    if (typeof event !== 'string' || !event) {
      return () => {};
    }

    if (typeof callback !== 'function') {
      return () => {};
    }

    if (!this.events[event]) {
      this.events[event] = [];
    }

    this.events[event].push(callback);

    if (this.debugMode) {
      console.debug(`[Events] Subscribed to ${event}, total: ${this.events[event].length}`);
    }

    const unsubscribe = () => {
      this.events[event] = this.events[event].filter((cb) => cb !== callback);

      if (this.debugMode) {
        console.debug(`[Events] Unsubscribed from ${event}`);
      }
    };

    return unsubscribe;
  }

  emit(event, data) {
    if (typeof event !== 'string' || !event) {
      return;
    }

    if (this.debugMode) {
      console.debug(`[Events] Emitting ${event}`, data);
    }

    if (this.events[event]) {
      this.events[event].forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[Events] Error in listener for ${event}:`, error);
        }
      });
    }
  }

  unsubscribeAll(event) {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }

  hasListeners(event) {
    return Boolean(this.events[event]?.length);
  }

  getListenerCount(event) {
    return this.events[event]?.length || 0;
  }

  getAllEvents() {
    return Object.keys(this.events);
  }
}

export const globalEvents = new EventEmitter();

export const EVENT_TYPES = {
  API_UNAUTHORIZED: 'API_UNAUTHORIZED',
  API_FORBIDDEN: 'API_FORBIDDEN',
  API_ERROR: 'API_ERROR',
  API_RETRY: 'API_RETRY',
  APP_ERROR: 'APP_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  AUTH_READY: 'AUTH_READY',
  AUTH_REFRESH: 'AUTH_REFRESH',
  AUTH_SIGN_IN: 'AUTH_SIGN_IN',
  AUTH_SIGN_OUT: 'AUTH_SIGN_OUT',
  AUTH_SIGN_UP: 'AUTH_SIGN_UP',
  AUTH_FEEDBACK: 'AUTH_FEEDBACK',
  AUTH_UPDATE: 'AUTH_UPDATE',
  AUTH_ACCOUNT_DELETE_START: 'AUTH_ACCOUNT_DELETE_START',
  AUTH_ACCOUNT_DELETE_END: 'AUTH_ACCOUNT_DELETE_END',

  MODULE_INIT: 'MODULE_INIT',
  MODULE_READY: 'MODULE_READY',
  MODULE_ERROR: 'MODULE_ERROR',
  MODULE_CLEANUP: 'MODULE_CLEANUP',

  STATE_CHANGE: 'STATE_CHANGE',
  REGISTRY_UPDATE: 'REGISTRY_UPDATE',

  NAV_EXPAND: 'NAV_EXPAND',
  NAV_COLLAPSE: 'NAV_COLLAPSE',
  NAV_NAVIGATE: 'NAV_NAVIGATE',
  NAV_NOT_FOUND: 'NAV_NOT_FOUND',

  MODAL_OPEN: 'MODAL_OPEN',
  MODAL_CLOSE: 'MODAL_CLOSE',

  LOADING_START: 'LOADING_START',
  LOADING_END: 'LOADING_END',

  TRANSITION_START: 'TRANSITION_START',
  TRANSITION_END: 'TRANSITION_END',
};



export function useClickOutside(ref, callback) {
  const handleClick = useCallback(
    (event) => {
      if (ref?.current && !ref.current.contains(event.target)) {
        callback(event);
      }
    },
    [ref, callback],
  );

  useEffect(() => {
    if (!ref || typeof callback !== 'function') {
      return;
    }

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [ref, callback, handleClick]);
}



export function useDebounce(value, delayMs) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delayMs]);

  return debouncedValue;
}



const SMOOTH_SCROLL_LOCK_EVENT = 'tvizzie:smooth-scroll-lock';
const DRAG_SPEED = 1.35;
const DRAG_THRESHOLD = 6;
const WHEEL_IDLE_DELAY = 120;
const PIXELS_PER_LINE = 16;
const DOM_DELTA_LINE = 1;
const DOM_DELTA_PAGE = 2;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getMaxScrollLeft(element) {
  return Math.max(0, element.scrollWidth - element.clientWidth);
}

function getWheelDelta(event, element) {
  const hasHorizontalIntent =
    Math.abs(event.deltaX) > 0 && Math.abs(event.deltaX) > Math.abs(event.deltaY);
  const axisDelta = hasHorizontalIntent ? event.deltaX : event.shiftKey ? event.deltaY : 0;

  if (!axisDelta) {
    return 0;
  }

  if (event.deltaMode === DOM_DELTA_LINE) {
    return axisDelta * PIXELS_PER_LINE;
  }

  if (event.deltaMode === DOM_DELTA_PAGE) {
    return axisDelta * element.clientWidth;
  }

  return axisDelta;
}

function eventPathIncludes(event, element) {
  if (typeof event.composedPath === 'function') {
    return event.composedPath().includes(element);
  }

  return element.contains(event.target);
}

export function useDraggableScroll() {
  const ref = useRef(null);
  const lockSource = `draggable-scroll-${useId()}`;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;
    let isDragging = false;
    let hasMovedSignificantly = false;
    let lastDragEndTime = 0;
    let wheelIdleTimeout = 0;
    let lastPointerX = 0;
    let lastPointerTime = 0;
    let pointerVelocity = 0;
    let isWheelActive = false;
    let isSmoothScrollLocked = false;

    const setSmoothScrollLocked = (locked) => {
      if (isSmoothScrollLocked === locked) return;

      isSmoothScrollLocked = locked;
      window.dispatchEvent(
        new CustomEvent(SMOOTH_SCROLL_LOCK_EVENT, {
          detail: {
            locked,
            source: lockSource,
          },
        }),
      );
    };

    const restoreScrollBehavior = () => {
      if (isDown || isWheelActive) return;
      el.style.scrollBehavior = '';
    };

    const suppressNativeSmooth = () => {
      el.style.scrollBehavior = 'auto';
    };

    const releaseInteraction = () => {
      if (isDown || isWheelActive) return;
      setSmoothScrollLocked(false);
    };

    const handleMouseDown = (e) => {
      if (e.button !== 0) return;
      isDown = true;
      isDragging = false;
      hasMovedSignificantly = false;
      el.classList.add('cursor-grabbing');
      el.classList.remove('cursor-pointer');
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
      lastPointerX = e.pageX;
      lastPointerTime = performance.now();
      pointerVelocity = 0;
      suppressNativeSmooth();
    };

    const handleMouseLeave = () => {
      if (isDragging || hasMovedSignificantly) {
        lastDragEndTime = performance.now();
      }
      isDown = false;
      el.classList.remove('cursor-grabbing');
      restoreScrollBehavior();
      releaseInteraction();
    };

    const handleMouseUp = () => {
      if (isDragging || hasMovedSignificantly) {
        lastDragEndTime = performance.now();
      }
      isDown = false;
      el.classList.remove('cursor-grabbing');

      if (isDragging) {
        el.scrollLeft = clamp(el.scrollLeft - pointerVelocity * 220, 0, getMaxScrollLeft(el));
        restoreScrollBehavior();
        releaseInteraction();
      } else {
        restoreScrollBehavior();
        releaseInteraction();
      }

      setTimeout(() => {
        isDragging = false;
        hasMovedSignificantly = false;
      }, 200);
    };

    const handleMouseMove = (e) => {
      if (!isDown) return;

      const x = e.pageX - el.offsetLeft;
      const walk = (x - startX) * DRAG_SPEED;
      const now = performance.now();
      const elapsed = Math.max(1, now - lastPointerTime);

      pointerVelocity = (e.pageX - lastPointerX) / elapsed;
      lastPointerX = e.pageX;
      lastPointerTime = now;

      if (Math.abs(walk) > DRAG_THRESHOLD) {
        isDragging = true;
        hasMovedSignificantly = true;
        setSmoothScrollLocked(true);
      }

      if (isDragging) {
        e.preventDefault();
        el.scrollLeft = clamp(scrollLeft - walk, 0, getMaxScrollLeft(el));
      }
    };

    const handleWheel = (e) => {
      if (!eventPathIncludes(e, el)) return;

      const maxScrollLeft = getMaxScrollLeft(el);
      if (!maxScrollLeft) return;

      const delta = getWheelDelta(e, el);
      const canMove =
        (delta > 0 && el.scrollLeft < maxScrollLeft - 1) || (delta < 0 && el.scrollLeft > 1);

      if (!canMove) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();
      isWheelActive = true;
      setSmoothScrollLocked(true);
      suppressNativeSmooth();
      el.scrollLeft = clamp(el.scrollLeft + delta * 0.9, 0, maxScrollLeft);

      window.clearTimeout(wheelIdleTimeout);
      wheelIdleTimeout = window.setTimeout(() => {
        isWheelActive = false;
        restoreScrollBehavior();
        releaseInteraction();
      }, WHEEL_IDLE_DELAY);
    };

    const handleClick = (e) => {
      if (isDragging || hasMovedSignificantly || performance.now() - lastDragEndTime < 250) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
      }
    };

    el.addEventListener('mousedown', handleMouseDown);
    el.addEventListener('mouseleave', handleMouseLeave);
    el.addEventListener('mouseup', handleMouseUp);
    el.addEventListener('mousemove', handleMouseMove);
    el.addEventListener('wheel', handleWheel, { capture: true, passive: false });
    el.addEventListener('click', handleClick, { capture: true });

    return () => {
      window.clearTimeout(wheelIdleTimeout);
      setSmoothScrollLocked(false);
      el.removeEventListener('mousedown', handleMouseDown);
      el.removeEventListener('mouseleave', handleMouseLeave);
      el.removeEventListener('mouseup', handleMouseUp);
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('wheel', handleWheel, true);
      el.removeEventListener('click', handleClick, true);
    };
  }, [lockSource]);

  return ref;
}

