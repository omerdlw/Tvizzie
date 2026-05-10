import 'server-only';

export function normalizeValue(value) {
  return String(value || '').trim();
}

export function toLowercase(value) {
  return normalizeValue(value).toLowerCase();
}

export function decodeJwtPayload(token) {
  const normalizedToken = normalizeValue(token);

  if (!normalizedToken) {
    return {};
  }

  const parts = normalizedToken.split('.');

  if (parts.length < 2) {
    return {};
  }

  try {
    const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
    const payload = JSON.parse(payloadJson);

    if (payload && typeof payload === 'object') {
      return payload;
    }
  } catch {
    return {};
  }

  return {};
}

export function toIsoDate(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}
