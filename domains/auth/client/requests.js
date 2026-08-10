import { getPasswordAccountStatus } from '../server/actions/password-status.server';
import { requestAuthJson } from './http.client';

const PASSWORD_STATUS_CACHE_TTL_MS = 4000;
const passwordStatusCache = new Map();
const passwordStatusInFlight = new Map();

function normalizeValue(value) {
  return String(value || '').trim();
}

async function postAuthJson(path, body, fallbackMessage) {
  return requestAuthJson(path, { body, fallbackMessage });
}

function createPasswordStatusCacheKey({ email, identifier, intent }) {
  return JSON.stringify({
    email: normalizeValue(email).toLowerCase(),
    identifier: normalizeValue(identifier).toLowerCase(),
    intent: normalizeValue(intent).toLowerCase() || 'sign-in',
  });
}

function readPasswordStatusCache(cacheKey) {
  const entry = passwordStatusCache.get(cacheKey);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    passwordStatusCache.delete(cacheKey);
    return null;
  }

  return entry.value;
}

function resolvePasswordAccountStatus({ email, identifier, intent }) {
  const cacheKey = createPasswordStatusCacheKey({ email, identifier, intent });
  const cachedValue = readPasswordStatusCache(cacheKey);

  if (cachedValue) {
    return Promise.resolve(cachedValue);
  }

  if (passwordStatusInFlight.has(cacheKey)) {
    return passwordStatusInFlight.get(cacheKey);
  }

  const requestPromise = getPasswordAccountStatus({ email, identifier, intent })
    .then((payload) => {
      if (!payload.success) {
        const error = new Error(payload.error || 'Account status could not be resolved');
        if (payload.code) error.code = payload.code;
        if (payload.data) error.data = payload.data;
        throw error;
      }
      passwordStatusCache.set(cacheKey, {
        expiresAt: Date.now() + PASSWORD_STATUS_CACHE_TTL_MS,
        value: payload,
      });
      passwordStatusInFlight.delete(cacheKey);
      return payload;
    })
    .catch((error) => {
      passwordStatusInFlight.delete(cacheKey);
      throw error;
    });

  passwordStatusInFlight.set(cacheKey, requestPromise);
  return requestPromise;
}

export function assertPasswordAccountStatus({ email, identifier, intent = 'sign-in' }) {
  return resolvePasswordAccountStatus({ email, identifier, intent });
}

export function assertSignUpEmailAvailable({ email }) {
  return resolvePasswordAccountStatus({ email, intent: 'sign-up' });
}

export async function requestVerificationCode({ email, initial, purpose, forceNew }) {
  return postAuthJson(
    '/api/auth/verification',
    { action: 'send', email, forceNew: forceNew === true, initial: initial === true, purpose },
    'Could not send verification code',
  );
}

export async function verifyCodeRequest({ code, email, purpose, rememberDevice }) {
  return postAuthJson(
    '/api/auth/verification',
    { action: 'verify', code, email, purpose, rememberDevice: rememberDevice === true },
    'Verification failed',
  );
}

export async function completeVerifiedSignUp({
  displayName,
  email,
  password,
  signUpProof,
  username,
}) {
  return postAuthJson(
    '/api/auth/sign-up/complete',
    { displayName, email, password, signUpProof, username },
    'Sign-up could not be completed',
  );
}

export async function completePasswordReset({ email, newPassword, passwordResetProof, token }) {
  return postAuthJson(
    '/api/auth/password-reset/complete',
    { email, newPassword, token: token || passwordResetProof },
    'Password reset failed',
  );
}
