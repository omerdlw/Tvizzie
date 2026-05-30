import { resolveVersionedImageUrl } from './image';
import { isValidUrl } from './url';

const DEFAULT_USER_AVATAR = '/images/default-avatar.svg';

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
