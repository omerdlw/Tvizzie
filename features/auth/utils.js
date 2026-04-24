'use client';

import { arePasswordRulesSatisfied, validatePasswordRules } from '@/core/auth/password-validation';
import { AUTH_DEFAULT_POST_LOGIN_PATH, sanitizeAuthNextPath } from '@/core/auth/oauth-callback';
import { AUTH_ERROR_MESSAGES, AUTH_ERROR_MESSAGE_PATTERNS, EMAIL_DOMAIN_PATTERNS } from './constants';

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
  return validatePasswordRules(value);
}

export function hasSatisfiedPasswordRequirements(value) {
  return arePasswordRulesSatisfied(value);
}

export function isPasswordRequirementError(error) {
  const message = String(error?.message || '')
    .trim()
    .toLowerCase();

  return (
    message.includes('password must be at least 8 characters long') ||
    message.includes('password must contain at least 1 number')
  );
}

export function isPasswordConfirmationMismatchError(error) {
  const message = String(error?.message || '')
    .trim()
    .toLowerCase();

  return message.includes('password confirmation does not match');
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

export function sanitizeNextPath(next, fallback = AUTH_DEFAULT_POST_LOGIN_PATH) {
  return sanitizeAuthNextPath(next, fallback);
}

export function resolvePostAuthRedirect(next) {
  return sanitizeNextPath(next, AUTH_DEFAULT_POST_LOGIN_PATH);
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
