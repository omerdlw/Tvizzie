const AUDIT_ENDPOINT = '/api/auth/audit';

const SENSITIVE_FIELD_PATTERNS = [/password/i, /token/i, /secret/i, /code/i];

function sanitizeMetadata(value, depth = 0) {
  if (depth > 3) {
    return '[depth-limited]';
  }

  if (Array.isArray(value)) {
    return value.slice(0, 25).map((item) => sanitizeMetadata(item, depth + 1));
  }

  if (value && typeof value === 'object') {
    const nextObject = {};

    for (const [key, currentValue] of Object.entries(value)) {
      const isSensitive = SENSITIVE_FIELD_PATTERNS.some((pattern) => pattern.test(key));

      nextObject[key] = isSensitive ? '[redacted]' : sanitizeMetadata(currentValue, depth + 1);
    }

    return nextObject;
  }

  if (typeof value === 'string') {
    return value.slice(0, 400);
  }

  if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
    return value;
  }

  return String(value || '');
}

export function logAuthAuditEvent(payload = {}) {
  if (typeof window === 'undefined') {
    return;
  }

  const eventType = String(payload?.eventType || '')
    .trim()
    .toLowerCase();

  if (!eventType) {
    return;
  }

  const body = JSON.stringify({
    eventType,
    email: payload?.email || null,
    metadata: sanitizeMetadata(payload?.metadata || null),
    provider: payload?.provider || null,
    status: payload?.status || 'success',
    userId: payload?.userId || null,
  });

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(AUDIT_ENDPOINT, blob);
      return;
    }

    fetch(AUDIT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      keepalive: true,
      body,
    }).catch(() => null);
  } catch {
    // Audit logging should never break user flows.
  }
}
