import { normalizeValue } from '@/domains/shell/shared/utils';
import { RESERVED_ACCOUNT_SEGMENTS } from './constants';

// ============================================================
// Username & Account Field Validation Helpers
// ============================================================

export function isReservedAccountSegment(value) {
  return RESERVED_ACCOUNT_SEGMENTS.has(
    String(value || '')
      .trim()
      .toLowerCase(),
  );
}

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 24;
const USERNAME_PATTERN = /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/;

const TURKISH_USERNAME_MAP = Object.freeze({
  ç: 'c',
  ğ: 'g',
  ı: 'i',
  ö: 'o',
  ş: 's',
  ü: 'u',
});

export function sanitizeUsername(value) {
  const normalized = normalizeValue(value)
    .toLowerCase()
    .replace(/[çğışüö]/g, (char) => TURKISH_USERNAME_MAP[char] || char);

  return normalized
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_');
}

export function validateUsername(value) {
  const username = sanitizeUsername(value);

  if (username.length < USERNAME_MIN_LENGTH || username.length > USERNAME_MAX_LENGTH) {
    throw new Error(
      `Username must be ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} characters long`,
    );
  }

  if (!USERNAME_PATTERN.test(username)) {
    throw new Error('Username can only contain lowercase letters, numbers, and hyphens');
  }

  if (isReservedAccountSegment(username)) {
    throw new Error('This username is reserved');
  }

  return username;
}

export function normalizeAccountDisplayNameSearchValue(value) {
  return normalizeValue(value).toLocaleLowerCase();
}

export function sanitizeAccountSearchTerm(value) {
  return normalizeValue(value)
    .replace(/[(),.%]/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 80)
    .trim();
}

export function normalizeProviderIds(value) {
  return Array.isArray(value) ? value : [];
}

export function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export function normalizeOptionalText(value) {
  return String(value || '').trim();
}

export function normalizeProviderDescriptors(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((provider) => ({
      email: normalizeEmail(provider?.email),
      id: String(provider?.id || '')
        .trim()
        .toLowerCase(),
      uid: String(provider?.uid || '').trim() || null,
    }))
    .filter((provider) => provider.id);
}

// ============================================================
// Data Error Utilities
// ============================================================

function getDataErrorCode(error) {
  return typeof error?.code === 'string' ? error.code.trim().toLowerCase() : '';
}

export function isPermissionDeniedError(error) {
  const errorCode = getDataErrorCode(error);

  if (errorCode === 'permission-denied') {
    return true;
  }

  const message = typeof error?.message === 'string' ? error.message.trim().toLowerCase() : '';

  return (
    message.includes('missing or insufficient permissions') || message.includes('permission denied')
  );
}

export function logDataError(message, error, options = {}) {
  const { suppressPermissionDenied = true } = options;

  if (suppressPermissionDenied && isPermissionDeniedError(error)) {
    return false;
  }

  console.error(message, error);
  return true;
}
