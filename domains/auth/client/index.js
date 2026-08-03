'use client';
import { normalizeLowerValue, normalizeValue } from '@/shared/utils';

// ============================================================
// CSRF Protection Client Helper
// ============================================================

const CSRF_COOKIE_NAME = 'tvz_auth_csrf';

export function getCsrfToken() {
  if (typeof document === 'undefined') return '';
  const cookieValue = document.cookie || '';

  for (const item of cookieValue.split(';')) {
    const normalizedItem = normalizeValue(item);
    if (normalizedItem.startsWith(`${CSRF_COOKIE_NAME}=`)) {
      return decodeURIComponent(normalizedItem.slice(`${CSRF_COOKIE_NAME}=`.length));
    }
  }
  return '';
}

export function createCsrfHeaders(headers = {}) {
  const csrfToken = getCsrfToken();
  if (!csrfToken) return headers;
  return { ...headers, 'X-CSRF-Token': csrfToken };
}

// ============================================================
// Audit Logging Client Helper
// ============================================================

const AUDIT_ENDPOINT = '/api/auth/audit';
const SENSITIVE_FIELD_PATTERNS = [/password/i, /token/i, /secret/i, /code/i];

function sanitizeMetadata(value, depth = 0) {
  if (depth > 3) return '[depth-limited]';
  if (Array.isArray(value)) return value.slice(0, 25).map((i) => sanitizeMetadata(i, depth + 1));
  if (value && typeof value === 'object') {
    const nextObject = {};
    for (const [key, currentValue] of Object.entries(value)) {
      const isSensitive = SENSITIVE_FIELD_PATTERNS.some((p) => p.test(key));
      nextObject[key] = isSensitive ? '[redacted]' : sanitizeMetadata(currentValue, depth + 1);
    }
    return nextObject;
  }
  if (typeof value === 'string') return value.slice(0, 400);
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) return value;
  return String(value || '');
}

export function logAuthAuditEvent(payload = {}) {
  if (typeof window === 'undefined') return;
  const eventType = String(payload?.eventType || '').trim().toLowerCase();
  if (!eventType) return;

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
    fetch(AUDIT_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true, body }).catch(() => null);
  } catch {}
}

// ============================================================
// Session Storage Helper
// ============================================================

export function normalizeStoredEmail(value) {
  return normalizeLowerValue(value);
}

function canUseSessionStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

export function clearSessionStorageValue(storageKey) {
  if (canUseSessionStorage()) window.sessionStorage.removeItem(storageKey);
}

export function readSessionStorageJson(storageKey, isValidPayload) {
  if (!canUseSessionStorage()) return null;
  try {
    const rawValue = window.sessionStorage.getItem(storageKey);
    if (!rawValue) return null;
    const payload = JSON.parse(rawValue);
    const isExpired = payload?.expiresAt && Number(payload.expiresAt) > 0 && Number(payload.expiresAt) <= Date.now();
    if (isExpired || (typeof isValidPayload === 'function' && !isValidPayload(payload))) {
      clearSessionStorageValue(storageKey);
      return null;
    }
    return payload;
  } catch {
    clearSessionStorageValue(storageKey);
    return null;
  }
}

export function writeSessionStorageJson(storageKey, payload) {
  if (canUseSessionStorage()) window.sessionStorage.setItem(storageKey, JSON.stringify(payload));
}

// ============================================================
// Pending Account Bootstrap Client Helper
// ============================================================

const PENDING_STORAGE_KEY = 'tvizzie:pending-account-bootstrap';
const PENDING_PROFILE_TTL_MS = 10 * 60 * 1000;

export function setPendingAccountBootstrap(payload = {}) {
  const email = normalizeStoredEmail(payload.email);
  const username = String(payload.username || '').trim();
  const displayName = String(payload.displayName || '').trim() || username;

  if (!email || !username) {
    clearSessionStorageValue(PENDING_STORAGE_KEY);
    return;
  }

  writeSessionStorageJson(PENDING_STORAGE_KEY, {
    createdAt: Date.now(),
    displayName,
    email,
    expiresAt: Date.now() + PENDING_PROFILE_TTL_MS,
    username,
  });
}

export function getPendingAccountBootstrap(user = null) {
  const payload = readSessionStorageJson(PENDING_STORAGE_KEY, (p) => Boolean(p?.email && p?.username));
  if (!payload) return null;
  if (!user?.email) return payload;
  return normalizeStoredEmail(user.email) === normalizeStoredEmail(payload.email) ? payload : null;
}

export function clearPendingAccountBootstrap() {
  clearSessionStorageValue(PENDING_STORAGE_KEY);
}

export * as audit from './index.js';
export * as csrf from './index.js';
export * as pendingAccount from './index.js';
export * as sessionStorage from './index.js';
