'use client';

import { AUTH_ERROR_MESSAGES, AUTH_ERROR_MESSAGE_PATTERNS, AUTH_ROUTES, EMAIL_DOMAIN_PATTERNS } from './constants';

const REDIRECT_BASE_ORIGIN = 'https://tvizzie.local';
const REDIRECT_FALLBACK_PATH = '/account';
const REDIRECT_BLOCKED_PATHS = new Set([AUTH_ROUTES.SIGN_IN, AUTH_ROUTES.SIGN_UP]);

export function createError(code, message = null) {
  const error = new Error(message || code);
  error.code = code;
  return error;
}

export function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export function isEmailIdentifier(value) {
  return String(value || '').includes('@');
}

export function validatePassword(value) {
  const password = String(value || '');

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    throw new Error('Password must contain at least 1 uppercase letter');
  }

  if (!/\d/.test(password)) {
    throw new Error('Password must contain at least 1 number');
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    throw new Error('Password must contain at least 1 symbol');
  }

  return password;
}

export function validateAllowedEmailDomain(value) {
  const email = normalizeEmail(value);
  const parts = email.split('@');

  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error('Enter a valid email address');
  }

  const domain = parts[1];
  const isAllowed = EMAIL_DOMAIN_PATTERNS.some((pattern) => pattern.test(domain));

  if (!isAllowed) {
    throw new Error(
      'Only supported email domains are allowed: gmail, outlook, hotmail, yandex, yahoo, protonmail, icloud'
    );
  }

  return email;
}

export function resolveAuthErrorMessage(error, fallbackMessage) {
  const code = String(error?.code || '').trim();

  if (AUTH_ERROR_MESSAGES[code]) {
    return AUTH_ERROR_MESSAGES[code];
  }

  const message = String(error?.message || '').trim();

  if (AUTH_ERROR_MESSAGES[message]) {
    return AUTH_ERROR_MESSAGES[message];
  }

  for (const [pattern, readableMessage] of AUTH_ERROR_MESSAGE_PATTERNS) {
    if (message.includes(pattern)) {
      return readableMessage;
    }
  }

  const providerCodeMatch = message.match(/\((auth\/[^)]+)\)/);
  if (providerCodeMatch?.[1] && AUTH_ERROR_MESSAGES[providerCodeMatch[1]]) {
    return AUTH_ERROR_MESSAGES[providerCodeMatch[1]];
  }

  if (message && !message.includes('Supabase error')) {
    return message;
  }

  return fallbackMessage || 'Request could not be completed. Please try again';
}

export function resolveVerificationErrorMessage(error, fallbackMessage) {
  const message = String(error?.message || '').trim();

  if (message.includes('Verification code is invalid')) {
    return 'Verification code is invalid';
  }

  if (message.includes('Verification code has expired')) {
    return 'Verification code has expired. Request a new code';
  }

  if (message.includes('Verification code has already been used')) {
    return 'Verification code already used. Request a new code';
  }

  if (message.includes('Verification could not be completed')) {
    return 'Verification could not be completed. Request a new code and try again';
  }

  if (
    message.includes('Pending sign-in session was not found') ||
    message.includes('Pending sign-in session has expired')
  ) {
    return 'Your login verification session expired. Sign in again';
  }

  if (message.includes('Verification code attempts are exhausted')) {
    return 'Too many invalid code attempts. Request a new code';
  }

  if (message.includes('Current password is incorrect') || message.includes('INVALID_LOGIN_CREDENTIALS')) {
    return 'Current password is incorrect';
  }

  if (message && !message.includes('Supabase error')) {
    return message;
  }

  return fallbackMessage;
}

export function formatVerificationExpiry(expiresAt) {
  if (!expiresAt) return null;
  const date = new Date(expiresAt);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function resolveVerificationTimestamp(value) {
  if (value === undefined || value === null || value === '') {
    return 0;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const parsedNumber = Number(value);

  if (Number.isFinite(parsedNumber) && parsedNumber > 0) {
    return parsedNumber;
  }

  const parsedDate = new Date(value).getTime();

  if (Number.isFinite(parsedDate) && parsedDate > 0) {
    return parsedDate;
  }

  return 0;
}

export function sanitizeNextPath(next, fallback = REDIRECT_FALLBACK_PATH) {
  const rawValue = String(next || '').trim();

  if (!rawValue) {
    return fallback;
  }

  if (!rawValue.startsWith('/') || rawValue.startsWith('//')) {
    return fallback;
  }

  try {
    const parsed = new URL(rawValue, REDIRECT_BASE_ORIGIN);
    const normalizedPath = `${parsed.pathname}${parsed.search}${parsed.hash}`;

    if (parsed.origin !== REDIRECT_BASE_ORIGIN || REDIRECT_BLOCKED_PATHS.has(parsed.pathname)) {
      return fallback;
    }

    return normalizedPath;
  } catch {
    return fallback;
  }
}

export function resolvePostAuthRedirect(next) {
  return sanitizeNextPath(next, REDIRECT_FALLBACK_PATH);
}

export function getCurrentPathWithSearch(pathname, searchParams) {
  const normalizedPath = typeof pathname === 'string' && pathname.startsWith('/') ? pathname : '/';
  const query = searchParams?.toString?.();

  if (!query) {
    return normalizedPath;
  }

  return `${normalizedPath}?${query}`;
}

export function buildAuthHref(pathname, { next, email, identifier, notice } = {}) {
  const params = new URLSearchParams();
  const safeNext = sanitizeNextPath(next, '');

  if (safeNext) {
    params.set('next', safeNext);
  }

  const normalizedIdentifier = String(identifier || '').trim();
  const normalizedEmail = normalizeEmail(email);
  const normalizedNotice = String(notice || '').trim();

  if (normalizedIdentifier) {
    params.set('identifier', normalizedIdentifier);
  }

  if (normalizedEmail) {
    params.set('email', normalizedEmail);
  }

  if (normalizedNotice) {
    params.set('notice', normalizedNotice);
  }

  const query = params.toString();

  if (!query) {
    return pathname;
  }

  return `${pathname}?${query}`;
}
