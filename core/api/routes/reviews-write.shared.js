import 'server-only';

import { normalizeValue } from '@/core/utils/string';

export const REVIEW_MIN_LENGTH = 10;

export { normalizeValue };

export function normalizeOptionalNumber(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error('Invalid numeric value');
  }

  return parsed;
}

export function normalizePayloadObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value;
}

export function resolveWriteStatusCode(message) {
  const normalizedMessage = normalizeValue(message).toLowerCase();

  if (
    normalizedMessage.includes('authentication session is required') ||
    normalizedMessage.includes('invalid or expired authentication token') ||
    normalizedMessage.includes('authentication token has been revoked')
  ) {
    return 401;
  }

  if (
    normalizedMessage.includes('required') ||
    normalizedMessage.includes('invalid') ||
    normalizedMessage.includes('cannot') ||
    normalizedMessage.includes('unsupported') ||
    normalizedMessage.includes('not found')
  ) {
    return 400;
  }

  return 500;
}
