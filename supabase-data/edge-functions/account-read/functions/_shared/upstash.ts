import { normalizeBoolean, normalizeInteger, normalizeValue } from './normalize.ts';

const UPSTASH_URL = normalizeValue(Deno.env.get('UPSTASH_REDIS_REST_URL'));
const UPSTASH_TOKEN = normalizeValue(Deno.env.get('UPSTASH_REDIS_REST_TOKEN'));
const ACCOUNT_READ_FAIL_OPEN = normalizeBoolean(Deno.env.get('ACCOUNT_READ_FAIL_OPEN'), true);

function assertUpstashConfigured() {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    throw new Error('Upstash Redis is not configured');
  }
}

export function isUpstashConfigured() {
  return Boolean(UPSTASH_URL && UPSTASH_TOKEN);
}

export async function callUpstash(command: (string | number)[]) {
  assertUpstashConfigured();

  const encoded = command.map((part) => encodeURIComponent(String(part))).join('/');
  const response = await fetch(`${UPSTASH_URL}/${encoded}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload?.error) {
    throw new Error(payload?.error || 'Upstash request failed');
  }

  return payload?.result;
}

export async function sha256Hex(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function getJsonCache<T>(key: string): Promise<T | null> {
  if (!isUpstashConfigured()) {
    return null;
  }

  try {
    const raw = await callUpstash(['get', key]);

    if (!raw || typeof raw !== 'string') {
      return null;
    }

    return JSON.parse(raw) as T;
  } catch (error) {
    if (!ACCOUNT_READ_FAIL_OPEN) {
      throw error;
    }

    return null;
  }
}

export async function setJsonCache(key: string, ttlSeconds: number, value: unknown) {
  if (!isUpstashConfigured()) {
    return;
  }

  const normalizedTtlSeconds = normalizeInteger(ttlSeconds, {
    fallback: 10,
    min: 1,
    max: 300,
  });

  try {
    await callUpstash(['setex', key, normalizedTtlSeconds, JSON.stringify(value)]);
  } catch (error) {
    if (!ACCOUNT_READ_FAIL_OPEN) {
      throw error;
    }
  }
}
