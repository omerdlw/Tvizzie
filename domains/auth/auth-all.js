// ============================================================================
// DOMAINS/AUTH CONSOLIDATED CODEBASE
// Generated: 2026-08-16T15:54:05.424Z
// Total Files: 37
// ============================================================================

// ============================================================================
// FILE: domains/auth/actions/forgot-password-action.js
// ============================================================================

'use client';

import { getNavActionClass, NAV_ACTION_STYLES } from '@/ui/primitives/navigation-action-styles';
import Icon from '@/ui/primitives/icon';

export default function ForgotPasswordAction({ onClick, disabled, isPreparingReset }) {
  return (
    <div className={NAV_ACTION_STYLES.row}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={getNavActionClass({ className: 'min-w-0 flex-1 whitespace-nowrap' })}
      >
        <Icon icon="solar:key-bold" size={NAV_ACTION_STYLES.icon} />
        <span className="truncate">{isPreparingReset ? 'Checking' : 'Forgot password?'}</span>
      </button>
    </div>
  );
}


// ============================================================================
// FILE: domains/auth/api/audit.server.js
// ============================================================================

'use server';

export async function logAuditServer({ event, metadata }) {
  try {
    console.log('[Audit Log]', event, metadata);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}


// ============================================================================
// FILE: domains/auth/client/http.client.js
// ============================================================================

'use client';

export {
  AuthRequestError,
  createAuthCsrfHeaders,
  ensureAuthCsrfToken,
  getAuthCsrfToken,
  requestAuthJson,
} from '@/core/modules/auth/http.client';


// ============================================================================
// FILE: domains/auth/client/index.js
// ============================================================================

'use client';

import { normalizeLowerValue } from '@/shared/utils';

export {
  createAuthCsrfHeaders as createCsrfHeaders,
  getAuthCsrfToken as getCsrfToken,
} from './http.client';

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
    const isExpired =
      payload?.expiresAt &&
      Number(payload.expiresAt) > 0 &&
      Number(payload.expiresAt) <= Date.now();
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
  const payload = readSessionStorageJson(PENDING_STORAGE_KEY, (p) =>
    Boolean(p?.email && p?.username),
  );
  if (!payload) return null;
  if (!user?.email) return payload;
  return normalizeStoredEmail(user.email) === normalizeStoredEmail(payload.email) ? payload : null;
}

export function clearPendingAccountBootstrap() {
  clearSessionStorageValue(PENDING_STORAGE_KEY);
}


// ============================================================================
// FILE: domains/auth/client/requests.js
// ============================================================================

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

function resolvePasswordAccountStatus({ email, identifier, intent, useCache = true }) {
  const cacheKey = createPasswordStatusCacheKey({ email, identifier, intent });
  const cachedValue = useCache ? readPasswordStatusCache(cacheKey) : null;

  if (cachedValue) {
    return Promise.resolve(cachedValue);
  }

  if (useCache && passwordStatusInFlight.has(cacheKey)) {
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
      if (useCache) {
        passwordStatusCache.set(cacheKey, {
          expiresAt: Date.now() + PASSWORD_STATUS_CACHE_TTL_MS,
          value: payload,
        });
        passwordStatusInFlight.delete(cacheKey);
      }
      return payload;
    })
    .catch((error) => {
      if (useCache) {
        passwordStatusInFlight.delete(cacheKey);
      }
      throw error;
    });

  if (useCache) {
    passwordStatusInFlight.set(cacheKey, requestPromise);
  }
  return requestPromise;
}

export function assertPasswordAccountStatus({ email, identifier, intent = 'sign-in' }) {
  return resolvePasswordAccountStatus({ email, identifier, intent });
}

export function assertSignUpEmailAvailable({ email }) {
  return resolvePasswordAccountStatus({ email, intent: 'sign-up', useCache: false });
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


// ============================================================================
// FILE: domains/auth/client/sign-in-workflow.client.js
// ============================================================================

'use client';

function isInvalidCredentialsError(error) {
  const code = String(error?.code || '')
    .trim()
    .toLowerCase();
  const message = String(error?.message || '')
    .trim()
    .toLowerCase();

  return (
    code === 'invalid_credentials' ||
    code === 'invalid_login_credentials' ||
    code === 'auth/invalid-credential' ||
    message.includes('invalid login credentials') ||
    message.includes('invalid_credentials') ||
    message.includes('auth/invalid-credential')
  );
}

export async function signInWithPassword({ auth, identifier, password }) {
  const rawPassword = String(password || '');
  const trimmedPassword = rawPassword.trim();

  if (!trimmedPassword) throw new Error('Password is required');

  try {
    return await auth.signIn({ identifier, password: rawPassword });
  } catch (error) {
    if (!isInvalidCredentialsError(error) || rawPassword === trimmedPassword) throw error;
    return auth.signIn({ identifier, password: trimmedPassword });
  }
}


// ============================================================================
// FILE: domains/auth/client/sign-up-workflow.client.js
// ============================================================================

'use client';

import { ACCOUNT_CLIENT } from '@/domains/account/client';
import { getOAuthProviderLabel } from '@/domains/auth/utils/oauth';
import {
  AUTH_ROUTE_NOTICE,
  AUTH_ROUTES,
  buildAuthHref,
  createError,
  validateAllowedEmailDomain,
  validatePassword,
} from '@/domains/auth/utils';
import { assertSignUpEmailAvailable, completeVerifiedSignUp } from './requests';

export const SIGN_UP_FEEDBACK = Object.freeze({
  'creating-account': Object.freeze({
    description: 'Creating your account and starting your session.',
    phase: 'start',
    title: 'Creating account',
  }),
  redirecting: Object.freeze({
    description: 'Redirecting to your account.',
    duration: 3000,
    phase: 'success',
    title: 'Account ready',
  }),
});

export function getSignUpStepTitle(step) {
  return ['Create account', 'Profile details', 'Secure your account'][step] || 'Create account';
}

export function getSignUpSubmitLabel(step, pendingAction) {
  if (step === 0) return pendingAction === 'step-email' ? 'Checking email' : 'Continue';
  if (step === 1) return pendingAction === 'step-profile' ? 'Checking username' : 'Continue';

  return (
    {
      email: 'Sending verification',
      'creating-account': 'Creating account',
      redirecting: 'Redirecting',
    }[pendingAction] || 'Verify and create'
  );
}

export async function validateSignUpEmail(email) {
  const normalizedEmail = validateAllowedEmailDomain(email);
  await assertSignUpEmailAvailable({ email: normalizedEmail });
  return normalizedEmail;
}

export async function validateSignUpProfile({ displayName, username }) {
  const normalizedUsername = ACCOUNT_CLIENT.validateUsername(username);
  const existingUserId = await ACCOUNT_CLIENT.getAccountIdByUsername(normalizedUsername);

  if (existingUserId) throw createError('USERNAME_TAKEN');

  return {
    displayName: String(displayName || '').trim(),
    username: normalizedUsername,
  };
}

export function resolveOAuthSignUpFallback({ email, error, nextPath }) {
  if (String(error?.code || '').trim() !== 'GOOGLE_PASSWORD_LOGIN_REQUIRED') return '';

  return buildAuthHref(AUTH_ROUTES.SIGN_IN, {
    identifier: String(error?.data?.email || '').trim() || email,
    next: nextPath,
    notice: AUTH_ROUTE_NOTICE.GOOGLE_PASSWORD_LOGIN_REQUIRED,
  });
}

export function resolveSignUpEmailFallback({ email, error, nextPath }) {
  if (error?.code !== 'OAUTH_ACCOUNT_ALREADY_REGISTERED') return '';

  return buildAuthHref(AUTH_ROUTES.SIGN_IN, {
    identifier: email,
    next: nextPath,
    notice: AUTH_ROUTE_NOTICE.OAUTH_ACCOUNT_ALREADY_REGISTERED,
    provider: error?.data?.provider,
  });
}

export async function createPendingSignUpPayload(form = {}) {
  const username = ACCOUNT_CLIENT.validateUsername(form.username);
  const displayName = String(form.displayName || '').trim() || username;
  const email = validateAllowedEmailDomain(form.email);
  const password = validatePassword(form.password);

  if (password !== String(form.confirmPassword || '')) {
    throw createError('PASSWORD_CONFIRMATION_MISMATCH');
  }

  return { displayName, email, password, username };
}

export async function finalizeSignUp({
  auth,
  displayName,
  email,
  password,
  signUpProof,
  username,
}) {
  const completion = await completeVerifiedSignUp({
    displayName,
    email,
    password,
    signUpProof,
    username,
  });
  const session = await auth.signIn({ email, password, signUpProof });

  if (!session?.user?.id) {
    throw new Error('Sign-up completed but no authenticated session was returned');
  }

  return { ...session, recovered: completion?.recovered === true };
}

export async function finalizeOAuthSignUp({ auth, nextPath = '/account', provider = 'google' }) {
  const providerLabel = getOAuthProviderLabel(provider);
  const session = await auth.signUp({ oauthIntent: 'sign-up', next: nextPath, provider });

  if (session?.requiresRedirect) return session;
  if (!session?.user?.id) {
    throw new Error(`${providerLabel} sign-up completed but no authenticated session was returned`);
  }

  await ACCOUNT_CLIENT.ensureAccount(session.user);
  return session;
}


// ============================================================================
// FILE: domains/auth/index.js
// ============================================================================

export * from './client/index.js';
export * from './ui/index.js';
export * from './utils/index.js';
export * as server from './server/index.js';


// ============================================================================
// FILE: domains/auth/server/account-routes.server.js
// ============================================================================

import { NextResponse } from 'next/server';
import { normalizeEmailValue, normalizeValue } from '@/shared/utils';
import { createAdminClient } from '@/infrastructure/supabase/admin';
import {
  abortAccountDeleteLifecycle,
  ACCOUNT_LIFECYCLE_STATES,
  assertPasswordProviderLinked,
  beginAccountDeleteLifecycle,
  completeAccountDeleteLifecycle,
  EMAIL_ACCOUNT_STATES,
  hasPasswordProvider,
  purgeAccountData,
  resolveEmailAccountState,
} from './account.server';
import { AUTH_ROUTE_POLICY_KEYS, requirePolicySession } from './policies.server';
import { clearAuthCookies, getRequestContext } from './session.server';
import { deleteUser, extractUuid, getUserById, revokeRefreshTokens } from './session/admin.server';
import {
  assertCsrfRequest,
  assertRecentReauth,
  assertStepUp,
  AUTH_RATE_LIMIT_POLICY_KEYS,
  clearRecentReauthCookie,
  clearStepUpCookie,
  createRecentReauthToken,
  enforceAuthRateLimit,
  setRecentReauthCookie,
  validateStrongPassword,
  verifyPasswordWithIdentityToolkit,
} from './security.server';
import {
  lookupPasswordAccountByEmail,
  resolvePasswordAccountIdentifier,
} from './verification.server';
import {
  buildInternalRequestMeta,
  createApiErrorResponse,
  createApiSuccessResponse,
} from '@/infrastructure/http/http-server';

export const ACCOUNT_ACTIONS = Object.freeze({
  CHANGE_EMAIL: 'change-email',
  CHANGE_PASSWORD: 'change-password',
  DELETE: 'delete',
  PASSWORD_STATUS: 'password-status',
  REAUTHENTICATE: 'reauthenticate',
  SET_PASSWORD: 'set-password',
});

const ACTION_ALIASES = Object.freeze({
  'account-delete': ACCOUNT_ACTIONS.DELETE,
  'delete-account': ACCOUNT_ACTIONS.DELETE,
  'email-change': ACCOUNT_ACTIONS.CHANGE_EMAIL,
  'password-change': ACCOUNT_ACTIONS.CHANGE_PASSWORD,
  'password-set': ACCOUNT_ACTIONS.SET_PASSWORD,
});

const ACTION_SOURCES = Object.freeze({
  [ACCOUNT_ACTIONS.CHANGE_EMAIL]: 'api/auth/account/change-email',
  [ACCOUNT_ACTIONS.CHANGE_PASSWORD]: 'api/auth/account/change-password',
  [ACCOUNT_ACTIONS.DELETE]: 'api/auth/account/delete',
  [ACCOUNT_ACTIONS.PASSWORD_STATUS]: 'api/auth/account/password-status',
  [ACCOUNT_ACTIONS.REAUTHENTICATE]: 'api/auth/account/reauthenticate',
  [ACCOUNT_ACTIONS.SET_PASSWORD]: 'api/auth/account/set-password',
});

function normalizeAction(value) {
  const norm = normalizeValue(value).toLowerCase();
  return ACTION_ALIASES[norm] || norm;
}

function buildRequestMeta(request, action) {
  return buildInternalRequestMeta({
    request,
    source: ACTION_SOURCES[action] || 'api/auth/account',
  });
}

async function enforceAccountRateLimit(policyKey, request, session) {
  const context = getRequestContext(request);
  await enforceAuthRateLimit(policyKey, {
    dimensionValues: {
      device: context.deviceHash,
      ip: context.ipHash,
      user: session?.userId || null,
    },
  });
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getPasswordEnabledAppMetadata(session, userRecord = null) {
  const existingAppMetadata =
    userRecord?.app_metadata || userRecord?.raw_app_meta_data || session?.user?.app_metadata || {};
  const existingProviders = Array.isArray(existingAppMetadata.providers)
    ? existingAppMetadata.providers
    : [existingAppMetadata.provider || 'email'];

  const updatedProviders = Array.from(new Set([...existingProviders, 'email']));

  return {
    ...existingAppMetadata,
    providers: updatedProviders,
    tvz_password_enabled: true,
  };
}

export async function handlePasswordStatus(request, body) {
  try {
    const session = await requirePolicySession(request, {
      policyKey: AUTH_ROUTE_POLICY_KEYS.ACCOUNT_PASSWORD_STATUS,
    });
    const userId = extractUuid(session);
    if (!userId) {
      return createApiSuccessResponse(
        { passwordEnabled: true },
        { requestMeta: buildRequestMeta(request, ACCOUNT_ACTIONS.PASSWORD_STATUS) },
      );
    }
    const userRecord = await createAdminClient().auth.admin.getUserById(userId);
    const passwordEnabled = hasPasswordProvider(userRecord?.data?.user);

    return createApiSuccessResponse(
      { passwordEnabled },
      { requestMeta: buildRequestMeta(request, ACCOUNT_ACTIONS.PASSWORD_STATUS) },
    );
  } catch (error) {
    return createApiErrorResponse(
      {
        code: 'STATUS_CHECK_FAILED',
        message: error.message || 'Status check failed',
        retryable: true,
      },
      { requestMeta: buildRequestMeta(request, ACCOUNT_ACTIONS.PASSWORD_STATUS), status: 400 },
    );
  }
}

export async function handleReauthenticate(request, body) {
  try {
    assertCsrfRequest(request);
    const session = await requirePolicySession(request, {
      policyKey: AUTH_ROUTE_POLICY_KEYS.ACCOUNT_REAUTHENTICATE,
    });
    const userId = extractUuid(session);
    const currentPassword = String(body?.currentPassword || '');

    if (!currentPassword) {
      return createApiErrorResponse(
        { code: 'PASSWORD_REQUIRED', message: 'Current password is required', retryable: false },
        { requestMeta: buildRequestMeta(request, ACCOUNT_ACTIONS.REAUTHENTICATE), status: 400 },
      );
    }

    await verifyPasswordWithIdentityToolkit({ email: session?.email, password: currentPassword });
    const reauthToken = createRecentReauthToken({
      email: session?.email,
      sessionJti: session?.sessionJti,
      userId,
    });

    const response = createApiSuccessResponse(
      { ok: true },
      { requestMeta: buildRequestMeta(request, ACCOUNT_ACTIONS.REAUTHENTICATE) },
    );
    setRecentReauthCookie(response, reauthToken);
    return response;
  } catch (error) {
    return createApiErrorResponse(
      {
        code: 'REAUTH_FAILED',
        message: error.message || 'Reauthentication failed',
        retryable: false,
      },
      { requestMeta: buildRequestMeta(request, ACCOUNT_ACTIONS.REAUTHENTICATE), status: 401 },
    );
  }
}

export async function handleDeleteAccount(request, body) {
  try {
    assertCsrfRequest(request);
    const session = await requirePolicySession(request, {
      policyKey: AUTH_ROUTE_POLICY_KEYS.ACCOUNT_DELETE,
    });

    const userId = extractUuid(session);

    if (!userId) {
      return createApiErrorResponse(
        {
          code: 'INVALID_USER_ID',
          message: 'Valid User ID UUID is required',
          retryable: false,
        },
        { requestMeta: buildRequestMeta(request, ACCOUNT_ACTIONS.DELETE), status: 400 },
      );
    }

    const userRecord = await getUserById(userId).catch(() => null);
    const isPassword = userRecord ? hasPasswordProvider(userRecord) : false;

    if (isPassword) {
      assertRecentReauth(request, { sessionJti: session.sessionJti, userId });
      assertStepUp(request, {
        email: session.email,
        purpose: 'account-delete',
        userId,
      });
    }
    await enforceAccountRateLimit(AUTH_RATE_LIMIT_POLICY_KEYS.ACCOUNT_DELETE, request, session);

    await purgeAccountData(userId);
    await deleteUser(userId);

    const response = createApiSuccessResponse(
      { deleted: true, nextAction: 'signed_out' },
      { requestMeta: buildRequestMeta(request, ACCOUNT_ACTIONS.DELETE) },
    );
    clearAuthCookies(response, request);
    clearRecentReauthCookie(response);
    clearStepUpCookie(response);
    return response;
  } catch (error) {
    return createApiErrorResponse(
      {
        code: 'DELETE_FAILED',
        message: error.message || 'Account deletion failed',
        retryable: false,
      },
      { requestMeta: buildRequestMeta(request, ACCOUNT_ACTIONS.DELETE), status: 400 },
    );
  }
}

export async function handleChangeEmail(request, body) {
  try {
    assertCsrfRequest(request);
    const session = await requirePolicySession(request, {
      policyKey: AUTH_ROUTE_POLICY_KEYS.ACCOUNT_CHANGE_EMAIL,
    });
    const userId = extractUuid(session);
    assertRecentReauth(request, { sessionJti: session?.sessionJti, userId });
    assertStepUp(request, {
      email: session?.email,
      purpose: 'email-change',
      userId,
    });
    await enforceAccountRateLimit(
      AUTH_RATE_LIMIT_POLICY_KEYS.EMAIL_CHANGE_COMPLETE,
      request,
      session,
    );
    const newEmail = normalizeEmailValue(body?.newEmail);

    if (!newEmail || !newEmail.includes('@')) {
      return createApiErrorResponse(
        { code: 'INVALID_EMAIL', message: 'Valid email is required', retryable: false },
        { requestMeta: buildRequestMeta(request, ACCOUNT_ACTIONS.CHANGE_EMAIL), status: 400 },
      );
    }

    const admin = createAdminClient();
    const updateRes = await admin.auth.admin.updateUserById(userId, { email: newEmail });
    if (updateRes.error) throw updateRes.error;

    await revokeRefreshTokens(userId, { reason: 'email-change' });
    const response = createApiSuccessResponse(
      { nextAction: 'signed_out', updated: true },
      { requestMeta: buildRequestMeta(request, ACCOUNT_ACTIONS.CHANGE_EMAIL) },
    );
    clearAuthCookies(response, request);
    clearRecentReauthCookie(response);
    clearStepUpCookie(response);
    return response;
  } catch (error) {
    return createApiErrorResponse(
      {
        code: 'EMAIL_CHANGE_FAILED',
        message: error.message || 'Email change failed',
        retryable: false,
      },
      { requestMeta: buildRequestMeta(request, ACCOUNT_ACTIONS.CHANGE_EMAIL), status: 400 },
    );
  }
}

export async function handleChangePassword(request, body) {
  try {
    assertCsrfRequest(request);
    const session = await requirePolicySession(request, {
      policyKey: AUTH_ROUTE_POLICY_KEYS.ACCOUNT_CHANGE_PASSWORD,
    });
    const userId = extractUuid(session);
    assertRecentReauth(request, { sessionJti: session?.sessionJti, userId });
    assertStepUp(request, {
      email: session?.email,
      purpose: 'password-change',
      userId,
    });
    await enforceAccountRateLimit(
      AUTH_RATE_LIMIT_POLICY_KEYS.PASSWORD_CHANGE_COMPLETE,
      request,
      session,
    );

    const newPassword = validateStrongPassword(body?.newPassword);
    const admin = createAdminClient();
    const targetUserRes = await admin.auth.admin.getUserById(userId).catch(() => null);
    const targetUser = targetUserRes?.data?.user || null;

    const updateRes = await admin.auth.admin.updateUserById(userId, {
      app_metadata: getPasswordEnabledAppMetadata(session, targetUser),
      password: newPassword,
    });
    if (updateRes.error) throw updateRes.error;

    await revokeRefreshTokens(userId, { reason: 'password-change' });
    const response = createApiSuccessResponse(
      { nextAction: 'signed_out', updated: true },
      { requestMeta: buildRequestMeta(request, ACCOUNT_ACTIONS.CHANGE_PASSWORD) },
    );
    clearAuthCookies(response, request);
    clearRecentReauthCookie(response);
    clearStepUpCookie(response);
    return response;
  } catch (error) {
    return createApiErrorResponse(
      {
        code: 'PASSWORD_CHANGE_FAILED',
        message: error.message || 'Password change failed',
        retryable: false,
      },
      { requestMeta: buildRequestMeta(request, ACCOUNT_ACTIONS.CHANGE_PASSWORD), status: 400 },
    );
  }
}

export async function handleSetPassword(request, body) {
  try {
    assertCsrfRequest(request);
    const session = await requirePolicySession(request, {
      policyKey: AUTH_ROUTE_POLICY_KEYS.ACCOUNT_SET_PASSWORD,
    });
    const userId = extractUuid(session);
    assertStepUp(request, {
      email: session?.email,
      purpose: 'password-set',
      userId,
    });
    await enforceAccountRateLimit(
      AUTH_RATE_LIMIT_POLICY_KEYS.PASSWORD_SET_COMPLETE,
      request,
      session,
    );
    const newPassword = validateStrongPassword(body?.newPassword);

    const admin = createAdminClient();
    const targetUserRes = await admin.auth.admin.getUserById(userId).catch(() => null);
    const targetUser = targetUserRes?.data?.user || null;

    const updateRes = await admin.auth.admin.updateUserById(userId, {
      app_metadata: getPasswordEnabledAppMetadata(session, targetUser),
      password: newPassword,
    });
    if (updateRes.error) throw updateRes.error;

    await revokeRefreshTokens(userId, { reason: 'password-set' });
    const response = createApiSuccessResponse(
      { nextAction: 'signed_out', set: true },
      { requestMeta: buildRequestMeta(request, ACCOUNT_ACTIONS.SET_PASSWORD) },
    );
    clearAuthCookies(response, request);
    clearStepUpCookie(response);
    return response;
  } catch (error) {
    return createApiErrorResponse(
      {
        code: 'PASSWORD_SET_FAILED',
        message: error.message || 'Password setup failed',
        retryable: false,
      },
      { requestMeta: buildRequestMeta(request, ACCOUNT_ACTIONS.SET_PASSWORD), status: 400 },
    );
  }
}

export async function handleAccountPost(request) {
  const body = await request.json().catch(() => ({}));
  const action = normalizeAction(body?.action);

  switch (action) {
    case ACCOUNT_ACTIONS.PASSWORD_STATUS:
      return handlePasswordStatus(request, body);
    case ACCOUNT_ACTIONS.REAUTHENTICATE:
      return handleReauthenticate(request, body);
    case ACCOUNT_ACTIONS.DELETE:
      return handleDeleteAccount(request, body);
    case ACCOUNT_ACTIONS.CHANGE_EMAIL:
      return handleChangeEmail(request, body);
    case ACCOUNT_ACTIONS.CHANGE_PASSWORD:
      return handleChangePassword(request, body);
    case ACCOUNT_ACTIONS.SET_PASSWORD:
      return handleSetPassword(request, body);
    default:
      return createApiErrorResponse(
        {
          code: 'INVALID_ACCOUNT_ACTION',
          message: action ? `Unsupported account action: ${action}` : 'action is required',
          retryable: false,
        },
        { requestMeta: buildRequestMeta(request, null), status: 400 },
      );
  }
}


// ============================================================================
// FILE: domains/auth/server/account.server.js
// ============================================================================

import { normalizeEmailValue, normalizeValue } from '@/shared/utils';
import { createAdminClient } from '@/infrastructure/supabase/admin';
import { validateUsername } from '@/domains/account/utils';
import {
  ACCOUNT_LIFECYCLE_TABLE,
  resolveAuthCapabilities,
  resolveProviderIds,
} from '@/domains/auth/utils';

export const ACCOUNT_LIFECYCLE_STATES = Object.freeze({
  ACTIVE: 'ACTIVE',
  DELETED: 'DELETED',
  PENDING_CHANGE: 'PENDING_CHANGE',
  PENDING_DELETE: 'PENDING_DELETE',
});

export const EMAIL_ACCOUNT_STATES = Object.freeze({
  AVAILABLE: 'available',
  EXISTING_GOOGLE_ONLY: 'existing_google_only',
  EXISTING_PASSWORD_ACCOUNT: 'existing_password_account',
  RECOVERABLE_PASSWORD_ORPHAN: 'recoverable_password_orphan',
});

export async function claimUsernameForProfile({
  avatarUrl = null,
  displayName,
  email = null,
  failIfProfileHasUsername = false,
  preserveExisting = false,
  userId,
  username,
}) {
  const admin = createAdminClient();
  const { error } = await admin.rpc('claim_username', {
    p_avatar_url: normalizeValue(avatarUrl) || null,
    p_display_name: normalizeValue(displayName) || username,
    p_email: normalizeEmailValue(email) || null,
    p_fail_if_profile_has_username: Boolean(failIfProfileHasUsername),
    p_preserve_existing: Boolean(preserveExisting),
    p_user_id: normalizeValue(userId),
    p_username: validateUsername(username),
  });

  if (error) {
    throw new Error(error.message || 'Username could not be claimed');
  }
}

function isUsernameTakenError(error) {
  return normalizeValue(error?.message).toUpperCase().includes('USERNAME_TAKEN');
}

function createUsernameBase({ displayName, email, userId }) {
  const preferredValue = normalizeValue(displayName) || normalizeValue(email).split('@')[0];
  const fallbackValue = `user_${normalizeValue(userId).replace(/-/g, '').slice(0, 8)}`;

  try {
    return validateUsername(preferredValue).slice(0, 18);
  } catch {
    return validateUsername(fallbackValue).slice(0, 18);
  }
}

function createUsernameCandidate(baseUsername, userId, attempt) {
  if (attempt === 0) return baseUsername;

  const uniqueSuffix = `${normalizeValue(userId).replace(/-/g, '').slice(0, 6)}${attempt}`;
  const candidateBase = baseUsername.slice(0, Math.max(3, 24 - uniqueSuffix.length - 1));
  return validateUsername(`${candidateBase}_${uniqueSuffix}`);
}

async function claimAvailableUsernameForProfile({
  avatarUrl,
  displayName,
  email,
  userId,
  username,
}) {
  const baseUsername = username
    ? validateUsername(username)
    : createUsernameBase({ displayName, email, userId });
  const maxAttempts = username ? 1 : 3;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = createUsernameCandidate(baseUsername, userId, attempt);

    try {
      await claimUsernameForProfile({
        avatarUrl,
        displayName,
        email,
        preserveExisting: false,
        userId,
        username: candidate,
      });
      return candidate;
    } catch (error) {
      if (!isUsernameTakenError(error) || attempt === maxAttempts - 1) throw error;
    }
  }

  throw new Error('Username could not be claimed');
}

export async function ensureAccountProfileRecord({
  avatarUrl = null,
  displayName,
  email,
  userId,
  username,
}) {
  const normalizedUserId = normalizeValue(userId);
  const normalizedEmail = normalizeEmailValue(email);

  if (!normalizedUserId || !normalizedEmail) {
    throw new Error('User ID and email are required to create the account profile');
  }

  const admin = createAdminClient();
  const existingProfileRes = await admin
    .from('profiles')
    .select('id, email, username, display_name')
    .eq('id', normalizedUserId)
    .maybeSingle();

  const existingProfile = existingProfileRes.data || null;

  if (existingProfile?.id && normalizeValue(existingProfile?.username)) {
    await ensureAccountLifecycle(normalizedUserId);
    return existingProfile;
  }

  const resolvedDisplayName = normalizeValue(displayName) || normalizedEmail.split('@')[0];
  await claimAvailableUsernameForProfile({
    avatarUrl,
    displayName: resolvedDisplayName,
    email: normalizedEmail,
    userId: normalizedUserId,
    username,
  });

  const profileResult = await admin
    .from('profiles')
    .select('id, email, username')
    .eq('id', normalizedUserId)
    .maybeSingle();

  if (profileResult.error) {
    throw new Error(profileResult.error.message || 'Profile could not be loaded');
  }

  const profile = profileResult.data || null;

  if (!profile?.id || !normalizeValue(profile?.username)) {
    throw new Error('Profile could not be bootstrapped');
  }

  await ensureAccountLifecycle(normalizedUserId);

  return profile;
}

export function hasPasswordProvider(userRecord) {
  const providerIds = resolveProviderIds({
    providerData: userRecord?.providerData || [],
    appMetadata: userRecord?.app_metadata || {},
  });

  return resolveAuthCapabilities({
    providerIds,
    email: userRecord?.email || null,
  }).passwordEnabled;
}

export function assertPasswordProviderLinked(userRecord) {
  if (!hasPasswordProvider(userRecord)) {
    throw new Error('This account does not have email/password sign-in enabled');
  }
}

import { extractUuid } from './session/admin.server';

export async function purgeAccountData(userIdInput) {
  const normalizedUserId = extractUuid(userIdInput);
  if (!normalizedUserId) throw new Error('Authenticated user is required');

  const admin = createAdminClient();
  const executeDelete = async (query, fallbackMessage) => {
    const res = await query;
    if (res?.error) throw new Error(res.error.message || fallbackMessage);
  };

  const tablesToClearByUser = [
    'usernames',
    'profile_counters',
    'favorites',
    'likes',
    'watchlist',
    'watched',
    'activity',
    'list_items',
    'list_reviews',
    'media_reviews',
    'review_likes',
    'list_likes',
    'lists',
    'auth_challenges',
    'auth_audit_logs',
    'auth_revocation_state',
    'feedback_submissions',
  ];

  for (const table of tablesToClearByUser) {
    try {
      await admin.from(table).delete().eq('user_id', normalizedUserId);
    } catch {}
  }

  await executeDelete(
    admin
      .from('follows')
      .delete()
      .or(`follower_id.eq.${normalizedUserId},following_id.eq.${normalizedUserId}`),
    'Follow relations could not be deleted',
  );

  await executeDelete(
    admin
      .from('notifications')
      .delete()
      .or(`user_id.eq.${normalizedUserId},actor_user_id.eq.${normalizedUserId}`),
    'Notifications could not be deleted',
  );

  await executeDelete(
    admin.from('profiles').delete().eq('id', normalizedUserId),
    'Profile could not be deleted',
  );

  try {
    await admin.from('account_lifecycle').delete().eq('user_id', normalizedUserId);
  } catch {}
}

function normalizeState(value) {
  const normalized = normalizeValue(value).toUpperCase();
  return normalized || ACCOUNT_LIFECYCLE_STATES.ACTIVE;
}

function normalizeOptionalText(value) {
  const normalized = normalizeValue(value);
  return normalized || null;
}

function isLifecycleUnavailableError(error) {
  const message = normalizeValue(error?.message).toLowerCase();
  return (
    message.includes('account_lifecycle') ||
    message.includes('ensure_account_lifecycle') ||
    message.includes('begin_account_delete') ||
    message.includes('complete_account_delete') ||
    message.includes('abort_account_delete') ||
    message.includes('does not exist')
  );
}

function buildLifecycleRow(row = null) {
  return {
    deletedAt: row?.deleted_at || null,
    pendingOperationKey: normalizeOptionalText(row?.pending_operation_key),
    state: normalizeState(row?.state),
    stateReason: normalizeOptionalText(row?.state_reason),
    userId: normalizeOptionalText(row?.user_id),
  };
}

async function callLifecycleRpc(rpcName, payload = {}) {
  const admin = createAdminClient();
  const result = await admin.rpc(rpcName, payload);
  if (result.error) throw result.error;
  return result.data;
}

export async function ensureAccountLifecycle(userId) {
  const normalizedUserId = normalizeValue(userId);
  if (!normalizedUserId) throw new Error('Authenticated user is required');

  try {
    const rpcData = await callLifecycleRpc('ensure_account_lifecycle', {
      p_user_id: normalizedUserId,
    });
    return buildLifecycleRow(rpcData);
  } catch (error) {
    if (!isLifecycleUnavailableError(error)) {
      throw new Error(error?.message || 'Account lifecycle could not be initialized');
    }

    try {
      const admin = createAdminClient();
      const selectResult = await admin
        .from(ACCOUNT_LIFECYCLE_TABLE)
        .select('user_id,state,state_reason,pending_operation_key,deleted_at')
        .eq('user_id', normalizedUserId)
        .maybeSingle();

      if (selectResult.data) return buildLifecycleRow(selectResult.data);

      const insertResult = await admin
        .from(ACCOUNT_LIFECYCLE_TABLE)
        .insert({
          state: ACCOUNT_LIFECYCLE_STATES.ACTIVE,
          state_reason: 'bootstrap',
          user_id: normalizedUserId,
        })
        .select('user_id,state,state_reason,pending_operation_key,deleted_at')
        .maybeSingle();

      if (insertResult.data) return buildLifecycleRow(insertResult.data);
    } catch {}

    return {
      deletedAt: null,
      pendingOperationKey: null,
      state: ACCOUNT_LIFECYCLE_STATES.ACTIVE,
      stateReason: 'lifecycle_unavailable',
      userId: normalizedUserId,
    };
  }
}

export async function assertAccountLifecycleAllowed({
  allowedStates = [ACCOUNT_LIFECYCLE_STATES.ACTIVE],
  userId,
} = {}) {
  const normalizedUserId = normalizeValue(userId);
  if (!normalizedUserId) throw new Error('Authenticated user is required');

  const lifecycle = await ensureAccountLifecycle(normalizedUserId);
  const normalizedAllowedStates = new Set(
    (Array.isArray(allowedStates) ? allowedStates : [allowedStates]).map((s) => normalizeState(s)),
  );

  if (!normalizedAllowedStates.has(lifecycle.state)) {
    if (lifecycle.state === ACCOUNT_LIFECYCLE_STATES.DELETED)
      throw new Error('Account has already been deleted');
    if (lifecycle.state === ACCOUNT_LIFECYCLE_STATES.PENDING_DELETE)
      throw new Error('Account is pending deletion');
    throw new Error('Account is not active');
  }

  return lifecycle;
}

export async function beginAccountDeleteLifecycle({
  idempotencyKey = null,
  requestId = null,
  sessionJti = null,
  userId,
} = {}) {
  const normalizedUserId = normalizeValue(userId);
  if (!normalizedUserId) throw new Error('Authenticated user is required');

  try {
    const rpcData = await callLifecycleRpc('begin_account_delete', {
      p_operation_key: normalizeOptionalText(idempotencyKey),
      p_request_id: normalizeOptionalText(requestId),
      p_session_jti: normalizeOptionalText(sessionJti),
      p_user_id: normalizedUserId,
    });
    const record = Array.isArray(rpcData) ? rpcData[0] : rpcData;
    return {
      accepted: Boolean(record?.accepted),
      reason: normalizeOptionalText(record?.reason) || 'unknown',
      state: normalizeState(record?.state),
    };
  } catch (error) {
    if (!isLifecycleUnavailableError(error)) {
      throw new Error(error?.message || 'Account delete lifecycle could not be started');
    }
    return {
      accepted: true,
      reason: 'lifecycle_unavailable',
      state: ACCOUNT_LIFECYCLE_STATES.PENDING_DELETE,
    };
  }
}

export async function completeAccountDeleteLifecycle({
  metadata = null,
  requestId = null,
  sessionJti = null,
  userId,
} = {}) {
  const normalizedUserId = normalizeValue(userId);
  if (!normalizedUserId) throw new Error('Authenticated user is required');

  try {
    await callLifecycleRpc('complete_account_delete', {
      p_metadata: metadata && typeof metadata === 'object' ? metadata : {},
      p_request_id: normalizeOptionalText(requestId),
      p_session_jti: normalizeOptionalText(sessionJti),
      p_user_id: normalizedUserId,
    });
  } catch (error) {
    if (!isLifecycleUnavailableError(error)) {
      throw new Error(error?.message || 'Account delete lifecycle could not be completed');
    }
  }
}

export async function abortAccountDeleteLifecycle({
  metadata = null,
  reason = 'delete_failed',
  requestId = null,
  userId,
} = {}) {
  const normalizedUserId = normalizeValue(userId);
  if (!normalizedUserId) throw new Error('Authenticated user is required');

  try {
    await callLifecycleRpc('abort_account_delete', {
      p_metadata: metadata && typeof metadata === 'object' ? metadata : {},
      p_reason: normalizeOptionalText(reason) || 'delete_failed',
      p_request_id: normalizeOptionalText(requestId),
      p_user_id: normalizedUserId,
    });
  } catch (error) {
    if (!isLifecycleUnavailableError(error)) {
      throw new Error(error?.message || 'Account delete lifecycle could not be rolled back');
    }
  }
}

export async function resolveEmailAccountState(email) {
  const normalizedEmail = normalizeEmailValue(email);
  if (!normalizedEmail) {
    return {
      email: '',
      exists: false,
      lookup: null,
      profile: { email: '', exists: false, hasUsername: false, id: null, raw: null, username: '' },
      state: EMAIL_ACCOUNT_STATES.AVAILABLE,
      userId: null,
    };
  }

  const admin = createAdminClient();
  const profileResult = await admin
    .from('profiles')
    .select('id, email, username')
    .eq('email', normalizedEmail)
    .maybeSingle();

  const profile = profileResult.data || null;

  return {
    email: normalizedEmail,
    exists: Boolean(profile?.id),
    lookup: null,
    profile: {
      email: normalizeEmailValue(profile?.email),
      exists: Boolean(profile?.id),
      hasUsername: Boolean(normalizeValue(profile?.username)),
      id: normalizeValue(profile?.id) || null,
      raw: profile,
      username: normalizeValue(profile?.username),
    },
    state: profile?.id
      ? EMAIL_ACCOUNT_STATES.EXISTING_PASSWORD_ACCOUNT
      : EMAIL_ACCOUNT_STATES.AVAILABLE,
    userId: normalizeValue(profile?.id) || null,
  };
}


// ============================================================================
// FILE: domains/auth/server/actions/password-status.server.js
// ============================================================================

'use server';

import { normalizeEmailValue, normalizeValue } from '@/shared/utils';
import {
  createSignUpEmailAlreadyRegisteredError,
  lookupAccountByEmail,
  lookupPasswordAccountByEmail,
  resolvePasswordAccountIdentifier,
} from '../verification.server';

export async function getPasswordAccountStatus({ email, identifier, intent } = {}) {
  try {
    const normalizedIntent = normalizeValue(intent);

    if (normalizedIntent === 'sign-up') {
      const normalizedEmail = normalizeEmailValue(email);
      if (!normalizedEmail) return { success: false, error: 'Email is required' };

      const account = await lookupAccountByEmail(normalizedEmail);
      if (!account.exists) return { success: true };

      const error = createSignUpEmailAlreadyRegisteredError(account);
      return {
        success: false,
        code: error.code,
        data: error.data,
        error: error.message,
      };
    }

    if (normalizedIntent !== 'password-reset') {
      return { success: true, passwordEnabled: true };
    }

    if (!identifier) return { success: false, error: 'Email or username is required' };

    let resolvedEmail;
    try {
      resolvedEmail = (await resolvePasswordAccountIdentifier(identifier)).email;
    } catch (error) {
      return { success: false, error: error.message || 'No account found' };
    }

    const account = await lookupPasswordAccountByEmail(resolvedEmail);
    if (!account.exists) return { success: false, error: 'No account found with this email' };
    if (!account.supportsPasswordAuth) {
      return { success: false, error: 'This account does not support password sign-in' };
    }

    return { success: true, email: resolvedEmail };
  } catch (error) {
    return { success: false, error: error.message || 'Status check failed' };
  }
}


// ============================================================================
// FILE: domains/auth/server/api-handlers.server.js
// ============================================================================

import { NextResponse } from 'next/server';
import { normalizeEmailValue, normalizeValue } from '@/shared/utils';
import { createAdminClient } from '@/infrastructure/supabase/admin';
import {
  applySupabaseSessionToResponse,
  getRequestContext,
  readSessionFromRequest,
  requireSessionRequest,
  setDeviceIdCookie,
} from './session.server';
import { getUserById, revokeRefreshTokens } from './session/admin.server';
import {
  AUTH_RATE_LIMIT_POLICY_KEYS,
  assertCsrfRequest,
  createPendingPasswordSignIn,
  createStepUpToken,
  enforceAuthRateLimit,
  setStepUpCookie,
  validateStrongPassword,
} from './security.server';
import {
  claimVerificationProof,
  completeVerificationProof,
  assertSignUpEmailAvailable,
  clearPendingSignInCookie,
  createPendingSignInToken,
  isDeviceTrusted,
  lookupPasswordAccountByEmail,
  lookupAccountByEmail,
  requestVerificationCode,
  releaseVerificationProof,
  resolvePasswordAccountIdentifier,
  setPendingSignInCookie,
  setTrustedDeviceCookie,
  verifyPendingSignInToken,
  verifyCodeRequest,
  PASSWORD_ACCOUNT_LOOKUP_CODES,
} from './verification.server';
import {
  createPasswordResetProofToken,
  createSignUpProofToken,
  verifyPasswordResetProofToken,
  verifySignUpProofToken,
} from './proof-tokens.server';
import { ensureAccountProfileRecord } from './account.server';
import {
  PURPOSES,
  resolveAuthCapabilities,
  resolveProviderIds,
  SECURE_PURPOSES,
} from '@/domains/auth/utils';

export async function handleSignInPost(request) {
  try {
    assertCsrfRequest(request);
    const body = await request.json().catch(() => ({}));
    const identifier = normalizeValue(body?.identifier || body?.email);
    const password = String(body?.password || '');
    const signUpProof = normalizeValue(body?.signUpProof);

    if (!identifier || !password) {
      return NextResponse.json({ error: 'identifier and password are required' }, { status: 400 });
    }

    const requestContext = getRequestContext(request);
    await enforceAuthRateLimit(AUTH_RATE_LIMIT_POLICY_KEYS.SIGN_IN, {
      dimensionValues: {
        device: requestContext.deviceHash,
        email: identifier,
        ip: requestContext.ipHash,
      },
    });

    let email = null;
    let resolveError = null;
    try {
      email = (await resolvePasswordAccountIdentifier(identifier)).email;
    } catch (err) {
      resolveError = err;
    }

    if (resolveError || !email) {
      return NextResponse.json(
        {
          code: 'USER_NOT_FOUND',
          error:
            'No account was found with this email or username. Please check your credentials or sign up.',
        },
        { status: 400 },
      );
    }

    const passwordLookup = await lookupPasswordAccountByEmail(email);
    if (!passwordLookup.eligible) {
      if (
        passwordLookup.code === PASSWORD_ACCOUNT_LOOKUP_CODES.USER_NOT_FOUND ||
        !passwordLookup.exists
      ) {
        return NextResponse.json(
          {
            code: 'USER_NOT_FOUND',
            error:
              'No account was found with this email. Please check your credentials or sign up.',
          },
          { status: 400 },
        );
      }

      const isPasswordSignInDisabled =
        passwordLookup.code === PASSWORD_ACCOUNT_LOOKUP_CODES.PASSWORD_SIGN_IN_DISABLED;
      return NextResponse.json(
        {
          code: isPasswordSignInDisabled
            ? 'PASSWORD_SIGN_IN_DISABLED'
            : passwordLookup.code || 'USER_NOT_FOUND',
          error: isPasswordSignInDisabled
            ? 'Password sign-in is not enabled for this account'
            : 'No account was found with this email. Please check your credentials or sign up.',
        },
        { status: 400 },
      );
    }

    const pendingSignIn = await createPendingPasswordSignIn({ email, password });
    let isTrusted = isDeviceTrusted(request, {
      userId: pendingSignIn.userId,
      deviceId: requestContext.deviceId,
    });

    if (!isTrusted && signUpProof) {
      try {
        verifySignUpProofToken(signUpProof, { email });
        isTrusted = true;
      } catch {}
    }

    if (!isTrusted) {
      const challenge = await requestVerificationCode({
        email,
        purpose: 'sign-in',
        userId: pendingSignIn.userId,
        deviceId: requestContext.deviceId,
      });

      const pendingToken = createPendingSignInToken({
        accessToken: pendingSignIn.accessToken,
        deviceHash: requestContext.deviceHash,
        email,
        refreshToken: pendingSignIn.refreshToken,
        userId: pendingSignIn.userId,
      });

      const response = NextResponse.json({
        requiresVerification: true,
        email,
        challenge,
      });
      setPendingSignInCookie(response, pendingToken);
      setDeviceIdCookie(response, requestContext.deviceId);
      return response;
    }

    const response = NextResponse.json({ success: true });
    await applySupabaseSessionToResponse(request, response, {
      accessToken: pendingSignIn.accessToken,
      refreshToken: pendingSignIn.refreshToken,
    });
    setTrustedDeviceCookie(response, {
      userId: pendingSignIn.userId,
      deviceId: requestContext.deviceId,
    });
    clearPendingSignInCookie(response);
    setDeviceIdCookie(response, requestContext.deviceId);
    return response;
  } catch (error) {
    const message = String(error?.message || 'Sign in failed');
    return NextResponse.json({ code: error?.code || null, error: message }, { status: 400 });
  }
}

export async function handleSignUpCompletePost(request) {
  let claimedProofKey = null;
  let createdUserId = null;
  try {
    assertCsrfRequest(request);
    const body = await request.json().catch(() => ({}));
    const displayName = normalizeValue(body?.displayName);
    const email = normalizeEmailValue(body?.email);
    const password = String(body?.password || '');
    const signUpProof = normalizeValue(body?.signUpProof);
    const username = normalizeValue(body?.username);

    if (!email || !password || !signUpProof || !username) {
      return NextResponse.json(
        { error: 'email, password, signUpProof, and username are required' },
        { status: 400 },
      );
    }

    const verifiedProof = verifySignUpProofToken(signUpProof, { email });
    const requestContext = getRequestContext(request);
    await enforceAuthRateLimit(AUTH_RATE_LIMIT_POLICY_KEYS.SIGN_UP_COMPLETE, {
      dimensionValues: {
        device: requestContext.deviceHash,
        email,
        ip: requestContext.ipHash,
      },
    });
    validateStrongPassword(password);
    await assertSignUpEmailAvailable(email);
    claimedProofKey = await claimVerificationProof({
      ...verifiedProof,
      email,
      purpose: 'sign-up',
    });

    const admin = createAdminClient();
    const createRes = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createRes.error || !createRes.data?.user?.id) {
      throw createRes.error || new Error('Failed to create user');
    }

    const userId = createRes.data.user.id;
    createdUserId = userId;
    await ensureAccountProfileRecord({
      displayName: displayName || username,
      email,
      userId,
      username,
    });
    await completeVerificationProof(claimedProofKey);
    claimedProofKey = null;

    return NextResponse.json({ success: true, userId });
  } catch (error) {
    if (createdUserId) {
      await createAdminClient()
        .auth.admin.deleteUser(createdUserId)
        .catch(() => null);
    }
    if (claimedProofKey) {
      await releaseVerificationProof(claimedProofKey).catch(() => null);
    }
    return NextResponse.json({ error: error.message || 'Sign up failed' }, { status: 400 });
  }
}

export async function handlePasswordResetCompletePost(request) {
  let claimedProofKey = null;
  try {
    assertCsrfRequest(request);
    const body = await request.json().catch(() => ({}));
    const token = normalizeValue(body?.token || body?.passwordResetProof);
    const newPassword = String(body?.newPassword || '');

    if (!token || !newPassword) {
      return NextResponse.json({ error: 'token and newPassword are required' }, { status: 400 });
    }

    const verified = verifyPasswordResetProofToken(token);
    if (!verified.userId) throw new Error('Password reset verification is invalid');
    const requestContext = getRequestContext(request);
    await enforceAuthRateLimit(AUTH_RATE_LIMIT_POLICY_KEYS.PASSWORD_RESET_COMPLETE, {
      dimensionValues: {
        device: requestContext.deviceHash,
        email: verified.email,
        ip: requestContext.ipHash,
      },
    });
    const password = validateStrongPassword(newPassword);
    claimedProofKey = await claimVerificationProof({
      ...verified,
      purpose: 'password-reset',
    });
    const admin = createAdminClient();
    const updateRes = await admin.auth.admin.updateUserById(verified.userId, {
      password,
    });

    if (updateRes.error) throw updateRes.error;
    await revokeRefreshTokens(verified.userId, { reason: 'password-reset' });
    await completeVerificationProof(claimedProofKey);
    claimedProofKey = null;

    return NextResponse.json({ success: true });
  } catch (error) {
    if (claimedProofKey) {
      await releaseVerificationProof(claimedProofKey).catch(() => null);
    }
    return NextResponse.json({ error: error.message || 'Password reset failed' }, { status: 400 });
  }
}

export async function handleVerificationPost(request) {
  try {
    assertCsrfRequest(request);
    const body = await request.json().catch(() => ({}));
    const action = normalizeValue(body?.action);
    const email = normalizeEmailValue(body?.email);
    const code = normalizeValue(body?.code);
    const purpose = normalizeValue(body?.purpose || 'sign-in');
    const rememberDevice = body?.rememberDevice === true;
    const requestContext = getRequestContext(request);
    const normalizedPurpose = purpose.toLowerCase();
    const requiresAuthenticatedStepUp = SECURE_PURPOSES.has(normalizedPurpose);
    let stepUpSession = null;

    if (requiresAuthenticatedStepUp) {
      stepUpSession = await requireSessionRequest(request, { allowBearerFallback: false });
      const isEmailChange =
        normalizedPurpose === PURPOSES.EMAIL_CHANGE || normalizedPurpose === 'email_change';

      if (isEmailChange) {
        if (normalizeEmailValue(stepUpSession.email) === email) {
          throw new Error('New email must be different from your current email');
        }
        const lookup = await lookupAccountByEmail(email);
        if (lookup.exists) {
          throw new Error('This email address is already in use by another account');
        }
      } else if (normalizeEmailValue(stepUpSession.email) !== email) {
        throw new Error('Verification email does not match the authenticated account');
      }
    }

    if (action === 'send') {
      if (normalizedPurpose === 'sign-up') {
        await assertSignUpEmailAvailable(email);
      }

      await enforceAuthRateLimit(AUTH_RATE_LIMIT_POLICY_KEYS.VERIFICATION_SEND, {
        dimensionValues: {
          device: requestContext.deviceHash,
          email,
          ip: requestContext.ipHash,
        },
      });
      const result = await requestVerificationCode({
        deviceId: requestContext.deviceId,
        email,
        forceNew: body?.forceNew === true,
        initial: body?.initial === true,
        ipAddress: requestContext.ipAddress,
        purpose,
        userId: stepUpSession?.userId || undefined,
      });
      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'verify') {
      await enforceAuthRateLimit(AUTH_RATE_LIMIT_POLICY_KEYS.VERIFICATION_VERIFY, {
        dimensionValues: {
          device: requestContext.deviceHash,
          email,
          ip: requestContext.ipHash,
        },
      });

      let pendingSignIn = null;
      if (String(purpose).toLowerCase() === 'sign-in') {
        const pendingToken = request.cookies.get('tvz_login_pending')?.value;
        if (!pendingToken)
          throw new Error('Verification session has expired. Please sign in again.');
        pendingSignIn = verifyPendingSignInToken(pendingToken);
        if (
          normalizeEmailValue(pendingSignIn.email) !== email ||
          pendingSignIn.deviceHash !== requestContext.deviceHash
        ) {
          throw new Error('Verification session does not match this device');
        }
      }

      const verified = await verifyCodeRequest({
        code,
        email,
        purpose,
        userId:
          normalizedPurpose === 'sign-in'
            ? pendingSignIn?.userId || undefined
            : stepUpSession?.userId || undefined,
      });
      const result = { success: true, ...verified };
      const normPurpose = String(purpose || '')
        .trim()
        .toLowerCase();

      if (SECURE_PURPOSES.has(normPurpose)) {
        const response = NextResponse.json(result);
        setStepUpCookie(
          response,
          createStepUpToken({
            challengeJti: verified.challengeJti,
            email: stepUpSession.email,
            purpose: normPurpose,
            userId: stepUpSession.userId,
          }),
        );
        return response;
      }

      if (normPurpose === 'sign-up') {
        result.signUpProof = createSignUpProofToken({
          challengeJti: verified.challengeJti,
          challengeKey: verified.challengeKey,
          email: verified.email,
          userId: verified.userId,
        });
      } else if (normPurpose === 'password-reset') {
        result.passwordResetProof = createPasswordResetProofToken({
          challengeJti: verified.challengeJti,
          challengeKey: verified.challengeKey,
          email: verified.email,
          userId: verified.userId,
        });
      } else if (normPurpose === 'sign-in' && pendingSignIn) {
        const response = NextResponse.json({
          ...result,
          session: {
            user: {
              id: pendingSignIn.userId,
              email: pendingSignIn.email,
            },
          },
        });
        await applySupabaseSessionToResponse(request, response, {
          accessToken: pendingSignIn.accessToken,
          refreshToken: pendingSignIn.refreshToken,
        });
        if (rememberDevice) {
          setTrustedDeviceCookie(response, {
            userId: pendingSignIn.userId,
            deviceId: requestContext.deviceId,
          });
        }
        clearPendingSignInCookie(response);
        setDeviceIdCookie(response, requestContext.deviceId);
        return response;
      }

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid verification action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      {
        code: error?.code || null,
        data: error?.data || null,
        error: error.message || 'Verification failed',
      },
      { status: 400 },
    );
  }
}

export async function handleSessionGet(request) {
  try {
    const sessionContext = await readSessionFromRequest(request, {
      skipSupabaseFallbackIfNoHint: false,
      skipSupabaseFallback: false,
    });

    if (sessionContext?.userId) {
      const user = sessionContext.user || {};
      const tokenClaims = sessionContext.decodedToken || {};
      let currentUser = null;
      try {
        currentUser = await getUserById(sessionContext.userId);
      } catch {}

      const providerData = currentUser?.providerData || [];
      const identities = providerData.length
        ? providerData.map((provider) => ({
            identity_data: { email: provider.email || null },
            provider: provider.providerId,
            user_id: provider.uid,
          }))
        : user.identities || [];
      const appMetadata =
        currentUser?.app_metadata || tokenClaims.app_metadata || user.app_metadata || {};
      const providerIds = resolveProviderIds({
        appMetadata: providerData.length ? {} : appMetadata,
        identities,
        providerData,
        tokenClaims: providerData.length ? {} : tokenClaims,
      });
      return NextResponse.json({
        status: 'authenticated',
        expiresAt: tokenClaims.exp ? tokenClaims.exp * 1000 : null,
        user: {
          id: sessionContext.userId,
          email: currentUser?.email || sessionContext.email || null,
          metadata:
            currentUser?.user_metadata || tokenClaims.user_metadata || user.user_metadata || {},
          app_metadata: appMetadata,
          identities,
        },
        capabilities: {
          ...resolveAuthCapabilities({
            email: currentUser?.email || sessionContext.email || user.email || null,
            providerIds,
          }),
          providerIds,
        },
      });
    }

    return NextResponse.json({
      status: 'anonymous',
      user: null,
    });
  } catch {
    return NextResponse.json({
      status: 'anonymous',
      user: null,
    });
  }
}


// ============================================================================
// FILE: domains/auth/server/audit-log.server.js
// ============================================================================

import { normalizeValue } from '@/shared/utils';
import { createHash } from 'crypto';

import { AUTH_AUDIT_TABLE } from '@/domains/auth/utils';
import { getRequestContext } from './session/request-context.server';
import { createAdminClient } from '@/infrastructure/supabase/admin';

const ALLOWED_EVENT_TYPES = new Set([
  'cleanup-temp-user',
  'delete-account',
  'email-change',
  'failed-attempt',
  'google-preflight',
  'link-provider',
  'password-change',
  'password-set',
  'password-reset',
  'sign-in',
  'sign-up',
  'unlink-provider',
]);

const SENSITIVE_FIELD_PATTERNS = [/password/i, /token/i, /secret/i, /code/i];
const ALLOWED_AUDIT_ACTORS = new Set(['user', 'system', 'edge', 'admin']);

function normalizeEventType(value) {
  return normalizeValue(value).toLowerCase();
}

function normalizeActor(value) {
  const normalized = normalizeValue(value).toLowerCase();

  if (!normalized || !ALLOWED_AUDIT_ACTORS.has(normalized)) {
    return 'user';
  }

  return normalized;
}

function normalizeOutcome(value, fallbackStatus) {
  const normalized = normalizeValue(value).toLowerCase();

  if (!normalized) {
    return normalizeValue(fallbackStatus).toLowerCase() || 'success';
  }

  return normalized.slice(0, 64);
}

function hashValue(value) {
  const normalized = normalizeValue(value);

  if (!normalized) {
    return null;
  }

  return createHash('sha256').update(normalized.toLowerCase()).digest('hex');
}

function maskEmail(email) {
  const normalizedEmail = normalizeValue(email).toLowerCase();
  const [localPart, domain] = normalizedEmail.split('@');

  if (!localPart || !domain) {
    return null;
  }

  const visiblePrefix = localPart.slice(0, 2);
  return `${visiblePrefix}***@${domain}`;
}

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

function isUserIdForeignKeyViolation(error) {
  const message = normalizeValue(error?.message).toLowerCase();
  const details = normalizeValue(error?.details).toLowerCase();

  return (
    message.includes('auth_audit_logs_user_id_fkey') ||
    (message.includes('foreign key constraint') && message.includes('user_id')) ||
    details.includes('(user_id)')
  );
}

function readMetadataField(metadata, fieldNames = []) {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }

  for (const fieldName of fieldNames) {
    const rawValue = metadata[fieldName];
    const normalized = normalizeValue(rawValue);

    if (normalized) {
      return normalized;
    }
  }

  return null;
}

export async function writeAuthAuditLog({
  request,
  eventType,
  status = 'success',
  userId = null,
  email = null,
  provider = null,
  actor = 'user',
  requestId = null,
  sessionJti = null,
  outcome = null,
  metadata = null,
}) {
  const normalizedEventType = normalizeEventType(eventType);

  if (!ALLOWED_EVENT_TYPES.has(normalizedEventType)) {
    throw new Error('Unsupported auth audit event type');
  }

  const normalizedStatus = normalizeValue(status).toLowerCase() || 'success';
  const normalizedUserId = normalizeValue(userId) || null;
  const normalizedEmail = normalizeValue(email).toLowerCase() || null;
  const normalizedProvider = normalizeValue(provider).toLowerCase() || null;
  const normalizedActor = normalizeActor(actor);
  const requestContext = request ? getRequestContext(request) : null;
  const normalizedRequestId =
    normalizeValue(requestId) ||
    requestContext?.requestId ||
    readMetadataField(metadata, ['requestId', 'request_id']) ||
    null;
  const normalizedSessionJti =
    normalizeValue(sessionJti) ||
    readMetadataField(metadata, ['sessionJti', 'session_jti']) ||
    null;
  const normalizedOutcome = normalizeOutcome(outcome, normalizedStatus);
  const now = Date.now();
  const sanitizedMetadata = sanitizeMetadata(metadata);
  const insertPayload = {
    actor: normalizedActor,
    created_at: new Date(now).toISOString(),
    email_hash: hashValue(normalizedEmail),
    email_masked: maskEmail(normalizedEmail),
    event_type: normalizedEventType,
    ip_hash: requestContext?.ipHash || null,
    metadata: sanitizedMetadata,
    outcome: normalizedOutcome,
    provider: normalizedProvider,
    request_id: normalizedRequestId,
    request_context: requestContext
      ? {
          device_hash: requestContext.deviceHash,
          ip_hash: requestContext.ipHash,
          request_id: normalizedRequestId,
          user_agent_hash: requestContext.userAgentHash,
        }
      : null,
    session_jti: normalizedSessionJti,
    status: normalizedStatus,
    user_id: normalizedUserId,
    user_id_hash: hashValue(normalizedUserId),
  };

  const admin = createAdminClient();
  let insertResult = await admin.from(AUTH_AUDIT_TABLE).insert(insertPayload);

  if (insertResult.error && normalizedUserId && isUserIdForeignKeyViolation(insertResult.error)) {
    insertResult = await admin.from(AUTH_AUDIT_TABLE).insert({
      ...insertPayload,
      user_id: null,
    });
  }

  if (insertResult.error) {
    throw new Error(insertResult.error.message || 'Auth audit log could not be persisted');
  }
}


// ============================================================================
// FILE: domains/auth/server/google-provider.server.js
// ============================================================================

import { normalizeEmailValue, normalizeValue } from '@/shared/utils';
import {
  normalizeProvider,
  resolveProviderDescriptors as resolveAuthProviderDescriptors,
  resolveProviderIds,
} from '@/domains/auth/utils';
import { GOOGLE_PROVIDER_ID, PASSWORD_PROVIDER_ID } from '@/domains/auth/oauth';
import { createAdminClient } from '@/infrastructure/supabase/admin';
import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} from '@/infrastructure/supabase/supabase-constants';

export const GOOGLE_AUTH_INTENTS = Object.freeze({
  LINK: 'link',
  SIGN_IN: 'sign-in',
  SIGN_UP: 'sign-up',
});

export const GOOGLE_AUTH_RESULTS = Object.freeze({
  ALLOW_LINK: 'allow-link',
  ALLOW_SIGNIN: 'allow-signin',
  ALLOW_SIGNUP: 'allow-signup',
  EMAIL_MISMATCH: 'email-mismatch',
  PROVIDER_COLLISION: 'provider-collision',
  REDIRECT_SIGNUP: 'redirect-signup',
  REQUIRE_PASSWORD_LOGIN: 'require-password-login',
});

export const GOOGLE_SESSION_ERROR_CODES = Object.freeze({
  PASSWORD_LOGIN_REQUIRED: 'GOOGLE_PASSWORD_LOGIN_REQUIRED',
  PROVIDER_COLLISION: 'GOOGLE_PROVIDER_COLLISION',
});

function normalizeIntent(value) {
  const norm = normalizeValue(value).toLowerCase();
  return Object.values(GOOGLE_AUTH_INTENTS).includes(norm) ? norm : GOOGLE_AUTH_INTENTS.SIGN_IN;
}

export async function resolveGoogleAuthIntent({
  currentUserId = null,
  decodedToken = null,
  pageIntent = GOOGLE_AUTH_INTENTS.SIGN_IN,
  userRecord = null,
} = {}) {
  const intent = normalizeIntent(pageIntent);
  const userId = normalizeValue(userRecord?.uid || decodedToken?.uid || decodedToken?.sub);
  const providerDescriptors = resolveAuthProviderDescriptors({
    providerData: Array.isArray(userRecord?.providerData) ? userRecord.providerData : [],
    email: userRecord?.email || decodedToken?.email || null,
    userId: userRecord?.uid || decodedToken?.uid || decodedToken?.sub || null,
  });
  const providerIds = resolveProviderIds({
    providerData: Array.isArray(userRecord?.providerData) ? userRecord.providerData : [],
    appMetadata: userRecord?.app_metadata || {},
    tokenClaims: decodedToken || {},
  });
  const googleProvider = providerDescriptors.find((p) => p.id === GOOGLE_PROVIDER_ID);
  const googleEmail = normalizeEmailValue(
    googleProvider?.email || userRecord?.email || decodedToken?.email,
  );
  const emailVerified = Boolean(userRecord?.emailVerified || decodedToken?.email_verified);
  const hasGoogleProvider = providerIds.includes(GOOGLE_PROVIDER_ID);
  const hasPasswordProvider = providerIds.includes(PASSWORD_PROVIDER_ID);

  let profile = { exists: false, id: null, email: '' };
  if (userId) {
    const admin = createAdminClient();
    const res = await admin.from('profiles').select('id, email').eq('id', userId).maybeSingle();
    if (res.data)
      profile = {
        exists: true,
        id: normalizeValue(res.data.id) || userId,
        email: normalizeEmailValue(res.data.email),
      };
  }

  const baseMetadata = {
    emailVerified,
    googleEmail,
    hasGoogleProvider,
    hasPasswordProvider,
    profileEmail: profile.email,
    profileExists: profile.exists,
    providerDescriptors,
    userId,
  };

  if (!userId || !hasGoogleProvider || !googleEmail || !emailVerified) {
    return { ...baseMetadata, result: GOOGLE_AUTH_RESULTS.PROVIDER_COLLISION };
  }

  if (intent === GOOGLE_AUTH_INTENTS.LINK) {
    if (!currentUserId || normalizeValue(currentUserId) !== userId) {
      return { ...baseMetadata, result: GOOGLE_AUTH_RESULTS.PROVIDER_COLLISION };
    }
    if (!profile.exists || profile.email !== googleEmail) {
      return { ...baseMetadata, result: GOOGLE_AUTH_RESULTS.EMAIL_MISMATCH };
    }
    return { ...baseMetadata, result: GOOGLE_AUTH_RESULTS.ALLOW_LINK };
  }

  if (profile.exists) {
    if (profile.email && profile.email !== googleEmail) {
      return hasPasswordProvider
        ? { ...baseMetadata, result: GOOGLE_AUTH_RESULTS.REQUIRE_PASSWORD_LOGIN }
        : { ...baseMetadata, result: GOOGLE_AUTH_RESULTS.PROVIDER_COLLISION };
    }
    return { ...baseMetadata, result: GOOGLE_AUTH_RESULTS.ALLOW_SIGNIN };
  }

  return intent === GOOGLE_AUTH_INTENTS.SIGN_UP
    ? { ...baseMetadata, result: GOOGLE_AUTH_RESULTS.ALLOW_SIGNUP }
    : { ...baseMetadata, result: GOOGLE_AUTH_RESULTS.REDIRECT_SIGNUP };
}

export function getGoogleIdentity(user = null) {
  const identities = Array.isArray(user?.identities) ? user.identities : [];
  return identities.find((i) => normalizeProvider(i?.provider) === GOOGLE_PROVIDER_ID) || null;
}

export function isGoogleOAuthSession(decodedToken = {}) {
  const amr = Array.isArray(decodedToken?.amr) ? decodedToken.amr : [];
  const amrMethods = amr.map((e) => (typeof e === 'string' ? normalizeValue(e).toLowerCase() : ''));

  if (
    amrMethods.includes(PASSWORD_PROVIDER_ID) ||
    amrMethods.includes('pwd') ||
    amrMethods.includes('email')
  ) {
    return false;
  }
  if (amrMethods.includes('google')) return true;

  const provider = normalizeProvider(
    decodedToken?.app_metadata?.provider ||
      (Array.isArray(decodedToken?.app_metadata?.providers)
        ? decodedToken.app_metadata.providers[0]
        : null),
  );
  return amrMethods.includes('oauth') && provider === GOOGLE_PROVIDER_ID;
}

export async function unlinkIdentityWithAccessToken({
  accessToken,
  identityId,
  fallbackMessage = 'Google provider cleanup failed',
}) {
  const normToken = normalizeValue(accessToken);
  const normId = normalizeValue(identityId);

  if (!normToken || !normId) throw new Error('AccessToken and IdentityId are required');

  const apiKey = SUPABASE_PUBLISHABLE_KEY || SUPABASE_SERVICE_ROLE_KEY;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user/identities/${normId}`, {
    method: 'DELETE',
    headers: { apikey: apiKey, Authorization: `Bearer ${normToken}` },
    cache: 'no-store',
  });

  if (response.ok) return true;
  const payload = await response.json().catch(() => null);
  throw new Error(payload?.msg || payload?.message || fallbackMessage);
}

export async function assertGoogleSessionConsistency({
  decodedToken = {},
  userRecord = null,
} = {}) {
  if (!isGoogleOAuthSession(decodedToken)) return null;

  const result = await resolveGoogleAuthIntent({
    decodedToken,
    pageIntent: GOOGLE_AUTH_INTENTS.SIGN_IN,
    userRecord,
  });
  const shouldReject =
    result?.result === GOOGLE_AUTH_RESULTS.REQUIRE_PASSWORD_LOGIN ||
    (result?.profileExists && result?.result === GOOGLE_AUTH_RESULTS.PROVIDER_COLLISION);

  if (!shouldReject) return result;

  const isPasswordRequired = result?.result === GOOGLE_AUTH_RESULTS.REQUIRE_PASSWORD_LOGIN;
  const error = new Error(
    isPasswordRequired
      ? 'This email is already used by another account. Sign in with your password once to link Google.'
      : 'This Google account is already linked to another account',
  );
  error.code = isPasswordRequired
    ? GOOGLE_SESSION_ERROR_CODES.PASSWORD_LOGIN_REQUIRED
    : GOOGLE_SESSION_ERROR_CODES.PROVIDER_COLLISION;
  error.data = result;
  throw error;
}


// ============================================================================
// FILE: domains/auth/server/index.js
// ============================================================================

export * as account from './account.server.js';
export * as audit from './audit-log.server.js';
export * as policies from './policies.server.js';
export * as providers from './google-provider.server.js';
export * as security from './security.server.js';
export * as session from './session.server.js';
export * as verification from './verification.server.js';
export * as proofTokens from './proof-tokens.server.js';


// ============================================================================
// FILE: domains/auth/server/policies.server.js
// ============================================================================

import { normalizeValue } from '@/shared/utils';
import { AUTH_ROUTE_NOTICE_COOKIE_NAME, normalizeAuthRouteNotice } from '@/domains/auth/utils';
import {
  assertSessionNotRevoked,
  AUTH_COOKIE_PATH,
  isSecureCookieEnvironment,
  requireSessionRequest,
} from './session.server';
import { ACCOUNT_LIFECYCLE_STATES, assertAccountLifecycleAllowed } from './account.server';

const AUTH_ROUTE_NOTICE_MAX_AGE_SECONDS = 60;

export function setAuthRouteNoticeCookie(response, notice) {
  const normalizedNotice = normalizeAuthRouteNotice(notice);
  if (!normalizedNotice) return;

  response.cookies.set(AUTH_ROUTE_NOTICE_COOKIE_NAME, normalizedNotice, {
    httpOnly: false,
    maxAge: AUTH_ROUTE_NOTICE_MAX_AGE_SECONDS,
    path: AUTH_COOKIE_PATH,
    sameSite: 'lax',
    secure: isSecureCookieEnvironment(),
  });
}

export function clearAuthRouteNoticeCookie(response) {
  response.cookies.set(AUTH_ROUTE_NOTICE_COOKIE_NAME, '', {
    httpOnly: false,
    maxAge: 0,
    path: AUTH_COOKIE_PATH,
    sameSite: 'lax',
    secure: isSecureCookieEnvironment(),
  });
}

const AUTH_ROUTE_POLICIES = Object.freeze({
  ACCOUNT_CHANGE_EMAIL: Object.freeze({
    allowBearerFallback: true,
    allowedLifecycleStates: Object.freeze([ACCOUNT_LIFECYCLE_STATES.ACTIVE]),
    requireSession: true,
    route: '/api/auth/account',
    session: { requireRecentAuthMs: 0 },
  }),
  ACCOUNT_CHANGE_PASSWORD: Object.freeze({
    allowBearerFallback: true,
    allowedLifecycleStates: Object.freeze([ACCOUNT_LIFECYCLE_STATES.ACTIVE]),
    requireSession: true,
    route: '/api/auth/account',
    session: { requireRecentAuthMs: 0 },
  }),
  ACCOUNT_DELETE: Object.freeze({
    allowBearerFallback: true,
    allowedLifecycleStates: Object.freeze([
      ACCOUNT_LIFECYCLE_STATES.ACTIVE,
      ACCOUNT_LIFECYCLE_STATES.PENDING_DELETE,
      ACCOUNT_LIFECYCLE_STATES.DELETED,
    ]),
    requireCsrf: true,
    requireRecentReauth: false,
    requireSession: true,
    requireStepUp: 'account-delete',
    route: '/api/auth/account',
    session: { requireRecentAuthMs: 0 },
  }),
  ACCOUNT_PASSWORD_STATUS: Object.freeze({
    allowBearerFallback: true,
    allowedLifecycleStates: Object.freeze([ACCOUNT_LIFECYCLE_STATES.ACTIVE]),
    requireSession: true,
    route: '/api/auth/account',
    session: { requireRecentAuthMs: 0 },
  }),
  ACCOUNT_REAUTHENTICATE: Object.freeze({
    allowBearerFallback: true,
    allowedLifecycleStates: Object.freeze([ACCOUNT_LIFECYCLE_STATES.ACTIVE]),
    requireSession: true,
    route: '/api/auth/account',
    session: { requireRecentAuthMs: 0 },
  }),
  ACCOUNT_SET_PASSWORD: Object.freeze({
    allowBearerFallback: true,
    allowedLifecycleStates: Object.freeze([ACCOUNT_LIFECYCLE_STATES.ACTIVE]),
    requireSession: true,
    route: '/api/auth/account',
    session: { requireRecentAuthMs: 0 },
  }),
  EMAIL_CHANGE_COMPLETE: Object.freeze({
    allowBearerFallback: true,
    allowedLifecycleStates: Object.freeze([
      ACCOUNT_LIFECYCLE_STATES.ACTIVE,
      ACCOUNT_LIFECYCLE_STATES.PENDING_CHANGE,
    ]),
    requireCsrf: true,
    requireRecentReauth: true,
    requireSession: true,
    requireStepUp: 'email-change',
    route: '/api/auth/account',
    session: { requireRecentAuthMs: 0 },
  }),
  PASSWORD_CHANGE_COMPLETE: Object.freeze({
    allowBearerFallback: true,
    allowedLifecycleStates: Object.freeze([
      ACCOUNT_LIFECYCLE_STATES.ACTIVE,
      ACCOUNT_LIFECYCLE_STATES.PENDING_CHANGE,
    ]),
    requireCsrf: true,
    requireRecentReauth: true,
    requireSession: true,
    requireStepUp: 'password-change',
    route: '/api/auth/account',
    session: { requireRecentAuthMs: 0 },
  }),
  PASSWORD_SET_COMPLETE: Object.freeze({
    allowBearerFallback: true,
    allowedLifecycleStates: Object.freeze([
      ACCOUNT_LIFECYCLE_STATES.ACTIVE,
      ACCOUNT_LIFECYCLE_STATES.PENDING_CHANGE,
    ]),
    requireCsrf: true,
    requireRecentReauth: false,
    requireSession: true,
    requireStepUp: 'password-set',
    route: '/api/auth/account',
    session: { requireRecentAuthMs: 0 },
  }),
  PASSWORD_RESET_COMPLETE: Object.freeze({
    requireCsrf: false,
    requireRecentReauth: false,
    requireSession: false,
    requireStepUp: null,
    route: '/api/auth/password-reset/complete',
  }),
  SIGN_UP_COMPLETE: Object.freeze({
    requireCsrf: false,
    requireRecentReauth: false,
    requireSession: false,
    requireStepUp: null,
    route: '/api/auth/sign-up/complete',
  }),
});

function resolvePolicy(policyKey) {
  const normalizedKey = normalizeValue(policyKey).toUpperCase();
  const policy = AUTH_ROUTE_POLICIES[normalizedKey];
  if (!policy) throw new Error(`Unknown auth route policy: ${policyKey}`);
  return policy;
}

import { extractUuid } from './session/admin.server';

export async function requirePolicySession(request, policyKey) {
  const resolvedPolicyKey =
    policyKey && typeof policyKey === 'object' ? policyKey.policyKey : policyKey;
  const policy = resolvePolicy(resolvedPolicyKey);
  if (!policy.requireSession) return null;

  const sessionContext = await requireSessionRequest(request, {
    allowBearerFallback: policy.allowBearerFallback !== false,
    requireRecentAuthMs: Number(policy?.session?.requireRecentAuthMs || 0),
  });

  const uuid = extractUuid(sessionContext);
  if (sessionContext && uuid) {
    sessionContext.userId = uuid;
  }

  await assertSessionNotRevoked(sessionContext);

  if (Array.isArray(policy.allowedLifecycleStates) && policy.allowedLifecycleStates.length > 0) {
    await assertAccountLifecycleAllowed({
      allowedStates: policy.allowedLifecycleStates,
      userId: sessionContext.userId,
    });
  }

  return sessionContext;
}

export function getAuthRoutePolicy(policyKey) {
  return resolvePolicy(policyKey);
}

export const AUTH_ROUTE_POLICY_KEYS = Object.freeze(
  Object.keys(AUTH_ROUTE_POLICIES).reduce((accumulator, key) => {
    accumulator[key] = key;
    return accumulator;
  }, {}),
);


// ============================================================================
// FILE: domains/auth/server/proof-tokens.server.js
// ============================================================================

import { randomBytes } from 'crypto';
import { normalizeEmailValue, normalizeValue } from '@/shared/utils';
import { createSignedToken, verifySignedToken } from './tokens.server';

export { createSignedToken, verifySignedToken };

export function resolveSecretWithFallback({
  primaryEnvName,
  fallbackEnvNames = [],
  missingMessage,
  warningGlobalKey = null,
  warningMessage = null,
}) {
  const primarySecret = normalizeValue(process.env[primaryEnvName]);
  if (primarySecret) return primarySecret;

  for (const envName of fallbackEnvNames) {
    const fallbackSecret = normalizeValue(process.env[envName]);
    if (fallbackSecret) {
      if (warningGlobalKey && warningMessage && !globalThis[warningGlobalKey]) {
        globalThis[warningGlobalKey] = true;
        console.warn(warningMessage);
      }
      return fallbackSecret;
    }
  }

  throw new Error(missingMessage);
}

export function createChallengeProofToken({
  challengeJti,
  challengeKey,
  email,
  userId = null,
  expiresAt = Date.now() + 10 * 60 * 1000,
  missingPayloadMessage = 'Challenge proof requires challenge, key, and email',
  secret,
}) {
  const normalizedChallengeJti = normalizeValue(challengeJti);
  const normalizedChallengeKey = normalizeValue(challengeKey);
  const normalizedEmail = normalizeEmailValue(email);

  if (!normalizedChallengeJti || !normalizedChallengeKey || !normalizedEmail) {
    throw new Error(missingPayloadMessage);
  }

  return createSignedToken(
    {
      challengeJti: normalizedChallengeJti,
      challengeKey: normalizedChallengeKey,
      email: normalizedEmail,
      userId: normalizeValue(userId) || null,
      exp: Math.floor(Number(expiresAt) / 1000),
      jti: randomBytes(12).toString('hex'),
    },
    { secret },
  );
}

export function verifyChallengeProofToken(
  token,
  {
    email,
    expiredMessage = 'Verification expired',
    invalidMessage = 'Verification invalid',
    secret,
  } = {},
) {
  const payload = verifySignedToken(token, { secret, invalidMessage });
  const expiresAtMs = Number(payload?.exp) * 1000;

  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    throw new Error(expiredMessage);
  }

  const expectedEmail = normalizeEmailValue(email);
  const payloadEmail = normalizeEmailValue(payload?.email);

  if (expectedEmail && payloadEmail !== expectedEmail) throw new Error(invalidMessage);

  const challengeJti = normalizeValue(payload?.challengeJti);
  const challengeKey = normalizeValue(payload?.challengeKey);

  if (!challengeJti || !challengeKey || !payloadEmail) throw new Error(invalidMessage);

  return {
    challengeJti,
    challengeKey,
    email: payloadEmail,
    userId: normalizeValue(payload?.userId) || null,
    expiresAt: new Date(expiresAtMs).toISOString(),
  };
}

function getPasswordResetSecret() {
  return resolveSecretWithFallback({
    primaryEnvName: 'PASSWORD_RESET_PROOF_SECRET',
    fallbackEnvNames: ['EMAIL_VERIFICATION_SECRET'],
    missingMessage:
      'PASSWORD_RESET_PROOF_SECRET is missing on the server and EMAIL_VERIFICATION_SECRET fallback is unavailable',
    warningGlobalKey: '__tvizzie_password_reset_proof_secret_fallback_warned__',
    warningMessage:
      '[Auth] PASSWORD_RESET_PROOF_SECRET is missing. Falling back to EMAIL_VERIFICATION_SECRET. Configure PASSWORD_RESET_PROOF_SECRET explicitly.',
  });
}

export function createPasswordResetProofToken({
  challengeJti,
  challengeKey,
  email,
  userId,
  expiresAt = Date.now() + 10 * 60 * 1000,
}) {
  return createChallengeProofToken({
    challengeJti,
    challengeKey,
    email,
    userId,
    expiresAt,
    missingPayloadMessage: 'Password reset proof requires challenge, key, and email',
    secret: getPasswordResetSecret(),
  });
}

export function verifyPasswordResetProofToken(token, { email } = {}) {
  return verifyChallengeProofToken(token, {
    email: normalizeValue(email),
    expiredMessage: 'Password reset verification has expired',
    invalidMessage: 'Password reset verification is invalid',
    secret: getPasswordResetSecret(),
  });
}

function getSignUpSecret() {
  return resolveSecretWithFallback({
    primaryEnvName: 'SIGN_UP_PROOF_SECRET',
    fallbackEnvNames: ['EMAIL_VERIFICATION_SECRET'],
    missingMessage:
      'SIGN_UP_PROOF_SECRET is missing on the server and EMAIL_VERIFICATION_SECRET fallback is unavailable',
    warningGlobalKey: '__tvizzie_signup_proof_secret_fallback_warned__',
    warningMessage:
      '[Auth] SIGN_UP_PROOF_SECRET is missing. Falling back to EMAIL_VERIFICATION_SECRET. Configure SIGN_UP_PROOF_SECRET explicitly.',
  });
}

export function createSignUpProofToken({
  challengeJti,
  challengeKey,
  email,
  userId,
  expiresAt = Date.now() + 10 * 60 * 1000,
}) {
  return createChallengeProofToken({
    challengeJti,
    challengeKey,
    email,
    userId,
    expiresAt,
    missingPayloadMessage: 'Sign-up proof requires challenge, key, and email',
    secret: getSignUpSecret(),
  });
}

export function verifySignUpProofToken(token, { email } = {}) {
  return verifyChallengeProofToken(token, {
    email: normalizeValue(email),
    expiredMessage: 'Sign-up verification has expired',
    invalidMessage: 'Sign-up verification is invalid',
    secret: getSignUpSecret(),
  });
}


// ============================================================================
// FILE: domains/auth/server/response.server.js
// ============================================================================

import 'server-only';

export function makeAuthResponsePrivate(response, { varyByCookie = false } = {}) {
  response.headers.set('Cache-Control', 'private, no-store');

  if (varyByCookie) {
    const vary = response.headers.get('Vary');
    response.headers.set('Vary', vary ? `${vary}, Cookie` : 'Cookie');
  }

  return response;
}


// ============================================================================
// FILE: domains/auth/server/security.server.js
// ============================================================================

import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { normalizeEmailValue, normalizeLowerValue, normalizeValue } from '@/shared/utils';
import { createClient } from '@supabase/supabase-js';
import {
  AUTH_COOKIE_PATH,
  CSRF_COOKIE_NAME,
  normalizePassword,
  STEP_UP_COOKIE_NAME,
  STEP_UP_MAX_AGE_MS,
  STEP_UP_MAX_AGE_SECONDS,
  validatePasswordRules,
} from '@/domains/auth/utils';
import {
  createCsrfToken,
  getCookieValue,
  isSecureCookieEnvironment,
  setCsrfCookie,
} from './session.server';
import { extractUuid } from './session/admin.server';
import {
  assertSupabaseBrowserEnv,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} from '@/infrastructure/supabase/supabase-constants';
import { RATE_LIMIT_FALLBACK_MODE } from '@/infrastructure/http/http-server';
import { createSignedToken, verifySignedToken } from './tokens.server';

function toBuffer(value) {
  return Buffer.from(normalizeValue(value));
}

export function getCsrfTokenFromCookie(request) {
  return getCookieValue(request, CSRF_COOKIE_NAME);
}

export function getCsrfTokenFromHeader(request) {
  return normalizeValue(request?.headers?.get?.('x-csrf-token'));
}

export function ensureCsrfCookie(response, csrfToken = '') {
  const normalizedToken = normalizeValue(csrfToken) || createCsrfToken();
  setCsrfCookie(response, normalizedToken);
  return normalizedToken;
}

export function validateCsrfRequest(request) {
  const cookieToken = getCsrfTokenFromCookie(request);
  const headerToken = getCsrfTokenFromHeader(request);

  if (!cookieToken || !headerToken) return false;

  const expected = toBuffer(cookieToken);
  const received = toBuffer(headerToken);

  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function assertCsrfRequest(request) {
  if (!validateCsrfRequest(request)) {
    throw new Error('Invalid CSRF token');
  }
}

export function assertCsrfRequestForCookieSession(request) {
  const authorization = normalizeValue(request?.headers?.get?.('authorization'));
  if (authorization.toLowerCase().startsWith('bearer ')) return;
  assertCsrfRequest(request);
}

function getPasswordSecurityClient() {
  assertSupabaseBrowserEnv();
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
}

export function validateStrongPassword(value) {
  return validatePasswordRules(value);
}

export async function verifyPasswordWithIdentityToolkit({ email, password }) {
  const client = getPasswordSecurityClient();
  const normalizedEmail = normalizeEmailValue(email);
  const normalizedPassword = normalizePassword(password);

  if (!normalizedEmail || !normalizedPassword) {
    throw new Error('Current password could not be verified');
  }

  const response = await client.auth.signInWithPassword({
    email: normalizedEmail,
    password: normalizedPassword,
  });

  if (!response.error) return;

  const message = normalizeValue(response.error?.message).toLowerCase();
  if (
    message.includes('invalid login credentials') ||
    message.includes('invalid_credentials') ||
    message.includes('invalid credentials')
  ) {
    throw new Error('Current password is incorrect');
  }

  if (message.includes('user banned') || message.includes('user_disabled')) {
    throw new Error('This account has been disabled');
  }

  throw new Error('Current password could not be verified');
}

export async function createPendingPasswordSignIn({ email, password }) {
  const client = getPasswordSecurityClient();
  const normalizedEmail = normalizeEmailValue(email);

  if (!normalizedEmail || password === undefined || password === null || password === '') {
    const err = new Error('Email and password are required');
    err.code = 'missing_credentials';
    throw err;
  }

  const response = await client.auth.signInWithPassword({
    email: normalizedEmail,
    password: String(password),
  });

  if (response.error) {
    const message = normalizeValue(response.error?.message).toLowerCase();
    if (message.includes('invalid login credentials') || message.includes('invalid_credentials')) {
      const err = new Error(
        'The password you entered is incorrect. Please check your password or reset it.',
      );
      err.code = 'invalid_login_credentials';
      throw err;
    }
    if (message.includes('user banned') || message.includes('user_disabled')) {
      const err = new Error('This account has been disabled');
      err.code = 'auth/user-disabled';
      throw err;
    }
    const err = new Error(
      response.error.message ||
        'The password you entered is incorrect. Please check your password or reset it.',
    );
    err.code = response.error.code || null;
    throw err;
  }

  const session = response.data?.session || null;
  const user = response.data?.user || session?.user || null;
  const accessToken = normalizeValue(session?.access_token);
  const refreshToken = normalizeValue(session?.refresh_token);
  const userId = normalizeValue(user?.id);
  const userEmail = normalizeEmailValue(user?.email || normalizedEmail);

  if (!accessToken || !refreshToken || !userId || !userEmail) {
    throw new Error('Sign in failed');
  }

  return {
    accessToken,
    email: userEmail,
    provider: normalizeValue(session?.user?.app_metadata?.provider) || 'password',
    refreshToken,
    user,
    userId,
  };
}

export const RECENT_REAUTH_COOKIE_NAME = 'tvz_recent_reauth';
export const RECENT_REAUTH_MAX_AGE_MS = 5 * 60 * 1000;
const RECENT_REAUTH_MAX_AGE_SECONDS = RECENT_REAUTH_MAX_AGE_MS / 1000;

function getReauthSecret() {
  const secret =
    normalizeValue(process.env.RECENT_REAUTH_SECRET) ||
    normalizeValue(process.env.STEP_UP_SECRET) ||
    normalizeValue(process.env.EMAIL_VERIFICATION_SECRET);

  if (!secret) {
    throw new Error(
      'RECENT_REAUTH_SECRET is missing on the server and no fallback secret is available',
    );
  }

  return secret;
}

export function createRecentReauthToken({
  email = null,
  expiresAt = Date.now() + RECENT_REAUTH_MAX_AGE_MS,
  sessionJti = null,
  userId,
}) {
  const normalizedUserId = extractUuid(userId) || normalizeValue(userId);
  if (!normalizedUserId) throw new Error('Recent reauthentication requires a userId');

  const payload = {
    email: normalizeEmailValue(email) || null,
    exp: Math.floor(Number(expiresAt) / 1000),
    sessionJti: normalizeValue(sessionJti) || null,
    userId: normalizedUserId,
  };

  return createSignedToken(payload, { secret: getReauthSecret() });
}

export function verifyRecentReauthToken(token) {
  const payload = verifySignedToken(token, {
    invalidMessage: 'Recent authentication is required',
    secret: getReauthSecret(),
  });

  const expiresAtMs = Number(payload?.exp) * 1000;
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    throw new Error('Recent authentication is required');
  }

  return {
    email: normalizeEmailValue(payload?.email) || null,
    expiresAt: new Date(expiresAtMs).toISOString(),
    sessionJti: normalizeValue(payload?.sessionJti) || null,
    userId: normalizeValue(payload?.userId) || null,
  };
}

export function readRecentReauthFromRequest(request) {
  const token = getCookieValue(request, RECENT_REAUTH_COOKIE_NAME);
  if (!token) return null;
  return verifyRecentReauthToken(token);
}

export function assertRecentReauth(request, { email = null, sessionJti = null, userId }) {
  const reauth = readRecentReauthFromRequest(request);
  const expectedUserId = extractUuid(userId) || normalizeValue(userId);
  const expectedSessionJti = normalizeValue(sessionJti);
  const expectedEmail = normalizeEmailValue(email);

  if (!reauth) throw new Error('Recent authentication is required');
  if (!expectedUserId || reauth.userId !== expectedUserId)
    throw new Error('Recent authentication is required');
  if (expectedSessionJti && reauth.sessionJti !== expectedSessionJti)
    throw new Error('Recent authentication is required');
  if (expectedEmail && reauth.email && reauth.email !== expectedEmail)
    throw new Error('Recent authentication is required');

  return reauth;
}

export function setRecentReauthCookie(response, token) {
  response.cookies.set(RECENT_REAUTH_COOKIE_NAME, token, {
    httpOnly: true,
    maxAge: RECENT_REAUTH_MAX_AGE_SECONDS,
    path: AUTH_COOKIE_PATH,
    sameSite: 'strict',
    secure: isSecureCookieEnvironment(),
  });
}

export function clearRecentReauthCookie(response) {
  response.cookies.set(RECENT_REAUTH_COOKIE_NAME, '', {
    httpOnly: true,
    maxAge: 0,
    path: AUTH_COOKIE_PATH,
    sameSite: 'strict',
    secure: isSecureCookieEnvironment(),
  });
}

function getStepUpSecret() {
  const secret =
    normalizeValue(process.env.STEP_UP_SECRET) ||
    normalizeValue(process.env.EMAIL_VERIFICATION_SECRET);
  if (!secret)
    throw new Error('STEP_UP_SECRET is missing on the server and no fallback secret is available');
  return secret;
}

export function createStepUpToken({
  challengeJti = null,
  email = null,
  purpose,
  userId,
  expiresAt = Date.now() + STEP_UP_MAX_AGE_MS,
}) {
  const normalizedPurpose = normalizeLowerValue(purpose);
  const normalizedUserId = extractUuid(userId) || normalizeValue(userId);

  if (!normalizedPurpose || !normalizedUserId) {
    throw new Error('Step-up purpose and userId are required');
  }

  const payload = {
    exp: Math.floor(Number(expiresAt) / 1000),
    jti: normalizeValue(challengeJti) || randomBytes(12).toString('hex'),
    email: normalizeEmailValue(email) || null,
    purpose: normalizedPurpose,
    userId: normalizedUserId,
  };

  return createSignedToken(payload, { secret: getStepUpSecret() });
}

export function verifyStepUpToken(token) {
  const payload = verifySignedToken(token, {
    invalidMessage: 'Invalid step-up token',
    secret: getStepUpSecret(),
  });

  const expiresAtMs = Number(payload?.exp) * 1000;
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    throw new Error('Step-up verification expired');
  }

  return {
    challengeJti: normalizeValue(payload?.jti) || null,
    email: normalizeEmailValue(payload?.email) || null,
    expiresAt: new Date(expiresAtMs).toISOString(),
    purpose: normalizeLowerValue(payload?.purpose),
    userId: normalizeValue(payload?.userId) || null,
  };
}

export function readStepUpFromRequest(request) {
  const token = getCookieValue(request, STEP_UP_COOKIE_NAME);
  if (!token) return null;
  return verifyStepUpToken(token);
}

export function listStepUpPurposes(stepUpPayload = null) {
  const purpose = normalizeLowerValue(stepUpPayload?.purpose);
  return purpose ? [purpose] : [];
}

export function assertStepUp(request, { purpose, userId, email = null }) {
  const stepUp = readStepUpFromRequest(request);
  const expectedPurpose = normalizeLowerValue(purpose);
  const expectedUserId = extractUuid(userId) || normalizeValue(userId);
  const expectedEmail = normalizeEmailValue(email);

  if (!stepUp) throw new Error('Step-up verification is required');
  if (stepUp.userId !== expectedUserId) throw new Error('Step-up verification is invalid');

  const purposeList = stepUp.purpose
    .split(':')
    .map((item) => normalizeLowerValue(item))
    .filter(Boolean);

  if (!purposeList.includes(expectedPurpose)) throw new Error('Step-up verification is invalid');
  if (expectedEmail && stepUp.email !== expectedEmail)
    throw new Error('Step-up verification is invalid');

  return stepUp;
}

export function setStepUpCookie(response, token) {
  response.cookies.set(STEP_UP_COOKIE_NAME, token, {
    httpOnly: true,
    maxAge: STEP_UP_MAX_AGE_SECONDS,
    path: AUTH_COOKIE_PATH,
    sameSite: 'strict',
    secure: isSecureCookieEnvironment(),
  });
}

export function clearStepUpCookie(response) {
  response.cookies.set(STEP_UP_COOKIE_NAME, '', {
    httpOnly: true,
    maxAge: 0,
    path: AUTH_COOKIE_PATH,
    sameSite: 'strict',
    secure: isSecureCookieEnvironment(),
  });
}

class SlidingWindowRateLimitError extends Error {
  constructor({ message, retryAfterMs, dimension, key }) {
    super(message || 'Too many requests. Please try again later');
    this.name = 'SlidingWindowRateLimitError';
    this.code = 'RATE_LIMIT_EXCEEDED';
    this.status = 429;
    this.retryAfterMs = Math.max(1000, Number(retryAfterMs) || 1000);
    this.retryAfterSeconds = Math.ceil(this.retryAfterMs / 1000);
    this.dimension = dimension || null;
    this.key = key || null;
  }
}

export function isSlidingWindowRateLimitError(error) {
  return error?.code === 'RATE_LIMIT_EXCEEDED';
}

const MEMORY_STORE_KEY = '__tvizzie_auth_rate_limit_memory_store__';

function getMemoryStore() {
  if (!globalThis[MEMORY_STORE_KEY]) {
    globalThis[MEMORY_STORE_KEY] = new Map();
  }
  return globalThis[MEMORY_STORE_KEY];
}

export async function enforceSlidingWindowRateLimit({
  namespace,
  windowMs = 15 * 60 * 1000,
  dimensions = [],
  message = 'Too many requests. Please try again later',
}) {
  const normalizedNamespace = normalizeLowerValue(namespace);
  if (!normalizedNamespace) throw new Error('Rate limit namespace is required');

  const normalizedWindowMs = Math.max(1000, Number(windowMs) || 1000);
  const validDimensions = (Array.isArray(dimensions) ? dimensions : [])
    .map((d) => ({
      id: normalizeLowerValue(d?.id),
      limit: Number(d?.limit) || 0,
      value: normalizeLowerValue(d?.value),
    }))
    .filter((d) => Boolean(d.id && d.value && d.limit > 0));

  if (!validDimensions.length) return;

  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    const internalToken = normalizeValue(process.env.INFRA_INTERNAL_TOKEN);
    if (internalToken) {
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/rate-limit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'x-infra-internal-token': internalToken,
          },
          body: JSON.stringify({
            dimensions: validDimensions,
            message,
            namespace: normalizedNamespace,
            windowMs: normalizedWindowMs,
          }),
          cache: 'no-store',
        });
        const payload = await response.json().catch(() => ({}));
        if (payload?.allowed === false) {
          throw new SlidingWindowRateLimitError({
            message,
            retryAfterMs: payload?.retryAfterMs,
            dimension: normalizeLowerValue(payload?.dimension) || null,
            key: `${normalizedNamespace}:${normalizeLowerValue(payload?.dimension)}`,
          });
        }
        if (response.ok) return;
      } catch (err) {
        if (isSlidingWindowRateLimitError(err)) throw err;
      }
    }
  }

  const now = Date.now();
  const bucket = Math.floor(now / normalizedWindowMs);
  const store = getMemoryStore();

  for (const dimension of validDimensions) {
    const key = `${normalizedNamespace}:${dimension.id}:${createHash('sha256').update(dimension.value).digest('hex')}:${bucket}`;
    const current = Number(store.get(key) || 0) + 1;
    store.set(key, current);

    if (current > dimension.limit) {
      const retryAfterMs = normalizedWindowMs - (now - bucket * normalizedWindowMs);
      throw new SlidingWindowRateLimitError({
        message,
        retryAfterMs,
        dimension: dimension.id,
        key,
      });
    }
  }
}

export const AUTH_RATE_LIMIT_POLICIES = Object.freeze({
  SIGN_IN: Object.freeze({
    dimensions: Object.freeze({ device: 12, email: 8, ip: 30 }),
    dimensionMessages: Object.freeze({
      default: 'Too many sign-in attempts from this network',
      device: 'Too many sign-in attempts from this device',
      email: 'Too many sign-in attempts for this account',
    }),
    message: 'Too many sign-in attempts',
    namespace: 'auth:sign-in',
    windowMs: 15 * 60 * 1000,
  }),
  VERIFICATION_SEND: Object.freeze({
    dimensions: Object.freeze({ device: 8, email: 5, ip: 20 }),
    dimensionMessages: Object.freeze({
      default: 'Too many verification requests from this network',
      device: 'Too many verification requests from this device',
      email: 'Too many verification requests for this email',
    }),
    message: 'Too many verification requests',
    namespace: 'auth:verification-send',
    windowMs: 15 * 60 * 1000,
  }),
  VERIFICATION_VERIFY: Object.freeze({
    dimensions: Object.freeze({ device: 20, email: 12, ip: 40 }),
    dimensionMessages: Object.freeze({
      default: 'Too many verification attempts from this network',
      device: 'Too many verification attempts from this device',
      email: 'Too many verification attempts for this email',
    }),
    message: 'Too many verification attempts',
    namespace: 'auth:verification-verify',
    windowMs: 15 * 60 * 1000,
  }),
  ACCOUNT_DELETE: Object.freeze({
    dimensions: Object.freeze({ device: 6, ip: 10, user: 4 }),
    dimensionMessages: Object.freeze({
      default: 'Too many account deletion attempts from this network',
      device: 'Too many account deletion attempts from this device',
      user: 'Too many account deletion attempts for this account',
    }),
    message: 'Too many account deletion attempts',
    namespace: 'auth:account-delete',
    windowMs: 15 * 60 * 1000,
  }),
  EMAIL_CHANGE_COMPLETE: Object.freeze({
    dimensions: Object.freeze({ device: 12, ip: 20, user: 8 }),
    dimensionMessages: Object.freeze({
      default: 'Too many email change attempts from this network',
      device: 'Too many email change attempts from this device',
      user: 'Too many email change attempts for this account',
    }),
    message: 'Too many email change attempts',
    namespace: 'auth:email-change:complete',
    windowMs: 15 * 60 * 1000,
  }),
  PASSWORD_CHANGE_COMPLETE: Object.freeze({
    dimensions: Object.freeze({ device: 12, ip: 20, user: 8 }),
    dimensionMessages: Object.freeze({
      default: 'Too many password change attempts from this network',
      device: 'Too many password change attempts from this device',
      user: 'Too many password change attempts for this account',
    }),
    message: 'Too many password change attempts',
    namespace: 'auth:password-change:complete',
    windowMs: 15 * 60 * 1000,
  }),
  PASSWORD_RESET_COMPLETE: Object.freeze({
    dimensions: Object.freeze({ device: 12, email: 6, ip: 24 }),
    dimensionMessages: Object.freeze({
      default: 'Too many password reset attempts from this network',
      device: 'Too many password reset attempts from this device',
      email: 'Too many password reset attempts for this email',
    }),
    message: 'Too many password reset attempts',
    namespace: 'auth:password-reset:complete',
    windowMs: 15 * 60 * 1000,
  }),
  PASSWORD_SET_COMPLETE: Object.freeze({
    dimensions: Object.freeze({ device: 12, ip: 20, user: 8 }),
    dimensionMessages: Object.freeze({
      default: 'Too many password setup attempts from this network',
      device: 'Too many password setup attempts from this device',
      user: 'Too many password setup attempts for this account',
    }),
    message: 'Too many password setup attempts',
    namespace: 'auth:password-set:complete',
    windowMs: 15 * 60 * 1000,
  }),
  SIGN_UP_COMPLETE: Object.freeze({
    dimensions: Object.freeze({ device: 12, email: 6, ip: 24 }),
    dimensionMessages: Object.freeze({
      default: 'Too many sign-up attempts from this network',
      device: 'Too many sign-up attempts from this device',
      email: 'Too many sign-up attempts for this email',
    }),
    message: 'Too many sign-up attempts',
    namespace: 'auth:sign-up:complete',
    windowMs: 15 * 60 * 1000,
  }),
});

export const AUTH_RATE_LIMIT_POLICY_KEYS = Object.freeze(
  Object.keys(AUTH_RATE_LIMIT_POLICIES).reduce((acc, key) => {
    acc[key] = key;
    return acc;
  }, {}),
);

export async function enforceAuthRateLimit(policyKey, { dimensionValues = {} } = {}) {
  const key = normalizeLowerValue(policyKey).toUpperCase();
  const policy = AUTH_RATE_LIMIT_POLICIES[key];

  if (!policy) throw new Error(`Unknown auth rate-limit policy: ${policyKey}`);

  const dimensions = Object.entries(policy.dimensions || {}).map(([id, limit]) => ({
    id,
    limit,
    value: dimensionValues?.[id],
  }));

  try {
    await enforceSlidingWindowRateLimit({
      dimensions,
      message: policy.message,
      namespace: policy.namespace,
      windowMs: policy.windowMs,
    });
  } catch (error) {
    if (!isSlidingWindowRateLimitError(error)) throw error;
    const dim = normalizeLowerValue(error.dimension);
    const msg =
      (dim && policy.dimensionMessages?.[dim]) ||
      policy.dimensionMessages?.default ||
      policy.message;
    throw new Error(msg);
  }
}


// ============================================================================
// FILE: domains/auth/server/session.server.js
// ============================================================================

import 'server-only';
import { createHash } from 'crypto';
import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { normalizeEmailValue, normalizeValue } from '@/shared/utils';
import { createAdminClient } from '@/infrastructure/supabase/admin';
import {
  combineCookieChunks,
  getCookieChunkBaseName,
  isSupabaseAuthCookieName,
  parseSupabaseSessionAccessToken,
} from '@/infrastructure/supabase/auth-storage';
import {
  assertSupabaseBrowserEnv,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from '@/infrastructure/supabase/supabase-constants';
import { SUPABASE_FALLBACK_TIMEOUT_MS } from '@/domains/auth/utils';
export {
  applySupabaseSessionToResponse,
  AUTH_COOKIE_PATH,
  buildNormalizedSession,
  clearAuthCookies,
  clearCsrfCookie,
  createCsrfToken,
  CSRF_COOKIE_NAME,
  getCookieValue,
  isSecureCookieEnvironment,
  setCsrfCookie,
  setDeviceIdCookie,
  STEP_UP_COOKIE_NAME,
  STEP_UP_MAX_AGE_MS,
  STEP_UP_MAX_AGE_SECONDS,
} from './session/cookies.server';
import { getCookieValue } from './session/cookies.server';
export {
  createAdminAuthFacade,
  createUser,
  deleteUser,
  getUserByEmail,
  getUserById,
  invokeSessionControl,
  revokeRefreshTokens,
  updateUser,
} from './session/admin.server';

const DEVICE_ID_COOKIE_NAME = 'tvz_device_id';

function hashValue(value) {
  const normalized = normalizeValue(value);
  return normalized ? createHash('sha256').update(normalized).digest('hex') : null;
}

function getHeader(request, name) {
  return normalizeValue(request?.headers?.get?.(name));
}

function getIpAddress(request) {
  const forwardedFor = getHeader(request, 'x-forwarded-for');
  if (forwardedFor) return normalizeValue(forwardedFor.split(',')[0]);
  return getHeader(request, 'x-real-ip') || getHeader(request, 'cf-connecting-ip') || 'unknown';
}

function resolveDeviceId(request, ipAddress) {
  const explicitDeviceId = getCookieValue(request, DEVICE_ID_COOKIE_NAME);

  if (explicitDeviceId) return explicitDeviceId;

  const userAgent = getHeader(request, 'user-agent') || 'unknown';
  const acceptLanguage = getHeader(request, 'accept-language') || 'unknown';
  const clientHints = getHeader(request, 'sec-ch-ua') || 'unknown';
  const fingerprintSeed = `${ipAddress}|${userAgent}|${acceptLanguage}|${clientHints}`;

  return `fp_${createHash('sha256').update(fingerprintSeed).digest('hex').slice(0, 32)}`;
}

export function getRequestContext(request) {
  const ipAddress = getIpAddress(request);
  const deviceId = resolveDeviceId(request, ipAddress);
  const userAgent = getHeader(request, 'user-agent') || null;
  const requestId =
    getHeader(request, 'x-request-id') ||
    getHeader(request, 'x-correlation-id') ||
    getHeader(request, 'x-vercel-id') ||
    null;

  return {
    deviceHash: hashValue(deviceId),
    deviceId,
    ipAddress,
    ipHash: hashValue(ipAddress),
    requestId,
    userAgent,
    userAgentHash: hashValue(userAgent),
  };
}

export function getBearerToken(request) {
  const authHeader = getHeader(request, 'authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  return '';
}

export function hasSessionHint(request, { allowBearer = true } = {}) {
  if (allowBearer && getBearerToken(request)) return true;
  const cookieHeader = getHeader(request, 'cookie');
  return Boolean(cookieHeader && (cookieHeader.includes('sb-') || cookieHeader.includes('tvz_')));
}

export function readSessionFromSupabaseCookies(request) {
  const legacyAccessToken = getCookieValue(request, 'sb-access-token');
  const legacyRefreshToken = getCookieValue(request, 'sb-refresh-token');

  if (legacyAccessToken) {
    return {
      accessToken: legacyAccessToken,
      refreshToken: legacyRefreshToken,
      source: 'legacy-session',
    };
  }

  const cookieMap = new Map();
  const sessionCookieNames = new Set();
  const requestCookies =
    typeof request?.cookies?.getAll === 'function'
      ? request.cookies.getAll()
      : String(getHeader(request, 'cookie') || '')
          .split(';')
          .flatMap((entry) => {
            const separatorIndex = entry.indexOf('=');
            if (separatorIndex <= 0) return [];

            const name = normalizeValue(entry.slice(0, separatorIndex));
            if (!name) return [];

            return [{ name, value: entry.slice(separatorIndex + 1).trim() }];
          });

  requestCookies.forEach(({ name, value }) => {
    const normalizedName = normalizeValue(name);
    if (!normalizedName) return;

    cookieMap.set(normalizedName, normalizeValue(value));
    const baseName = getCookieChunkBaseName(normalizedName);
    if (isSupabaseAuthCookieName(baseName)) sessionCookieNames.add(baseName);
  });

  for (const cookieName of sessionCookieNames) {
    const accessToken = parseSupabaseSessionAccessToken(combineCookieChunks(cookieMap, cookieName));
    if (accessToken) {
      return {
        accessToken,
        refreshToken: null,
        source: 'ssr-cookie-session',
      };
    }
  }

  return null;
}

function parseJwtClaims(token) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function buildAuthContextFromAccessToken(token, source = 'session', rawUser = null) {
  const claims = parseJwtClaims(token);
  if (!claims || !claims.sub) {
    throw new Error('Invalid or expired authentication token');
  }

  const expMs = Number(claims.exp) * 1000;
  if (Number.isFinite(expMs) && expMs <= Date.now()) {
    throw new Error('Invalid or expired authentication token');
  }

  return {
    accessToken: token,
    decodedToken: claims,
    email: normalizeEmailValue(claims.email || rawUser?.email) || null,
    sessionJti: claims.session_id || claims.jti || null,
    source,
    userId: claims.sub,
    user: rawUser,
  };
}

const VERIFIED_TOKEN_CACHE = new Map();
const VERIFIED_TOKEN_CACHE_TTL_MS = 60 * 1000;

function getCachedVerifiedSession(token) {
  const entry = VERIFIED_TOKEN_CACHE.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    VERIFIED_TOKEN_CACHE.delete(token);
    return null;
  }
  return entry.context;
}

function setCachedVerifiedSession(token, context) {
  const expMs = Number(context.decodedToken?.exp) * 1000;
  const maxTtlMs =
    Number.isFinite(expMs) && expMs > Date.now()
      ? Math.min(Date.now() + VERIFIED_TOKEN_CACHE_TTL_MS, expMs)
      : Date.now() + VERIFIED_TOKEN_CACHE_TTL_MS;

  VERIFIED_TOKEN_CACHE.set(token, {
    context,
    expiresAt: maxTtlMs,
  });

  if (VERIFIED_TOKEN_CACHE.size > 500) {
    const firstKey = VERIFIED_TOKEN_CACHE.keys().next().value;
    VERIFIED_TOKEN_CACHE.delete(firstKey);
  }
}

let sharedAuthClient = null;

function getSharedAuthClient() {
  if (!sharedAuthClient) {
    assertSupabaseBrowserEnv();
    sharedAuthClient = createSupabaseClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
  }
  return sharedAuthClient;
}

async function verifyAccessTokenWithSupabase(token, source) {
  const normalizedToken = normalizeValue(token);
  if (!normalizedToken) return null;

  const cached = getCachedVerifiedSession(normalizedToken);
  if (cached) {
    return cached;
  }

  const client = getSharedAuthClient();
  const result = await withTimeout(
    client.auth.getUser(normalizedToken),
    SUPABASE_FALLBACK_TIMEOUT_MS,
  );

  if (result.error || !result.data?.user?.id) {
    throw new Error('Invalid or expired authentication token');
  }

  const context = buildAuthContextFromAccessToken(normalizedToken, source, result.data.user);
  if (context.userId !== result.data.user.id) {
    throw new Error('Invalid or expired authentication token');
  }

  const finalContext = {
    ...context,
    email: normalizeEmailValue(result.data.user.email) || context.email,
    user: result.data.user,
    userId: result.data.user.id,
  };

  setCachedVerifiedSession(normalizedToken, finalContext);

  return finalContext;
}

export function createSessionFromIdToken(idToken) {
  return buildAuthContextFromAccessToken(idToken, 'idToken');
}

export function buildSessionUser(user) {
  if (!user?.id) return null;
  return {
    id: user.id,
    email: normalizeEmailValue(user.email) || null,
    appMetadata: user.app_metadata || {},
    userMetadata: user.user_metadata || {},
  };
}

export function serializeSessionState(sessionContext) {
  if (!sessionContext) return null;
  return {
    userId: sessionContext.userId,
    email: sessionContext.email,
    source: sessionContext.source,
  };
}

export function isTransientNetworkError(error) {
  const msg = normalizeValue(error?.message).toLowerCase();
  return (
    msg.includes('fetch failed') ||
    msg.includes('network error') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout')
  );
}

export function isTransientSessionError(error) {
  const msg = normalizeValue(error?.message).toLowerCase();
  return msg.includes('timeout') || isTransientNetworkError(error);
}

export function normalizeSupabaseError(error) {
  const message = normalizeValue(error?.message);
  if (!message) return new Error('Supabase request failed');
  const err = new Error(message);
  err.code = error.code || 'SUPABASE_ERROR';
  return err;
}

export function withTimeout(promise, timeoutMs) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

export function createRequestSupabaseClient(request) {
  assertSupabaseBrowserEnv();
  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => {
        if (typeof request?.cookies?.getAll === 'function') {
          return request.cookies.getAll();
        }

        const cookieHeader = getHeader(request, 'cookie');
        if (!cookieHeader) return [];

        return cookieHeader.split(';').flatMap((item) => {
          const separatorIndex = item.indexOf('=');
          if (separatorIndex <= 0) return [];

          const name = normalizeValue(item.slice(0, separatorIndex));
          const rawValue = item.slice(separatorIndex + 1).trim();
          if (!name) return [];

          let value = rawValue;
          try {
            value = decodeURIComponent(rawValue);
          } catch {}

          return [{ name, value }];
        });
      },
    },
  });
}

export function createAuthenticatedSupabaseClient(accessToken) {
  const normalizedAccessToken = normalizeValue(accessToken);

  if (!normalizedAccessToken) {
    throw new Error('Authentication session is required');
  }

  assertSupabaseBrowserEnv();
  return createSupabaseClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    accessToken: async () => normalizedAccessToken,
    global: {
      headers: {
        Authorization: `Bearer ${normalizedAccessToken}`,
      },
    },
  });
}

export async function readSessionFromRequest(
  request,
  { allowBearer = true, skipSupabaseFallbackIfNoHint = true, skipSupabaseFallback = false } = {},
) {
  try {
    const bearerToken = allowBearer ? getBearerToken(request) : '';
    if (bearerToken) {
      return await verifyAccessTokenWithSupabase(bearerToken, 'bearer');
    }

    const cookieSession = readSessionFromSupabaseCookies(request);
    if (cookieSession?.accessToken) {
      try {
        return await verifyAccessTokenWithSupabase(
          cookieSession.accessToken,
          cookieSession.source || 'cookie-session',
        );
      } catch (legacyCookieError) {
        if (
          isTransientNetworkError(legacyCookieError) ||
          isTransientSessionError(legacyCookieError)
        ) {
          throw legacyCookieError;
        }
      }
    }

    if (skipSupabaseFallback) return null;
    if (skipSupabaseFallbackIfNoHint && !hasSessionHint(request, { allowBearer })) return null;

    const supabase = createRequestSupabaseClient(request);
    let userResult;
    try {
      userResult = await withTimeout(supabase.auth.getUser(), SUPABASE_FALLBACK_TIMEOUT_MS);
    } catch (fallbackError) {
      if (isTransientNetworkError(fallbackError) || isTransientSessionError(fallbackError)) {
        return null;
      }
      throw fallbackError;
    }

    if (userResult.error) {
      if (isTransientNetworkError(userResult.error)) return null;
      throw normalizeSupabaseError(userResult.error);
    }

    const rawUser = userResult.data?.user || null;
    if (!rawUser?.id) return null;

    return {
      accessToken: null,
      decodedToken: { sub: rawUser.id, email: rawUser.email },
      email: normalizeEmailValue(rawUser.email) || null,
      sessionJti: null,
      source: 'session',
      userId: rawUser.id,
      user: rawUser,
    };
  } catch (error) {
    if (isTransientNetworkError(error) || isTransientSessionError(error)) return null;
    throw normalizeSupabaseError(error);
  }
}

export async function requireSessionRequest(
  request,
  { allowBearerFallback = true, requireRecentAuthMs = 0 } = {},
) {
  try {
    const sessionContext = await readSessionFromRequest(request, {
      allowBearer: allowBearerFallback,
    });

    if (!sessionContext) {
      throw new Error('Authentication session is required');
    }

    if (requireRecentAuthMs > 0) {
      const authTimeSeconds = Number(
        sessionContext.decodedToken?.auth_time || sessionContext.decodedToken?.iat || 0,
      );
      if (!Number.isFinite(authTimeSeconds) || authTimeSeconds <= 0) {
        throw new Error('Recent authentication is required');
      }
      const elapsedMs = Date.now() - authTimeSeconds * 1000;
      if (elapsedMs > Number(requireRecentAuthMs)) {
        throw new Error('Recent authentication is required');
      }
    }

    return sessionContext;
  } catch (error) {
    if (isTransientSessionError(error)) throw error;
    const msg = normalizeValue(error?.message).toLowerCase();
    if (
      msg.includes('invalid or expired authentication token') ||
      msg.includes('authentication token has been revoked')
    ) {
      throw new Error('Invalid or expired authentication token');
    }
    if (msg.includes('authentication session is required')) {
      throw new Error('Authentication session is required');
    }
    throw error;
  }
}

export async function requireAuthenticatedRequest(request, options = {}) {
  return requireSessionRequest(request, options);
}

export async function resolveOptionalSessionRequest(
  request,
  { allowBearerFallback = true, requireRecentAuthMs = 0, skipSupabaseFallback = true } = {},
) {
  try {
    const sessionContext = await readSessionFromRequest(request, {
      allowBearer: allowBearerFallback,
      skipSupabaseFallbackIfNoHint: true,
      skipSupabaseFallback,
    });

    if (!sessionContext) return null;
    if (requireRecentAuthMs > 0) {
      const authTimeSeconds = Number(
        sessionContext.decodedToken?.auth_time || sessionContext.decodedToken?.iat || 0,
      );
      if (!Number.isFinite(authTimeSeconds) || authTimeSeconds <= 0) return null;
      if (Date.now() - authTimeSeconds * 1000 > Number(requireRecentAuthMs)) return null;
    }

    return sessionContext;
  } catch {
    return null;
  }
}

export async function isSessionRevoked({ decodedToken = {}, sessionJti = null, userId }) {
  const normalizedUserId = normalizeValue(userId);
  if (!normalizedUserId) return false;

  const admin = createAdminClient();
  const issuedAtSeconds = Number(decodedToken?.iat || 0);
  const p_iat =
    Number.isFinite(issuedAtSeconds) && issuedAtSeconds > 0
      ? new Date(issuedAtSeconds * 1000).toISOString()
      : null;

  const result = await admin.rpc('auth_is_session_revoked', {
    p_iat,
    p_session_jti: normalizeValue(sessionJti) || null,
    p_user_id: normalizedUserId,
  });

  if (result.error) {
    throw new Error(result.error.message || 'Session revocation check failed');
  }

  const data = result.data;
  if (typeof data === 'boolean') return data;
  if (Array.isArray(data) && data.length > 0) return Boolean(data[0]);
  if (data && typeof data === 'object') {
    if (typeof data.auth_is_session_revoked === 'boolean') return data.auth_is_session_revoked;
    for (const val of Object.values(data)) {
      if (typeof val === 'boolean') return val;
    }
  }
  return false;
}

export async function assertSessionNotRevoked(authContext = null) {
  if (!authContext?.userId) return authContext;

  const revoked = await isSessionRevoked({
    decodedToken: authContext.decodedToken,
    sessionJti: authContext.sessionJti,
    userId: authContext.userId,
  });

  if (!revoked) return authContext;

  const error = new Error('Authentication token has been revoked');
  error.code = 'AUTH_TOKEN_REVOKED';
  throw error;
}


// ============================================================================
// FILE: domains/auth/server/session/admin.server.js
// ============================================================================

import 'server-only';
import { normalizeEmailValue, normalizeValue } from '@/shared/utils';
import { createAdminClient } from '@/infrastructure/supabase/admin';
import {
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} from '@/infrastructure/supabase/supabase-constants';
import { resolveProviderDescriptors } from '@/domains/auth/utils';

const SESSION_CONTROL_FUNCTION = 'session-control';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function extractUuid(input) {
  if (!input) return null;
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (UUID_REGEX.test(trimmed)) return trimmed;
    const match = trimmed.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    return match ? match[1] : null;
  }
  if (typeof input === 'object' && input !== null) {
    if (typeof input.userId === 'string') {
      const extracted = extractUuid(input.userId);
      if (extracted) return extracted;
    }
    if (input.user) {
      const extracted = extractUuid(input.user);
      if (extracted) return extracted;
    }
    if (typeof input.id === 'string') {
      const extracted = extractUuid(input.id);
      if (extracted) return extracted;
    }
    if (typeof input.uid === 'string') {
      const extracted = extractUuid(input.uid);
      if (extracted) return extracted;
    }
    if (typeof input.sub === 'string') {
      const extracted = extractUuid(input.sub);
      if (extracted) return extracted;
    }
    if (typeof input.user_id === 'string') {
      const extracted = extractUuid(input.user_id);
      if (extracted) return extracted;
    }
  }
  return null;
}

function assertUserId(userId) {
  const uuid = extractUuid(userId);
  if (!uuid) {
    throw new Error('Valid User ID UUID is required');
  }
  return uuid;
}

function normalizeIdentities(value) {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toUserRecord(user = null) {
  if (!user?.id) return null;
  const identities = normalizeIdentities(user.identities);

  return {
    app_metadata: user.app_metadata || {},
    disabled: user.banned_until != null,
    email: normalizeEmailValue(user.email) || null,
    emailVerified: user.email_confirmed_at != null || user.confirmed_at != null,
    identityCount: identities.length,
    metadata: {
      creationTime: user.created_at || null,
      lastSignInTime: user.last_sign_in_at || null,
    },
    providerData: resolveProviderDescriptors({
      identities,
      email: user.email,
      userId: user.id,
    }).map((provider) => ({ email: provider.email, providerId: provider.id, uid: provider.uid })),
    uid: user.id,
    user_metadata: user.user_metadata || {},
  };
}

export async function invokeSessionControl({ currentSessionJti = null, reason = null, userId }) {
  const normalizedUserId = assertUserId(userId);
  const internalToken = normalizeValue(process.env.INFRA_INTERNAL_TOKEN);
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !internalToken) {
    throw new Error('Supabase session control is not configured');
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/${SESSION_CONTROL_FUNCTION}`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'x-infra-internal-token': internalToken,
    },
    body: JSON.stringify({
      currentSessionJti: normalizeValue(currentSessionJti) || null,
      reason: normalizeValue(reason) || null,
      userId: normalizedUserId,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || normalizeValue(payload?.ok).toLowerCase() === 'false') {
    throw new Error(normalizeValue(payload?.error) || 'Session control request failed');
  }

  return payload;
}

export async function getUserByEmail(email) {
  const normalizedEmail = normalizeEmailValue(email);
  if (!normalizedEmail) throw new Error('Email is required');
  const result = await createAdminClient()
    .rpc('auth_get_user_by_email', { p_email: normalizedEmail })
    .maybeSingle();
  if (result.error) throw new Error(result.error.message || 'User lookup failed');
  if (!result.data) {
    const error = new Error('User not found');
    error.code = 'auth/user-not-found';
    throw error;
  }
  return toUserRecord(result.data);
}

export async function getUserById(userId) {
  const result = await createAdminClient().auth.admin.getUserById(assertUserId(userId));
  if (result.error) {
    const msg = normalizeValue(result.error.message).toLowerCase();
    if (msg.includes('not found') || msg.includes('does not exist')) {
      return null;
    }
    throw new Error(result.error.message || 'User could not be loaded');
  }
  return toUserRecord(result.data?.user || null);
}

export async function createUser(payload = {}) {
  const createPayload = {
    email: normalizeEmailValue(payload.email),
    email_confirm: Boolean(payload.emailVerified ?? true),
  };
  if (payload.password) createPayload.password = String(payload.password);
  if (payload.appMetadata) createPayload.app_metadata = payload.appMetadata;
  if (payload.userMetadata) createPayload.user_metadata = payload.userMetadata;

  const result = await createAdminClient().auth.admin.createUser(createPayload);
  if (result.error) throw new Error(result.error.message || 'User could not be created');
  return toUserRecord(result.data?.user || null);
}

export async function updateUser(userId, payload = {}) {
  const updatePayload = {};
  if (payload.email !== undefined) updatePayload.email = normalizeEmailValue(payload.email);
  if (payload.emailVerified !== undefined)
    updatePayload.email_confirm = Boolean(payload.emailVerified);
  if (payload.password !== undefined) updatePayload.password = String(payload.password || '');
  if (payload.appMetadata !== undefined) updatePayload.app_metadata = payload.appMetadata || {};
  if (payload.userMetadata !== undefined) updatePayload.user_metadata = payload.userMetadata || {};

  const result = await createAdminClient().auth.admin.updateUserById(
    assertUserId(userId),
    updatePayload,
  );
  if (result.error) throw new Error(result.error.message || 'User could not be updated');
  return toUserRecord(result.data?.user || null);
}

export async function deleteUser(userId) {
  const result = await createAdminClient().auth.admin.deleteUser(assertUserId(userId));
  if (result.error) {
    const msg = normalizeValue(result.error.message).toLowerCase();
    if (msg.includes('not found') || msg.includes('does not exist')) {
      return true;
    }
    throw new Error(result.error.message || 'User could not be deleted');
  }
  return true;
}

export async function revokeRefreshTokens(userId, options = {}) {
  await invokeSessionControl({
    currentSessionJti: options.currentSessionJti,
    reason: options.reason || 'credential-change',
    userId,
  });
  return true;
}

export function createAdminAuthFacade(options = {}) {
  return {
    createUser,
    deleteUser,
    getUser: getUserById,
    getUserByEmail,
    revokeRefreshTokens(userId, overrides = {}) {
      return revokeRefreshTokens(userId, {
        currentSessionJti: overrides.currentSessionJti || options.currentSessionJti,
        reason: overrides.reason || options.reason,
      });
    },
    updateUser,
  };
}


// ============================================================================
// FILE: domains/auth/server/session/cookies.server.js
// ============================================================================

import 'server-only';
import { randomBytes } from 'crypto';
import { normalizeValue } from '@/shared/utils';
import { createSupabaseResponseClient } from '@/infrastructure/supabase/response-client.server';
import {
  listSupabaseAuthStorageKeys,
  listSupabaseRequestStorageKeys,
} from '@/infrastructure/supabase/auth-storage';
import {
  AUTH_COOKIE_PATH,
  CSRF_COOKIE_NAME,
  LEGACY_CSRF_COOKIE_NAME,
  STEP_UP_COOKIE_NAME,
  STEP_UP_MAX_AGE_MS,
  STEP_UP_MAX_AGE_SECONDS,
} from '@/domains/auth/utils';

const DEVICE_ID_COOKIE_NAME = 'tvz_device_id';
const DEVICE_ID_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export {
  AUTH_COOKIE_PATH,
  CSRF_COOKIE_NAME,
  STEP_UP_COOKIE_NAME,
  STEP_UP_MAX_AGE_MS,
  STEP_UP_MAX_AGE_SECONDS,
};

export function isSecureCookieEnvironment() {
  return process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false';
}

export function getCookieValue(request, cookieName) {
  const cookieHeader = normalizeValue(request?.headers?.get?.('cookie'));
  if (!cookieHeader) return '';

  const prefix = `${cookieName}=`;
  const cookie = cookieHeader
    .split(';')
    .map(normalizeValue)
    .find((entry) => entry.startsWith(prefix));

  if (!cookie) return '';

  try {
    return decodeURIComponent(cookie.slice(prefix.length));
  } catch {
    return '';
  }
}

export function createCsrfToken() {
  return randomBytes(32).toString('base64url');
}

function setCookie(response, name, value, options) {
  response.cookies.set(name, value, {
    path: AUTH_COOKIE_PATH,
    sameSite: 'lax',
    secure: isSecureCookieEnvironment(),
    ...options,
  });
}

export function setCsrfCookie(response, token) {
  const normalizedToken = normalizeValue(token);
  if (!normalizedToken) return;
  setCookie(response, CSRF_COOKIE_NAME, normalizedToken, { httpOnly: false, maxAge: 86400 });
}

export function clearCsrfCookie(response) {
  setCookie(response, CSRF_COOKIE_NAME, '', { httpOnly: false, maxAge: 0 });
}

function getRequestStorageCookieNames(request) {
  if (typeof request?.cookies?.getAll === 'function') {
    return listSupabaseRequestStorageKeys(request.cookies.getAll());
  }

  return listSupabaseRequestStorageKeys(
    normalizeValue(request?.headers?.get?.('cookie'))
      .split(';')
      .flatMap((entry) => {
        const separatorIndex = entry.indexOf('=');
        return separatorIndex > 0 ? [{ name: entry.slice(0, separatorIndex) }] : [];
      }),
  );
}

export function clearAuthCookies(response, request = null) {
  clearCsrfCookie(response);
  const names = new Set([
    LEGACY_CSRF_COOKIE_NAME,
    'sb-access-token',
    'sb-refresh-token',
    ...getRequestStorageCookieNames(request),
    ...listSupabaseAuthStorageKeys().flatMap((name) => [
      name,
      ...Array.from({ length: 64 }, (_, index) => `${name}.${index}`),
    ]),
  ]);

  names.forEach((name) => setCookie(response, name, '', { httpOnly: true, maxAge: 0 }));
}

export function setDeviceIdCookie(response, deviceId) {
  const normalizedDeviceId = normalizeValue(deviceId);
  if (!normalizedDeviceId) return;
  setCookie(response, DEVICE_ID_COOKIE_NAME, normalizedDeviceId, {
    httpOnly: true,
    maxAge: DEVICE_ID_MAX_AGE_SECONDS,
  });
}

export function buildNormalizedSession(session, user) {
  if (!session?.access_token) return null;
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token || null,
    expiresAt: session.expires_at || null,
    user: user || session.user || null,
  };
}

export async function applySupabaseSessionToResponse(
  request,
  response,
  { accessToken, refreshToken },
) {
  const normalizedAccessToken = normalizeValue(accessToken);
  const normalizedRefreshToken = normalizeValue(refreshToken);
  if (!normalizedAccessToken || !normalizedRefreshToken) {
    throw new Error('A complete authentication session is required');
  }

  const result = await createSupabaseResponseClient(request, response).auth.setSession({
    access_token: normalizedAccessToken,
    refresh_token: normalizedRefreshToken,
  });

  if (result.error || !result.data?.session?.access_token) {
    throw new Error(result.error?.message || 'Authentication session could not be established');
  }

  return buildNormalizedSession(result.data.session, result.data.user || null);
}


// ============================================================================
// FILE: domains/auth/server/tokens.server.js
// ============================================================================

import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';
import { normalizeValue } from '@/shared/utils';

export function createSignedToken(payload, { secret }) {
  const normalizedSecret = normalizeValue(secret);
  if (!normalizedSecret) throw new Error('Token signing secret is required');

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', normalizedSecret)
    .update(encodedPayload)
    .digest('base64url');
  return `${encodedPayload}.${signature}`;
}

export function verifySignedToken(token, { invalidMessage = 'Invalid token', secret }) {
  const [encodedPayload, signature, ...extraParts] = normalizeValue(token).split('.');
  const normalizedSecret = normalizeValue(secret);

  if (!encodedPayload || !signature || extraParts.length || !normalizedSecret) {
    throw new Error(invalidMessage);
  }

  const expectedSignature = createHmac('sha256', normalizedSecret)
    .update(encodedPayload)
    .digest('base64url');
  const expectedBuffer = Buffer.from(expectedSignature);
  const receivedBuffer = Buffer.from(signature);

  if (
    expectedBuffer.length !== receivedBuffer.length ||
    !timingSafeEqual(expectedBuffer, receivedBuffer)
  ) {
    throw new Error(invalidMessage);
  }

  try {
    return JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  } catch {
    throw new Error(invalidMessage);
  }
}


// ============================================================================
// FILE: domains/auth/server/verification.server.js
// ============================================================================

import { createHash, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import { normalizeEmailValue, normalizeValue } from '@/shared/utils';
import { createAdminClient } from '@/infrastructure/supabase/admin';
import { validateUsername } from '@/domains/account/utils';
import {
  AUTH_CHALLENGE_SELECT,
  AUTH_CHALLENGE_TABLE,
  GENERIC_VERIFY_ERROR,
  MAX_VERIFY_ATTEMPTS,
  OTP_CODE_LENGTH,
  OTP_TTL_MS,
  PENDING_SIGN_IN_COOKIE_NAME,
  PENDING_SIGN_IN_MAX_AGE_MS,
  PENDING_SIGN_IN_MAX_AGE_SECONDS,
  PURPOSES,
  RESEND_COOLDOWN_MS,
  resolveAuthCapabilities,
  getOAuthProviderLabel,
  resolveProviderIds,
  SECURE_PURPOSES,
  TOKEN_VERSION,
  TRUSTED_DEVICE_COOKIE_PREFIX,
  TRUSTED_DEVICE_MAX_AGE_MS,
  TRUSTED_DEVICE_MAX_AGE_SECONDS,
} from '@/domains/auth/utils';
import { AUTH_COOKIE_PATH, getCookieValue, isSecureCookieEnvironment } from './session.server';
import { createAdminAuthFacade } from './session/admin.server';
import {
  createChallengeProofToken,
  createSignedToken,
  resolveSecretWithFallback,
  verifyChallengeProofToken,
  verifySignedToken,
} from './proof-tokens.server';

export { PURPOSES };

export const PASSWORD_ACCOUNT_LOOKUP_CODES = Object.freeze({
  PASSWORD_RESET_UNAVAILABLE: 'password-reset-unavailable',
  PASSWORD_SIGN_IN_DISABLED: 'password-sign-in-disabled',
  USER_NOT_FOUND: 'user-not-found',
});

function hashValue(value) {
  const normalized = normalizeValue(value);
  return normalized ? createHash('sha256').update(normalized).digest('hex') : null;
}

function hashVerificationCode(email, code, salt) {
  const normalizedEmail = normalizeEmailValue(email);
  const normalizedCode = normalizeValue(code);
  const normalizedSalt = normalizeValue(salt);
  return createHash('sha256')
    .update(`${normalizedEmail}:${normalizedCode}:${normalizedSalt}`)
    .digest('hex');
}

function getTimestampMs(value) {
  if (!value) return 0;
  return new Date(value).getTime() || 0;
}

function createVerificationChallengeKey(email, purpose) {
  return createHash('sha256')
    .update(`${normalizeEmailValue(email)}:${normalizeValue(purpose).toLowerCase()}`)
    .digest('hex');
}

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

function resolveBrevoConfig() {
  const apiKey = normalizeValue(process.env.BREVO_API_KEY);
  const from =
    normalizeValue(process.env.BREVO_SENDER_EMAIL) || normalizeValue(process.env.BREVO_SMTP_FROM);

  if (!apiKey || !from) {
    throw new Error(
      'Brevo email configuration is incomplete. Set BREVO_API_KEY and BREVO_SENDER_EMAIL',
    );
  }

  return { apiKey, from };
}

export async function sendVerificationEmail({ code, email, expiresAt, purpose }) {
  const { apiKey, from } = resolveBrevoConfig();
  const normalizedEmail = normalizeEmailValue(email);

  const subject = `Tvizzie - Your verification code is ${code}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb;">
      <h2 style="font-size: 20px; font-weight: 600; color: #111827; margin-bottom: 16px;">Tvizzie Verification Code</h2>
      <p style="font-size: 14px; color: #4b5563; margin-bottom: 24px;">Use the following 6-digit code to complete your ${purpose} request:</p>
      <div style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #4f46e5; background-color: #f3f4f6; padding: 16px; text-align: center; margin-bottom: 24px;">
        ${code}
      </div>
      <p style="font-size: 12px; color: #9ca3af;">This code expires in 10 minutes. If you did not request this, please ignore this email.</p>
    </div>
  `;

  const response = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { email: from, name: 'Tvizzie' },
      to: [{ email: normalizedEmail }],
      subject,
      textContent: `Your Tvizzie verification code is: ${code}`,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    const responseBody = await response.text().catch(() => '');
    let providerMessage = '';

    try {
      providerMessage = normalizeValue(JSON.parse(responseBody)?.message);
    } catch {}

    throw new Error(
      `Email sending failed with status ${response.status}${providerMessage ? `: ${providerMessage}` : ''}`,
    );
  }
}

export async function getChallengeByKey(key) {
  const normalizedKey = normalizeValue(key);
  if (!normalizedKey) return null;

  const admin = createAdminClient();
  const result = await admin
    .from(AUTH_CHALLENGE_TABLE)
    .select(AUTH_CHALLENGE_SELECT)
    .eq('jti', normalizedKey)
    .maybeSingle();

  if (result.error) throw new Error(result.error.message || 'Challenge query failed');
  return result.data || null;
}

export async function upsertChallengeByKey(key, record) {
  const admin = createAdminClient();
  const result = await admin
    .from(AUTH_CHALLENGE_TABLE)
    .upsert({ ...record, challenge_key: key, jti: key }, { onConflict: 'challenge_key' });

  if (result.error) throw new Error(result.error.message || 'Challenge save failed');
}

export async function updateChallengeByKey(key, patch) {
  const admin = createAdminClient();
  const result = await admin.from(AUTH_CHALLENGE_TABLE).update(patch).eq('jti', key);

  if (result.error) throw new Error(result.error.message || 'Challenge update failed');
}

export async function requestVerificationCode({
  deviceId,
  email,
  forceNew = false,
  initial = false,
  ipAddress,
  purpose,
  userId,
}) {
  const normalizedEmail = normalizeEmailValue(email);
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('A valid email address is required');
  }

  const normalizedPurpose = normalizeValue(purpose).toLowerCase();
  if (!Object.values(PURPOSES).includes(normalizedPurpose)) {
    throw new Error('Unsupported verification purpose');
  }
  if (SECURE_PURPOSES.has(normalizedPurpose) && !userId) {
    throw new Error('Authenticated user is required for this verification flow');
  }

  const now = Date.now();
  const challengeKey = createVerificationChallengeKey(normalizedEmail, normalizedPurpose);
  const existingData = await getChallengeByKey(challengeKey);

  const existingResendAtMs = getTimestampMs(existingData?.resend_available_at);
  const existingExpiresAtMs = getTimestampMs(existingData?.expires_at);

  if (existingData?.status === 'pending' && existingExpiresAtMs > now && !forceNew) {
    return {
      challengeKey,
      expiresAt: existingData.expires_at,
      resendAvailableAt: existingData.resend_available_at,
    };
  }

  if (forceNew && existingData?.status === 'pending' && existingResendAtMs > now) {
    if (initial) {
      return {
        challengeKey,
        expiresAt: existingData.expires_at,
        resendAvailableAt: existingData.resend_available_at,
      };
    }

    const waitSeconds = Math.max(1, Math.ceil((existingResendAtMs - now) / 1000));
    const error = new Error(
      `Please wait ${waitSeconds} second${waitSeconds === 1 ? '' : 's'} before requesting a new code`,
    );
    error.code = 'VERIFICATION_RESEND_COOLDOWN';
    error.data = {
      challengeKey,
      expiresAt: existingData.expires_at,
      resendAvailableAt: existingData.resend_available_at,
    };
    throw error;
  }

  const code = String(randomInt(100000, 1000000));
  const salt = randomBytes(16).toString('hex');
  const expiresAtMs = now + OTP_TTL_MS;
  const resendAtMs = now + RESEND_COOLDOWN_MS;

  const challengeRecord = {
    attempt_count: 0,
    code_hash: hashVerificationCode(normalizedEmail, code, salt),
    created_at: new Date(now).toISOString(),
    device_hash: deviceId ? hashValue(deviceId) : null,
    dummy: false,
    email_hash: hashValue(normalizedEmail),
    expires_at: new Date(expiresAtMs).toISOString(),
    ip_hash: ipAddress ? hashValue(ipAddress) : null,
    jti: challengeKey,
    max_attempts: MAX_VERIFY_ATTEMPTS,
    purpose: normalizedPurpose,
    resend_available_at: new Date(resendAtMs).toISOString(),
    salt,
    status: 'pending',
    updated_at: new Date(now).toISOString(),
    used_at: null,
    user_id: userId ? normalizeValue(userId) : null,
  };

  await upsertChallengeByKey(challengeKey, challengeRecord);

  try {
    await sendVerificationEmail({
      code,
      email: normalizedEmail,
      expiresAt: expiresAtMs,
      purpose: normalizedPurpose,
    });
  } catch (error) {
    await updateChallengeByKey(challengeKey, {
      status: 'expired',
      updated_at: new Date().toISOString(),
    }).catch(() => null);
    throw error;
  }

  return {
    challengeKey,
    expiresAt: new Date(expiresAtMs).toISOString(),
    resendAvailableAt: new Date(resendAtMs).toISOString(),
  };
}

export async function verifyCodeRequest({ code, email, purpose, userId }) {
  const normalizedEmail = normalizeEmailValue(email);
  const normalizedCode = normalizeValue(code);
  const normalizedPurpose = normalizeValue(purpose).toLowerCase();

  if (!normalizedEmail || !normalizedCode || !normalizedPurpose) {
    throw new Error('Code, email, and purpose are required');
  }
  if (!Object.values(PURPOSES).includes(normalizedPurpose)) {
    throw new Error('Verification code is invalid');
  }

  const challengeKey = createVerificationChallengeKey(normalizedEmail, normalizedPurpose);
  const challenge = await getChallengeByKey(challengeKey);

  if (!challenge || challenge.status !== 'pending' || challenge.used_at) {
    throw new Error('Verification code is invalid');
  }
  if (challenge.user_id && normalizeValue(userId) !== normalizeValue(challenge.user_id)) {
    throw new Error('Verification code is invalid');
  }

  const now = Date.now();
  if (getTimestampMs(challenge.expires_at) <= now) {
    await updateChallengeByKey(challengeKey, {
      status: 'expired',
      updated_at: new Date(now).toISOString(),
    });
    throw new Error('Verification code has expired');
  }

  if (challenge.attempt_count >= challenge.max_attempts) {
    throw new Error('Verification code attempts are exhausted');
  }

  const computedHash = hashVerificationCode(normalizedEmail, normalizedCode, challenge.salt);
  const expectedHash = Buffer.from(String(challenge.code_hash || ''), 'utf8');
  const receivedHash = Buffer.from(computedHash, 'utf8');
  if (expectedHash.length !== receivedHash.length || !timingSafeEqual(expectedHash, receivedHash)) {
    const newAttemptCount = challenge.attempt_count + 1;
    const isExhausted = newAttemptCount >= challenge.max_attempts;
    await updateChallengeByKey(challengeKey, {
      attempt_count: newAttemptCount,
      status: isExhausted ? 'exhausted' : 'pending',
      updated_at: new Date(now).toISOString(),
    });
    throw new Error('Verification code is invalid');
  }

  let resolvedUserId = challenge.user_id || null;
  if (!resolvedUserId) {
    try {
      const userRecord = await createAdminAuthFacade().getUserByEmail(normalizedEmail);
      resolvedUserId = userRecord?.uid || null;
    } catch {}
  }

  await updateChallengeByKey(challengeKey, {
    status: 'used',
    updated_at: new Date(now).toISOString(),
    used_at: new Date(now).toISOString(),
  });

  return {
    challengeJti: challenge.jti,
    challengeKey,
    email: normalizedEmail,
    userId: resolvedUserId,
    verifiedAt: new Date(now).toISOString(),
  };
}

export async function claimVerificationProof({ challengeJti, challengeKey, email, purpose }) {
  const normalizedEmail = normalizeEmailValue(email);
  const normalizedPurpose = normalizeValue(purpose).toLowerCase();
  const normalizedJti = normalizeValue(challengeJti);
  const normalizedKey = normalizeValue(challengeKey);
  const expectedKey = createVerificationChallengeKey(normalizedEmail, normalizedPurpose);

  if (
    !normalizedEmail ||
    !Object.values(PURPOSES).includes(normalizedPurpose) ||
    normalizedJti !== expectedKey ||
    normalizedKey !== expectedKey
  ) {
    throw new Error('Verification proof is invalid');
  }

  const admin = createAdminClient();
  const result = await admin
    .from(AUTH_CHALLENGE_TABLE)
    .update({ status: 'processing', updated_at: new Date().toISOString() })
    .eq('jti', expectedKey)
    .eq('purpose', normalizedPurpose)
    .eq('status', 'used')
    .select('jti')
    .maybeSingle();

  if (result.error)
    throw new Error(result.error.message || 'Verification proof could not be claimed');
  if (!result.data?.jti) throw new Error('Verification proof has already been used');

  return expectedKey;
}

export async function completeVerificationProof(challengeKey) {
  const normalizedKey = normalizeValue(challengeKey);
  if (!normalizedKey) return;

  const result = await createAdminClient()
    .from(AUTH_CHALLENGE_TABLE)
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('jti', normalizedKey)
    .eq('status', 'processing');

  if (result.error)
    throw new Error(result.error.message || 'Verification proof could not be completed');
}

export async function releaseVerificationProof(challengeKey) {
  const normalizedKey = normalizeValue(challengeKey);
  if (!normalizedKey) return;

  const result = await createAdminClient()
    .from(AUTH_CHALLENGE_TABLE)
    .update({ status: 'used', updated_at: new Date().toISOString() })
    .eq('jti', normalizedKey)
    .eq('status', 'processing');

  if (result.error)
    throw new Error(result.error.message || 'Verification proof could not be released');
}

function getLoginVerificationSecret() {
  return resolveSecretWithFallback({
    primaryEnvName: 'LOGIN_VERIFICATION_SECRET',
    fallbackEnvNames: ['STEP_UP_SECRET', 'EMAIL_VERIFICATION_SECRET'],
    missingMessage: 'LOGIN_VERIFICATION_SECRET is missing and no fallback secret is available',
    warningGlobalKey: '__tvizzie_login_verification_secret_fallback_warned__',
    warningMessage:
      '[Auth] LOGIN_VERIFICATION_SECRET is missing. Falling back to STEP_UP_SECRET or EMAIL_VERIFICATION_SECRET.',
  });
}

export function getTrustedLoginDeviceCookieName(userId) {
  const normalizedUserId = normalizeValue(userId);
  if (!normalizedUserId) return '';
  const hash = createHash('sha256').update(normalizedUserId).digest('hex').slice(0, 16);
  return `${TRUSTED_DEVICE_COOKIE_PREFIX}${hash}`;
}

export function createTrustedDeviceToken({
  userId,
  deviceId,
  expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000,
}) {
  return createSignedToken(
    {
      userId: normalizeValue(userId),
      deviceHash: hashValue(deviceId),
      exp: Math.floor(Number(expiresAt) / 1000),
    },
    { secret: getLoginVerificationSecret() },
  );
}

export function verifyTrustedDeviceToken(token, { userId, deviceId }) {
  try {
    const payload = verifySignedToken(token, {
      secret: getLoginVerificationSecret(),
      invalidMessage: 'Trusted device token is invalid',
    });

    const expiresAtMs = Number(payload?.exp) * 1000;
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
      return false;
    }

    if (normalizeValue(payload?.userId) !== normalizeValue(userId)) {
      return false;
    }

    if (normalizeValue(payload?.deviceHash) !== hashValue(deviceId)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function setTrustedDeviceCookie(response, { userId, deviceId }) {
  const cookieName = getTrustedLoginDeviceCookieName(userId);
  if (!cookieName) return;

  const token = createTrustedDeviceToken({ userId, deviceId });

  response.cookies.set(cookieName, token, {
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: AUTH_COOKIE_PATH,
    sameSite: 'lax',
    secure: isSecureCookieEnvironment(),
  });
}

export function setTrustedDeviceCookieToCookieStore(cookieStore, { userId, deviceId }) {
  const cookieName = getTrustedLoginDeviceCookieName(userId);
  if (!cookieName) return;

  const token = createTrustedDeviceToken({ userId, deviceId });

  cookieStore.set(cookieName, token, {
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: AUTH_COOKIE_PATH,
    sameSite: 'lax',
    secure: isSecureCookieEnvironment(),
  });
}

export function isDeviceTrusted(request, { userId, deviceId }) {
  const cookieName = getTrustedLoginDeviceCookieName(userId);
  if (!cookieName) return false;

  const cookieVal = request.cookies.get(cookieName)?.value;
  if (!cookieVal) return false;

  return verifyTrustedDeviceToken(cookieVal, { userId, deviceId });
}

export function createPendingSignInToken({
  accessToken,
  deviceHash,
  email,
  provider,
  refreshToken,
  user,
  userId,
  expiresAt = Date.now() + PENDING_SIGN_IN_MAX_AGE_MS,
}) {
  const normalizedUserId = normalizeValue(userId);
  const normalizedAccessToken = normalizeValue(accessToken);
  const normalizedEmail = normalizeEmailValue(email);
  const normalizedDeviceHash = normalizeValue(deviceHash);
  const normalizedRefreshToken = normalizeValue(refreshToken);

  if (
    !normalizedUserId ||
    !normalizedEmail ||
    !normalizedDeviceHash ||
    !normalizedAccessToken ||
    !normalizedRefreshToken
  ) {
    throw new Error('Pending sign-in payload is invalid');
  }

  return createSignedToken(
    {
      accessToken: normalizedAccessToken,
      deviceHash: normalizedDeviceHash,
      email: normalizedEmail,
      exp: Math.floor(Number(expiresAt) / 1000),
      provider: normalizeValue(provider) || 'password',
      refreshToken: normalizedRefreshToken,
      user: user || null,
      userId: normalizedUserId,
    },
    { secret: getLoginVerificationSecret() },
  );
}

export function verifyPendingSignInToken(token) {
  const payload = verifySignedToken(token, {
    secret: getLoginVerificationSecret(),
    invalidMessage: 'Pending sign-in session is invalid',
  });

  const expiresAtMs = Number(payload?.exp) * 1000;
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    throw new Error('Pending sign-in session has expired');
  }

  return {
    accessToken: payload.accessToken,
    deviceHash: payload.deviceHash,
    email: payload.email,
    expiresAt: new Date(expiresAtMs).toISOString(),
    provider: payload.provider || 'password',
    refreshToken: payload.refreshToken,
    user: payload.user || null,
    userId: payload.userId,
  };
}

export function setPendingSignInCookie(response, token) {
  response.cookies.set(PENDING_SIGN_IN_COOKIE_NAME, token, {
    httpOnly: true,
    maxAge: PENDING_SIGN_IN_MAX_AGE_SECONDS,
    path: AUTH_COOKIE_PATH,
    sameSite: 'lax',
    secure: isSecureCookieEnvironment(),
  });
}

export function clearPendingSignInCookie(response) {
  response.cookies.set(PENDING_SIGN_IN_COOKIE_NAME, '', {
    httpOnly: true,
    maxAge: 0,
    path: AUTH_COOKIE_PATH,
    sameSite: 'lax',
    secure: isSecureCookieEnvironment(),
  });
}

export async function resolvePasswordAccountIdentifier(identifier) {
  const normalizedIdentifier = normalizeValue(identifier);
  if (!normalizedIdentifier) throw new Error('Username or email is required');

  if (normalizedIdentifier.includes('@')) {
    return { email: normalizeEmailValue(normalizedIdentifier), userId: null, username: null };
  }

  const username = validateUsername(normalizedIdentifier);
  const profileResult = await createAdminClient()
    .from('profiles')
    .select('id, email, username')
    .eq('username_lower', username)
    .maybeSingle();

  if (profileResult.error || !profileResult.data?.email) {
    const err = new Error('No account was found with this username');
    err.code = PASSWORD_ACCOUNT_LOOKUP_CODES.USER_NOT_FOUND;
    throw err;
  }

  return {
    email: normalizeEmailValue(profileResult.data.email),
    userId: normalizeValue(profileResult.data.id) || null,
    username: normalizeValue(profileResult.data.username) || username,
  };
}

export async function lookupAccountByEmail(email) {
  const normalizedEmail = normalizeEmailValue(email);
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('Enter a valid email address');
  }

  let userRecord = null;
  try {
    userRecord = await createAdminAuthFacade().getUserByEmail(normalizedEmail);
  } catch (error) {
    const code = normalizeValue(error?.code);
    const message = normalizeValue(error?.message).toLowerCase();
    if (
      code === PASSWORD_ACCOUNT_LOOKUP_CODES.USER_NOT_FOUND ||
      message.includes('user not found')
    ) {
      return {
        code: PASSWORD_ACCOUNT_LOOKUP_CODES.USER_NOT_FOUND,
        email: normalizedEmail,
        exists: false,
        providerIds: [],
        supportsPasswordAuth: false,
        userId: null,
      };
    }
    throw error;
  }

  const userId = normalizeValue(userRecord?.uid);
  const matchedOAuthProvider = (userRecord?.providerData || []).find((provider) => {
    const providerId = normalizeValue(provider?.providerId).toLowerCase();
    return (
      providerId !== 'email' &&
      providerId !== 'password' &&
      normalizeEmailValue(provider?.email) === normalizedEmail
    );
  })?.providerId;
  const providerIds = resolveProviderIds({
    providerData: userRecord?.providerData || [],
    appMetadata: userRecord?.app_metadata || {},
  });
  const authCapabilities = resolveAuthCapabilities({ providerIds, email: normalizedEmail });

  return {
    capabilities: authCapabilities,
    code: null,
    email: normalizedEmail,
    exists: Boolean(userId),
    matchedOAuthProvider: normalizeValue(matchedOAuthProvider) || null,
    providerIds,
    signInMethods: providerIds,
    supportsPasswordAuth: authCapabilities.passwordEnabled,
    userId: userId || null,
  };
}

export function createSignUpEmailAlreadyRegisteredError(account) {
  const email = normalizeEmailValue(account?.email);
  const matchedOAuthProvider = normalizeValue(account?.matchedOAuthProvider);
  const oauthProvider = matchedOAuthProvider
    ? resolvePrimaryProvider([matchedOAuthProvider])
    : !account?.supportsPasswordAuth
      ? resolvePrimaryProvider(account?.providerIds)
      : null;
  const oauthProviderLabel = oauthProvider ? getOAuthProviderLabel(oauthProvider) : null;
  const error = new Error(
    oauthProviderLabel
      ? `This email is used to sign in with ${oauthProviderLabel} on another account. Continue with ${oauthProviderLabel}, or disconnect it from that account’s security settings before using this email here.`
      : 'This email is already registered',
  );

  error.code = oauthProvider
    ? 'OAUTH_ACCOUNT_ALREADY_REGISTERED'
    : 'AUTH_ACCOUNT_ALREADY_REGISTERED';
  error.data = {
    email,
    needsPasswordSetup: Boolean(oauthProvider),
    provider: oauthProvider,
  };
  return error;
}

export async function assertSignUpEmailAvailable(email) {
  const account = await lookupAccountByEmail(email);
  if (account.exists) {
    throw createSignUpEmailAlreadyRegisteredError(account);
  }
  return account;
}

export async function lookupPasswordAccountByEmail(email, { requireProfile = false } = {}) {
  const lookup = await lookupAccountByEmail(email);

  if (!lookup.userId) {
    return {
      code: lookup.code || PASSWORD_ACCOUNT_LOOKUP_CODES.USER_NOT_FOUND,
      email: lookup.email,
      eligible: false,
      exists: false,
      profileEligible: false,
      providerIds: [],
      signInMethods: [],
      supportsPasswordAuth: false,
      userId: null,
    };
  }

  if (!lookup.supportsPasswordAuth) {
    return {
      code: PASSWORD_ACCOUNT_LOOKUP_CODES.PASSWORD_SIGN_IN_DISABLED,
      email: lookup.email,
      eligible: false,
      exists: true,
      profileEligible: false,
      providerIds: lookup.providerIds || [],
      signInMethods: lookup.signInMethods,
      supportsPasswordAuth: false,
      userId: lookup.userId,
    };
  }

  return {
    capabilities: lookup.capabilities,
    code: null,
    email: lookup.email,
    eligible: true,
    exists: true,
    profileEligible: true,
    providerIds: lookup.providerIds,
    signInMethods: lookup.signInMethods,
    supportsPasswordAuth: true,
    userId: lookup.userId,
  };
}


// ============================================================================
// FILE: domains/auth/ui/components/form-primitives.js
// ============================================================================

import Icon from '@/ui/primitives/icon';

export const AUTH_INPUT_CLASSNAMES = Object.freeze({
  wrapper:
    'flex h-12 w-full items-center border border-white/5 px-4 transition-all duration-300 ease-in-out hover:bg-white/5 focus-within:bg-white/5',
  input: 'w-full text-white placeholder:text-white/50 outline-none',
});

export const AUTH_PASSWORD_INPUT_CLASSNAMES = Object.freeze({
  ...AUTH_INPUT_CLASSNAMES,
  rightIcon: 'flex h-full items-center justify-center',
});

export const AUTH_PRIMARY_BUTTON_CLASSNAMES = Object.freeze({
  default:
    'center h-12 w-full border border-transparent bg-white/80 cursor-pointer px-4 font-semibold text-black transition-all duration-300 ease-in-out hover:bg-white focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
});

export const AUTH_SECONDARY_BUTTON_CLASSNAMES = Object.freeze({
  default:
    'center h-12 w-full border border-white/5 bg-white/5 px-4 text-white transition-all duration-300 ease-in-out hover:bg-white/10 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
});

export function AuthField({ children, className = '' }) {
  return <div className={className}>{children}</div>;
}

export function PasswordToggleButton({
  visible,
  onClick,
  showLabel = 'Show password',
  hideLabel = 'Hide password',
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={visible ? hideLabel : showLabel}
      className="flex h-full items-center justify-center p-1 text-white/50 transition-all duration-300 ease-in-out hover:text-white"
    >
      <Icon icon={visible ? 'solar:eye-closed-linear' : 'solar:eye-linear'} size={20} />
    </button>
  );
}


// ============================================================================
// FILE: domains/auth/ui/components/oauth-provider-button.js
// ============================================================================

'use client';

import { getOAuthProviderIcon } from '@/domains/auth/utils/oauth';
import { Button } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';

export const PROVIDER_BUTTON_CLASSNAMES = Object.freeze({
  default:
    'inline-flex h-13 w-full items-center justify-center gap-3  border border-white/10 px-4 text-white transition-all duration-300 ease-in-out hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/10 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
});

export default function OAuthProviderButton({
  disabled = false,
  isBusy = false,
  mode = 'sign-in',
  onClick,
  provider,
}) {
  const providerIcon = getOAuthProviderIcon(provider);
  const providerLabel = provider === 'google' ? 'Google' : 'provider';
  const actionLabel = mode === 'sign-up' ? 'Sign up with' : 'Continue with';
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled || isBusy}
      aria-label={`${actionLabel} ${providerLabel}`}
      classNames={PROVIDER_BUTTON_CLASSNAMES}
    >
      {providerIcon ? <Icon icon={providerIcon} size={20} /> : null}
    </Button>
  );
}


// ============================================================================
// FILE: domains/auth/ui/components/oauth-provider-list.js
// ============================================================================

'use client';

import { OAUTH_PROVIDER_KEYS } from '@/core/modules/auth/provider-utils';
import OAuthProviderButton from './oauth-provider-button';

export default function OAuthProviderList({
  activeProvider = null,
  disabled = false,
  mode,
  onSelect,
}) {
  return (
    <div className="flex items-center gap-3">
      {OAUTH_PROVIDER_KEYS.map((provider, index) => (
        <div key={provider} className="flex-1">
          <OAuthProviderButton
            provider={provider}
            mode={mode}
            isBusy={activeProvider === provider}
            disabled={disabled || Boolean(activeProvider)}
            onClick={() => onSelect(provider)}
          />
        </div>
      ))}
    </div>
  );
}


// ============================================================================
// FILE: domains/auth/ui/index.js
// ============================================================================

export { default as AuthVerificationSurface } from './surfaces/verification-surface';
export { default as ForgotPasswordAction } from '../actions/forgot-password-action';
export * from './components/form-primitives';
export { default as OAuthProviderButton } from './components/oauth-provider-button';
export { default as OAuthProviderList } from './components/oauth-provider-list';
export { default as AuthPageShell } from './layouts/page-shell';
export * from './layouts/page-shell';


// ============================================================================
// FILE: domains/auth/ui/layouts/page-shell.js
// ============================================================================

'use client';
import { createRouteRegistry } from '@/modules/registry/route-registry';

export const AuthRouteRegistry = createRouteRegistry({
  displayName: 'AuthRouteRegistry',
  resolveConfig: ({ authIsReady, description, icon, title, action = null }) => ({
    nav: {
      title,
      description,
      icon,
      action,
    },
    loading: { isLoading: !authIsReady },
  }),
});

export const AUTH_PAGE_FORM_CLASS = 'mx-auto flex w-full flex-col gap-3 px-6 sm:px-10';

export default function AuthPageShell({ children }) {
  return (
    <main className="relative flex min-h-dvh w-full items-center justify-center overflow-x-hidden px-4 pt-6 pb-28">
      <div className="pointer-events-none absolute inset-0 flex justify-center px-4">
        <div className="relative h-full w-full max-w-xl">
          <div className="absolute top-0 bottom-0 left-0 w-px bg-white/10" />
          <div className="absolute top-0 right-0 bottom-0 w-px bg-white/10" />
        </div>
      </div>
      <section className="relative box-border w-full max-w-xl">{children}</section>
    </main>
  );
}


// ============================================================================
// FILE: domains/auth/ui/surfaces/verification-surface.js
// ============================================================================

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { requestVerificationCode, verifyCodeRequest } from '@/domains/auth/client/requests';
import {
  PURPOSES,
  formatVerificationExpiry,
  normalizeEmail,
  resolveVerificationErrorMessage,
  resolveVerificationTimestamp,
} from '@/domains/auth/utils';
import { resolveAuthVerificationHeader } from '@/modules/modal/header';
import { useSurfaceHeader } from '@/modules/nav';
import { useToast } from '@/modules/notification';
import { cn } from '@/shared/utils';
import { Button } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';
import { Spinner } from '@/ui/feedback/spinner';

function dismissSurface(close) {
  if (typeof close === 'function') {
    close({
      success: false,
      cancelled: true,
    });
  }
}

function closeVerification(close, result) {
  if (typeof close === 'function') {
    close(result);
  }
}

function normalizeOtpValue(value) {
  return String(value || '')
    .replace(/[^0-9]/g, '')
    .slice(0, 6);
}

function OtpBoxes({
  code,
  disabled,
  hasError,
  inputRef,
  isFocused,
  onPasteComplete,
  setIsFocused,
  setCode,
}) {
  const activeIndex = code.length >= 6 ? 5 : code.length;

  return (
    <div className="relative" onClick={() => inputRef.current?.focus?.()}>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label="Verification code"
        disabled={disabled}
        value={code}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onChange={(event) => setCode(normalizeOtpValue(event.target.value))}
        onPaste={(event) => {
          event.preventDefault();
          const pastedCode = normalizeOtpValue(event.clipboardData?.getData('text'));

          setCode(pastedCode);

          if (pastedCode.length === 6) {
            onPasteComplete?.(pastedCode);
          }
        }}
        className="absolute inset-0 z-10 bg-transparent text-transparent [caret-color:transparent] outline-none"
      />

      <div className="grid grid-cols-6 gap-2 overflow-visible">
        {Array.from({ length: 6 }).map((_, index) => {
          const digit = code[index] || '';
          const isActive = isFocused && activeIndex === index;

          return (
            <div
              key={`otp-box-${index}`}
              className={cn(
                'center text-white/70-colors h-14 border border-white/5 text-lg font-semibold hover:text-white',
                hasError &&
                  digit &&
                  'border-error/30 bg-error/15 text-error hover:border-error/20 hover:bg-error/20 border',
                isActive &&
                  !digit &&
                  'border border-white/5 bg-white/5 text-white hover:border-white/10 hover:bg-white/10',
                digit &&
                  !hasError &&
                  'border-success/30 bg-success/15 text-success hover:border-success/20 hover:bg-success/20 border',
              )}
            >
              {digit ? (
                <span key={`digit-${digit}`}>{digit}</span>
              ) : (
                <span key="empty" className="invisible">
                  0
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AuthVerificationSurface({ close, data, header }) {
  const toast = useToast();
  const autoSentRef = useRef(false);
  const codeInputRef = useRef(null);
  const lastAutoSubmittedCodeRef = useRef('');
  const resetErrorTimeoutRef = useRef(null);
  const submitInFlightRef = useRef(false);
  const completedRef = useRef(false);
  const activeSubmissionKeyRef = useRef('');

  const purpose = String(data?.purpose || '')
    .trim()
    .toLowerCase();
  const email = normalizeEmail(data?.email);
  const identifier = String(data?.identifier || '').trim();
  const initialChallenge = data?.challenge || null;
  const initialChallengeToken = String(
    initialChallenge?.challengeToken || initialChallenge?.challengeKey || '',
  ).trim();
  const forceNewCodeOnOpen = purpose !== PURPOSES.SIGN_IN && data?.forceNewCodeOnOpen === true;
  const hasValidVerificationTarget =
    purpose === PURPOSES.ACCOUNT_DELETE ||
    purpose === PURPOSES.PASSWORD_CHANGE ||
    purpose === PURPOSES.PASSWORD_SET ||
    purpose === PURPOSES.PROVIDER_LINK ||
    (email && email.includes('@')) ||
    ((purpose === PURPOSES.SIGN_IN || purpose === PURPOSES.PASSWORD_RESET) && Boolean(identifier));

  const [isSending, setIsSending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [code, setCode] = useState('');
  const [challengeToken, setChallengeToken] = useState(initialChallengeToken);
  const [expiresAt, setExpiresAt] = useState(initialChallenge?.expiresAt || null);
  const [resendAvailableAt, setResendAvailableAt] = useState(
    initialChallenge?.resendAvailableAt || null,
  );
  const [now, setNow] = useState(Date.now());
  const [rememberDevice, setRememberDevice] = useState(Boolean(data?.rememberDevice));
  const [isCodeFocused, setIsCodeFocused] = useState(false);
  const [hasCodeError, setHasCodeError] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isStatusError, setIsStatusError] = useState(false);
  const [isCooldownError, setIsCooldownError] = useState(false);

  const resendRemainingMs = Math.max(0, resolveVerificationTimestamp(resendAvailableAt) - now);
  const codeRemainingMs = Math.max(0, resolveVerificationTimestamp(expiresAt) - now);
  const resendRemainingSeconds = Math.max(0, Math.ceil(resendRemainingMs / 1000));
  const canResendCode = resendRemainingMs <= 0;
  const codeExpiryLabel = formatVerificationExpiry(expiresAt);
  const isCodeExpired = Boolean(expiresAt) && codeRemainingMs <= 0;
  const shouldShowRememberDevice =
    purpose === PURPOSES.SIGN_IN && data?.allowRememberDevice !== false;

  const [meta, setMeta] = useState(() => ({
    codeExpiryLabel: null,
    isExpired: false,
    isSending: hasValidVerificationTarget && !initialChallengeToken,
    hasChallenge: Boolean(initialChallengeToken),
  }));

  const sendCode = useCallback(
    async ({ isInitial = false } = {}) => {
      if (isSending || isSubmitting) return;

      if (!hasValidVerificationTarget) {
        setStatusMessage('A valid username or email is required');
        setIsStatusError(true);
        return;
      }

      const currentResendMs = Math.max(
        0,
        resolveVerificationTimestamp(resendAvailableAt) - Date.now(),
      );
      if (!isInitial && currentResendMs > 0) {
        const remainingSec = Math.max(0, Math.ceil(currentResendMs / 1000));
        setStatusMessage(`Please wait ${remainingSec}s before resending`);
        setIsStatusError(true);
        setIsCooldownError(true);
        return;
      }

      setIsSending(true);
      setStatusMessage('');
      setIsStatusError(false);
      setIsCooldownError(false);

      try {
        const challenge = await requestVerificationCode({
          email,
          isInitial,
          identifier,
          forceNew: !isInitial || (isInitial && forceNewCodeOnOpen),
          purpose,
        });

        setCode('');
        setChallengeToken(
          String(challenge?.challengeToken || challenge?.challengeKey || '').trim(),
        );
        setExpiresAt(challenge?.expiresAt || null);
        setResendAvailableAt(challenge?.resendAvailableAt || null);
        setNow(Date.now());
        setHasCodeError(false);
        setIsCooldownError(false);
        lastAutoSubmittedCodeRef.current = '';
        completedRef.current = false;
        activeSubmissionKeyRef.current = '';
      } catch (error) {
        const cooldownAt = error?.data?.resendAvailableAt || null;
        if (cooldownAt) {
          setResendAvailableAt(cooldownAt);
          setNow(Date.now());
          setIsCooldownError(true);
        }
        const msg = resolveVerificationErrorMessage(error, 'Verification code could not be sent');
        setStatusMessage(msg);
        setIsStatusError(true);
      } finally {
        setIsSending(false);
      }
    },
    [
      email,
      forceNewCodeOnOpen,
      hasValidVerificationTarget,
      identifier,
      isSending,
      isSubmitting,
      purpose,
      resendAvailableAt,
    ],
  );

  useEffect(() => {
    return () => {
      if (resetErrorTimeoutRef.current) {
        window.clearTimeout(resetErrorTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!resendAvailableAt && !expiresAt) return undefined;

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [expiresAt, resendAvailableAt]);

  useEffect(() => {
    if (!isCooldownError || resendRemainingMs > 0) return;

    setIsCooldownError(false);
    setStatusMessage('');
    setIsStatusError(false);
  }, [isCooldownError, resendRemainingMs]);

  useEffect(() => {
    if (autoSentRef.current) return;
    if (initialChallengeToken) return;
    if (!hasValidVerificationTarget) {
      return;
    }

    autoSentRef.current = true;
    void sendCode({ isInitial: true });
  }, [hasValidVerificationTarget, initialChallengeToken, sendCode]);

  useEffect(() => {
    if (!challengeToken || isSending) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      codeInputRef.current?.focus?.();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [challengeToken, isSending]);

  useEffect(() => {
    const shouldShowSendingState = isSending || (hasValidVerificationTarget && !challengeToken);

    setMeta((prev) => ({
      ...prev,
      codeExpiryLabel,
      hasChallenge: Boolean(challengeToken),
      isExpired: isCodeExpired,
      isSending: shouldShowSendingState,
    }));
  }, [challengeToken, codeExpiryLabel, hasValidVerificationTarget, isCodeExpired, isSending]);

  const submitVerification = useCallback(
    async (codeValue = code) => {
      const normalizedCode = normalizeOtpValue(codeValue);
      const submissionKey = `${challengeToken}:${normalizedCode}`;

      if (completedRef.current || submitInFlightRef.current || isSubmitting || isSending) {
        return;
      }
      if (isCodeExpired) {
        toast.error('Verification code has expired. Request a new code');
        return;
      }

      if (!challengeToken) {
        toast.error('Verification session was not found. Request a new code');
        return;
      }

      if (!/^\d{6}$/.test(normalizedCode)) {
        toast.error('Verification code must be 6 digits');
        return;
      }
      if (activeSubmissionKeyRef.current === submissionKey) {
        return;
      }

      activeSubmissionKeyRef.current = submissionKey;
      submitInFlightRef.current = true;
      setIsSubmitting(true);

      try {
        const verificationResult = await verifyCodeRequest({
          challengeToken,
          code: normalizedCode,
          email,
          rememberDevice,
          purpose,
        });

        completedRef.current = true;
        closeVerification(close, {
          success: true,
          purpose,
          email,
          rememberDevice,
          session: verificationResult?.session || null,
          passwordResetProof: verificationResult?.passwordResetProof || null,
          signUpProof: verificationResult?.signUpProof || null,
          verifiedAt: verificationResult?.verifiedAt || null,
        });
      } catch (error) {
        const resolvedMessage = resolveVerificationErrorMessage(
          error,
          'Verification could not be completed',
        );
        const shouldIgnoreAlreadyUsedAfterSuccess =
          completedRef.current && resolvedMessage.includes('already used');

        if (shouldIgnoreAlreadyUsedAfterSuccess) {
          return;
        }

        if (resolvedMessage === 'Your login verification session expired. Sign in again') {
          toast.error(resolvedMessage, {
            id: `auth-verification-session-expired-${purpose}`,
          });
          closeVerification(close, {
            success: false,
            cancelled: true,
            error: new Error(resolvedMessage),
          });
          return;
        }

        if (resolvedMessage === 'Verification code is invalid') {
          setHasCodeError(true);

          if (resetErrorTimeoutRef.current) {
            window.clearTimeout(resetErrorTimeoutRef.current);
          }

          resetErrorTimeoutRef.current = window.setTimeout(() => {
            setCode('');
            setHasCodeError(false);
            setIsCodeFocused(false);
            resetErrorTimeoutRef.current = null;
            codeInputRef.current?.focus?.();
          }, 1000);
        }

        toast.error(resolvedMessage, {
          id: `auth-verification-submit-${purpose}`,
        });
      } finally {
        if (!completedRef.current && activeSubmissionKeyRef.current === submissionKey) {
          activeSubmissionKeyRef.current = '';
        }
        submitInFlightRef.current = false;
        setIsSubmitting(false);
      }
    },
    [
      challengeToken,
      close,
      code,
      email,
      isCodeExpired,
      isSending,
      isSubmitting,
      purpose,
      rememberDevice,
      toast,
    ],
  );

  useEffect(() => {
    const normalizedCode = normalizeOtpValue(code);

    if (hasCodeError && normalizedCode.length < 6) {
      setHasCodeError(false);
    }

    if (normalizedCode.length !== 6) {
      lastAutoSubmittedCodeRef.current = '';
      return;
    }

    if (isSubmitting || isSending || isCodeExpired || !challengeToken) {
      return;
    }

    const autoSubmitKey = `${challengeToken}:${normalizedCode}`;

    if (lastAutoSubmittedCodeRef.current === autoSubmitKey) {
      return;
    }

    lastAutoSubmittedCodeRef.current = autoSubmitKey;

    void submitVerification(normalizedCode);
  }, [
    challengeToken,
    code,
    hasCodeError,
    isCodeExpired,
    isSending,
    isSubmitting,
    submitVerification,
  ]);

  const resolvedHeader = useMemo(() => {
    const fallbackHeader = resolveAuthVerificationHeader({
      data,
    });

    const defaultDescription = header?.description || 'Enter the 6-digit code sent to your email';
    const dynamicDescription = meta?.isExpired
      ? 'Süre doldu'
      : meta?.isSending && !meta?.codeExpiryLabel
        ? 'Sending verification code'
        : meta?.codeExpiryLabel
          ? `Code expires at ${meta.codeExpiryLabel}`
          : defaultDescription;

    return {
      title: header?.title || fallbackHeader.title,
      description: dynamicDescription,
    };
  }, [
    data,
    header?.description,
    header?.title,
    meta?.codeExpiryLabel,
    meta?.isExpired,
    meta?.isSending,
  ]);

  const headerIcon =
    meta?.isSending && !meta?.hasChallenge ? <Spinner size={24} /> : 'solar:shield-keyhole-bold';

  const setHeader = useSurfaceHeader();

  useEffect(() => {
    if (setHeader) {
      setHeader({
        icon: headerIcon,
        title: resolvedHeader.title,
        description: resolvedHeader.description,
        trailing: null,
      });
    }
  }, [setHeader, headerIcon, resolvedHeader.title, resolvedHeader.description]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    await submitVerification();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2.5"
      aria-busy={isSending || isSubmitting}
    >
      <OtpBoxes
        code={code}
        disabled={isSubmitting || isSending || isCodeExpired || !challengeToken}
        hasError={hasCodeError}
        inputRef={codeInputRef}
        isFocused={isCodeFocused}
        setIsFocused={setIsCodeFocused}
        setCode={setCode}
      />

      {statusMessage ? (
        <div
          className={cn(
            'font-semibold-all border px-3.5 py-2.5 text-center text-xs',
            isStatusError
              ? 'bg-error/10 text-error border-error/20'
              : 'bg-success/10 text-success border-success/20',
          )}
        >
          {isCooldownError
            ? `Please wait ${resendRemainingSeconds}s before requesting a new code`
            : statusMessage}
        </div>
      ) : null}

      <div className="flex flex-col gap-2.5">
        <button
          className="center hover:bg-info h-11 w-full flex-auto cursor-pointer border border-white/5 bg-white/5 px-3 text-xs font-bold tracking-wide text-white/70 uppercase hover:text-black disabled:cursor-not-allowed"
          disabled={isSubmitting || isSending || !canResendCode}
          onClick={() => void sendCode({ isInitial: false })}
          type="button"
        >
          {isSending
            ? 'Sending'
            : canResendCode
              ? 'Resend'
              : `Resend in ${resendRemainingSeconds}s`}
        </button>

        {shouldShowRememberDevice ? (
          <button
            type="button"
            disabled={isSubmitting || isSending}
            aria-pressed={rememberDevice}
            onClick={() => setRememberDevice((prev) => !prev)}
            className={cn(
              'uppercase-colors flex h-11 w-full cursor-pointer items-center gap-2.5 border px-3.5 text-left text-xs',
              rememberDevice
                ? 'border-success/30 bg-success/15 text-success hover:bg-success/20'
                : 'border-white/5 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white',
              (isSubmitting || isSending) && 'cursor-not-allowed opacity-60',
            )}
          >
            <span
              className={cn(
                'center size-4 shrink-0 border',
                rememberDevice
                  ? 'border-success/40 bg-success text-black'
                  : 'border-white/5 bg-transparent text-transparent',
              )}
              aria-hidden="true"
            >
              <Icon icon="material-symbols:check-small-rounded" size={14} />
            </span>
            <span className="truncate">Remember this device for 30 days</span>
          </button>
        ) : null}
      </div>
    </form>
  );
}


// ============================================================================
// FILE: domains/auth/utils/constants.js
// ============================================================================

export const AUTH_CHALLENGE_TABLE = 'auth_challenges';
export const AUTH_AUDIT_TABLE = 'auth_audit_logs';
export const ACCOUNT_LIFECYCLE_TABLE = 'account_lifecycle';

export const AUTH_PURPOSE = Object.freeze({
  PASSWORD_RESET: 'password-reset',
  SIGN_IN: 'sign-in',
  SIGN_UP: 'sign-up',
});

export const PURPOSES = Object.freeze({
  ACCOUNT_DELETE: 'account-delete',
  EMAIL_CHANGE: 'email-change',
  PASSWORD_CHANGE: 'password-change',
  PASSWORD_SET: 'password-set',
  PASSWORD_RESET: 'password-reset',
  PROVIDER_LINK: 'provider-link',
  SIGN_IN: 'sign-in',
  SIGN_UP: 'sign-up',
});

export const SECURE_PURPOSES = new Set([
  PURPOSES.ACCOUNT_DELETE,
  PURPOSES.EMAIL_CHANGE,
  PURPOSES.PASSWORD_CHANGE,
  PURPOSES.PASSWORD_SET,
  PURPOSES.PROVIDER_LINK,
]);

export const EMAIL_DOMAIN_PATTERNS = Object.freeze([
  /^gmail\.com$/i,
  /^outlook\.[a-z.]+$/i,
  /^hotmail\.[a-z.]+$/i,
  /^yandex\.[a-z.]+$/i,
  /^yahoo\.[a-z.]+$/i,
  /^protonmail\.[a-z.]+$/i,
  /^icloud\.com$/i,
]);

export const RESERVED_CLAIM_KEYS = new Set([
  'aal',
  'amr',
  'app_metadata',
  'aud',
  'email',
  'exp',
  'iat',
  'iss',
  'phone',
  'role',
  'session_id',
  'sub',
  'user_metadata',
]);

export const LEGACY_CSRF_COOKIE_NAME = 'tvz_csrf';
export const CSRF_COOKIE_NAME = 'tvz_auth_csrf';
export const STEP_UP_COOKIE_NAME = 'tvz_step_up_token';
export const STEP_UP_MAX_AGE_MS = 15 * 60 * 1000;
export const STEP_UP_MAX_AGE_SECONDS = STEP_UP_MAX_AGE_MS / 1000;
export const SUPABASE_FALLBACK_TIMEOUT_MS = 6000;

export const PENDING_SIGN_IN_COOKIE_NAME = 'tvz_login_pending';
export const TRUSTED_DEVICE_COOKIE_PREFIX = 'tvz_login_trust_';
export const PENDING_SIGN_IN_MAX_AGE_MS = 30 * 60 * 1000;
export const PENDING_SIGN_IN_MAX_AGE_SECONDS = PENDING_SIGN_IN_MAX_AGE_MS / 1000;
export const TRUSTED_DEVICE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
export const TRUSTED_DEVICE_MAX_AGE_SECONDS = TRUSTED_DEVICE_MAX_AGE_MS / 1000;

export const GENERIC_VERIFY_ERROR = 'Verification could not be completed';
export const OTP_CODE_LENGTH = 6;
export const OTP_TTL_MS = 10 * 60 * 1000;
export const RESEND_COOLDOWN_MS = 60 * 1000;
export const MAX_VERIFY_ATTEMPTS = 5;
export const TOKEN_VERSION = 3;

export const AUTH_CHALLENGE_SELECT = [
  'attempt_count',
  'code_hash',
  'dummy',
  'email_hash',
  'expires_at',
  'jti',
  'max_attempts',
  'purpose',
  'resend_available_at',
  'salt',
  'status',
  'used_at',
  'user_id',
].join(',');

export const AUTH_COOKIE_PATH = '/';
export const SUPABASE_BASE64_PREFIX = 'base64-';
export const COOKIE_CHUNK_SUFFIX_PATTERN = /^(.*)\.(\d+)$/;

export const INITIAL_RESET_FLOW = Object.freeze({
  active: false,
  email: '',
  passwordResetProof: '',
  newPassword: '',
  confirmPassword: '',
  isSubmitting: false,
});

export const INITIAL_SIGN_UP_FORM = Object.freeze({
  username: '',
  displayName: '',
  email: '',
  password: '',
  confirmPassword: '',
});


// ============================================================================
// FILE: domains/auth/utils/errors.js
// ============================================================================

export const AUTH_ERROR_MESSAGES = Object.freeze({
  'auth/email-already-in-use': 'This email address is already in use',
  'auth/invalid-credential':
    'The password you entered is incorrect. Please check your password or reset it.',
  'auth/invalid-email': 'Enter a valid email address',
  'auth/missing-credentials': 'Sign-in credentials are missing',
  'auth/network-request-failed': 'A network error occurred. Please try again',
  'auth/operation-not-allowed': 'This sign-in method is not available',
  'auth/too-many-requests': 'Too many attempts were made. Please try again later',
  'auth/user-disabled': 'This account has been disabled',
  'auth/user-not-found':
    'No account was found with this email or username. Please check your credentials or sign up.',
  USER_NOT_FOUND:
    'No account was found with this email or username. Please check your credentials or sign up.',
  user_not_found:
    'No account was found with this email or username. Please check your credentials or sign up.',
  'auth/weak-password': 'Password is too weak. Use at least 8 characters and 1 number',
  'auth/wrong-password':
    'The password you entered is incorrect. Please check your password or reset it.',
  SIGNIN_IDENTIFIER_REQUIRED: 'Username or email is required',
  PROFILE_EMAIL_MISSING: 'No sign-in email was found for this username. Please contact support',
  USERNAME_TAKEN: 'This username is already taken',
  GOOGLE_EMAIL_UNAVAILABLE:
    'Google account email could not be verified. Try again with a Google account that has a verified email address.',
  GOOGLE_LINK_EMAIL_MISMATCH: 'Google account email must match your current email to link',
  GOOGLE_PASSWORD_LOGIN_REQUIRED:
    'This email is already used by another account. Sign in with your password once to link Google',
  GOOGLE_PROVIDER_COLLISION: 'This Google account is already linked to another account',
  GOOGLE_SIGNUP_REQUIRED: 'No account exists for this Google account. Continue with Sign Up.',
  GOOGLE_UNLINK_REQUIRES_PASSWORD:
    'Google can only be unlinked while email/password sign-in remains enabled',
  INVALID_LOGIN_CREDENTIALS:
    'The password you entered is incorrect. Please check your password or reset it.',
  invalid_login_credentials:
    'The password you entered is incorrect. Please check your password or reset it.',
  invalid_credentials:
    'The password you entered is incorrect. Please check your password or reset it.',
  PASSWORD_SIGN_IN_DISABLED:
    'Password sign-in is not enabled for this account. Use a connected provider or set a password from Account Security.',
});

export const AUTH_ERROR_MESSAGE_PATTERNS = Object.freeze([
  ['auth/email-already-in-use', AUTH_ERROR_MESSAGES['auth/email-already-in-use']],
  ['auth/invalid-credential', AUTH_ERROR_MESSAGES['auth/invalid-credential']],
  ['Invalid login credentials', AUTH_ERROR_MESSAGES.INVALID_LOGIN_CREDENTIALS],
  ['invalid_credentials', AUTH_ERROR_MESSAGES.INVALID_LOGIN_CREDENTIALS],
  ['invalid_login_credentials', AUTH_ERROR_MESSAGES.INVALID_LOGIN_CREDENTIALS],
  ['USER_NOT_FOUND', AUTH_ERROR_MESSAGES.USER_NOT_FOUND],
  ['user_not_found', AUTH_ERROR_MESSAGES.USER_NOT_FOUND],
  ['PASSWORD_SIGN_IN_DISABLED', AUTH_ERROR_MESSAGES.PASSWORD_SIGN_IN_DISABLED],
  ['password-sign-in-disabled', AUTH_ERROR_MESSAGES.PASSWORD_SIGN_IN_DISABLED],
  ['auth/invalid-email', AUTH_ERROR_MESSAGES['auth/invalid-email']],
  ['auth/user-not-found', AUTH_ERROR_MESSAGES['auth/user-not-found']],
  ['auth/wrong-password', AUTH_ERROR_MESSAGES['auth/wrong-password']],
  ['auth/weak-password', AUTH_ERROR_MESSAGES['auth/weak-password']],
  ['auth/too-many-requests', AUTH_ERROR_MESSAGES['auth/too-many-requests']],
  ['auth/network-request-failed', AUTH_ERROR_MESSAGES['auth/network-request-failed']],
  ['GOOGLE_EMAIL_UNAVAILABLE', AUTH_ERROR_MESSAGES.GOOGLE_EMAIL_UNAVAILABLE],
  ['GOOGLE_PASSWORD_LOGIN_REQUIRED', AUTH_ERROR_MESSAGES.GOOGLE_PASSWORD_LOGIN_REQUIRED],
  ['GOOGLE_SIGNUP_REQUIRED', AUTH_ERROR_MESSAGES.GOOGLE_SIGNUP_REQUIRED],
  ['GOOGLE_PROVIDER_COLLISION', AUTH_ERROR_MESSAGES.GOOGLE_PROVIDER_COLLISION],
  ['GOOGLE_LINK_EMAIL_MISMATCH', AUTH_ERROR_MESSAGES.GOOGLE_LINK_EMAIL_MISMATCH],
  ['GOOGLE_UNLINK_REQUIRES_PASSWORD', AUTH_ERROR_MESSAGES.GOOGLE_UNLINK_REQUIRES_PASSWORD],
]);

export function createError(code, message = null) {
  const error = new Error(message || code);
  error.code = code;
  return error;
}

export function resolveAuthErrorMessage(error, fallbackMessage) {
  const code = String(error?.code || '').trim();
  if (AUTH_ERROR_MESSAGES[code]) return AUTH_ERROR_MESSAGES[code];

  const message = String(error?.message || '').trim();
  if (AUTH_ERROR_MESSAGES[message]) return AUTH_ERROR_MESSAGES[message];

  for (const [pattern, readableMessage] of AUTH_ERROR_MESSAGE_PATTERNS) {
    if (message.includes(pattern)) return readableMessage;
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
    message.includes('Verification session has expired') ||
    message.includes('Pending sign-in session was not found') ||
    message.includes('Pending sign-in session has expired')
  ) {
    return 'Your login verification session expired. Sign in again';
  }
  if (message.includes('Verification code attempts are exhausted')) {
    return 'Too many invalid code attempts. Request a new code';
  }
  if (
    message.includes('Current password is incorrect') ||
    message.includes('INVALID_LOGIN_CREDENTIALS')
  ) {
    return 'Current password is incorrect';
  }
  if (message && !message.includes('Supabase error')) {
    return message;
  }

  return fallbackMessage;
}


// ============================================================================
// FILE: domains/auth/utils/index.js
// ============================================================================

export * from './constants';
export * from './oauth';
export * from './password';
export * from './providers';
export * from './errors';
export * from './routes';


// ============================================================================
// FILE: domains/auth/utils/oauth.js
// ============================================================================

import {
  buildOAuthCallbackUrl,
  getOAuthProviderConfig,
  getOAuthProviderId,
  getOAuthProviderLabel,
  getEnabledOAuthProviderIds,
  GITHUB_PROVIDER_ID,
  GOOGLE_PROVIDER_ID,
  isSupportedOAuthProvider,
  normalizeOAuthProvider,
  normalizeOAuthIntent,
  normalizeProviderId,
  OAUTH_PROVIDER_CONFIG,
  OAUTH_PROVIDER_KEYS,
  PASSWORD_PROVIDER_ID,
  resolveOAuthIntent,
  sanitizeAuthNextPath,
} from '@/core/modules/auth/provider-utils';

export {
  getOAuthProviderConfig,
  getOAuthProviderId,
  getOAuthProviderLabel,
  getEnabledOAuthProviderIds,
  GITHUB_PROVIDER_ID,
  GOOGLE_PROVIDER_ID,
  isSupportedOAuthProvider,
  normalizeOAuthProvider,
  normalizeProviderId,
  OAUTH_PROVIDER_CONFIG,
  OAUTH_PROVIDER_KEYS,
  PASSWORD_PROVIDER_ID,
};

export const AUTH_OAUTH_CALLBACK_PATH = '/api/auth/callback';
export const AUTH_DEFAULT_POST_LOGIN_PATH = '/account';

export function getOAuthProviderIcon(value) {
  return getOAuthProviderConfig(value)?.icon || null;
}

export { buildOAuthCallbackUrl, normalizeOAuthIntent, resolveOAuthIntent, sanitizeAuthNextPath };


// ============================================================================
// FILE: domains/auth/utils/password.js
// ============================================================================

export function normalizePassword(value) {
  return String(value || '');
}

export const PASSWORD_REQUIREMENTS = Object.freeze([
  Object.freeze({
    id: 'length',
    label: 'At least 8 characters',
  }),
  Object.freeze({
    id: 'number',
    label: 'At least 1 number',
  }),
]);

export function evaluatePasswordRules(value) {
  const password = normalizePassword(value);

  return PASSWORD_REQUIREMENTS.map((requirement) => {
    if (requirement.id === 'length') {
      return { ...requirement, satisfied: password.length >= 8 };
    }
    if (requirement.id === 'number') {
      return { ...requirement, satisfied: /\d/.test(password) };
    }
    return { ...requirement, satisfied: false };
  });
}

export function arePasswordRulesSatisfied(value) {
  return evaluatePasswordRules(value).every((req) => req.satisfied);
}

export function validatePasswordRules(value) {
  const password = normalizePassword(value);
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }
  if (!/\d/.test(password)) {
    throw new Error('Password must contain at least 1 number');
  }
  return password;
}

export function validatePassword(value) {
  return validatePasswordRules(value);
}

export function hasSatisfiedPasswordRequirements(value) {
  return arePasswordRulesSatisfied(value);
}

export function isPasswordRequirementError(error) {
  const msg = String(error?.message || '')
    .trim()
    .toLowerCase();
  return (
    msg.includes('password must be at least 8 characters long') ||
    msg.includes('password must contain at least 1 number')
  );
}

export function isPasswordConfirmationMismatchError(error) {
  return String(error?.message || '')
    .trim()
    .toLowerCase()
    .includes('password confirmation does not match');
}


// ============================================================================
// FILE: domains/auth/utils/providers.js
// ============================================================================

import { normalizeEmailValue, normalizeValue } from '@/shared/utils';
import {
  normalizeProviderId,
  resolveAuthCapabilities,
  resolvePrimaryProvider,
  uniqueStrings,
} from '@/core/modules/auth/provider-utils';
import { GOOGLE_PROVIDER_ID, PASSWORD_PROVIDER_ID } from './oauth';

export { resolveAuthCapabilities, resolvePrimaryProvider, uniqueStrings };

export function normalizeProvider(value) {
  return normalizeProviderId(value);
}

function getMetadataProviders(appMetadata = {}) {
  return [
    ...(Array.isArray(appMetadata?.providers) ? appMetadata.providers : []),
    appMetadata?.provider,
    appMetadata?.tvz_password_enabled === true ? PASSWORD_PROVIDER_ID : null,
  ]
    .map(normalizeProvider)
    .filter(Boolean);
}

function getAmrProviders(tokenClaims = {}) {
  return (Array.isArray(tokenClaims?.amr) ? tokenClaims.amr : [])
    .map((entry) => {
      if (typeof entry === 'string') return normalizeValue(entry).toLowerCase();
      if (entry && typeof entry === 'object') {
        return normalizeValue(entry.method || entry.provider || entry.id).toLowerCase();
      }
      return '';
    })
    .map((method) => {
      if (method === PASSWORD_PROVIDER_ID || method === 'pwd' || method === 'email') {
        return PASSWORD_PROVIDER_ID;
      }
      if (method === 'google') return GOOGLE_PROVIDER_ID;
      if (method === 'oauth') return normalizeProvider(tokenClaims?.app_metadata?.provider);
      return null;
    })
    .filter(Boolean);
}

export function resolveProviderIds({
  providerData = [],
  identities = [],
  appMetadata = {},
  tokenClaims = {},
} = {}) {
  const providerIdsFromProviderData = Array.isArray(providerData)
    ? providerData
        .map((provider) => normalizeProvider(provider?.providerId || provider?.id))
        .filter(Boolean)
    : [];
  const providerIdsFromIdentities = Array.isArray(identities)
    ? identities.map((identity) => normalizeProvider(identity?.provider)).filter(Boolean)
    : [];

  return uniqueStrings([
    ...providerIdsFromProviderData,
    ...providerIdsFromIdentities,
    ...getMetadataProviders(appMetadata),
    ...getMetadataProviders(tokenClaims?.app_metadata || {}),
    ...getAmrProviders(tokenClaims),
  ]);
}

export function resolveProviderDescriptors({
  providerData = [],
  identities = [],
  email = null,
  userId = null,
} = {}) {
  const providers = new Map();
  const addProvider = (providerId, providerEmail, uid) => {
    const id = normalizeProvider(providerId);
    if (!id || providers.has(id)) return;

    providers.set(id, {
      email: normalizeEmailValue(providerEmail || email) || null,
      id,
      uid: normalizeValue(uid || userId) || null,
    });
  };

  if (Array.isArray(providerData)) {
    providerData.forEach((provider) => {
      addProvider(
        provider?.providerId || provider?.id,
        provider?.email,
        provider?.uid || provider?.user_id,
      );
    });
  }

  if (Array.isArray(identities)) {
    identities.forEach((identity) => {
      addProvider(
        identity?.provider,
        identity?.identity_data?.email,
        identity?.id || identity?.identity_id || identity?.user_id,
      );
    });
  }

  return Array.from(providers.values());
}


// ============================================================================
// FILE: domains/auth/utils/routes.js
// ============================================================================

import { normalizeLowerValue } from '@/shared/utils';
import {
  AUTH_DEFAULT_POST_LOGIN_PATH,
  getOAuthProviderLabel,
  sanitizeAuthNextPath,
} from '@/domains/auth/utils/oauth';
import { EMAIL_DOMAIN_PATTERNS } from './constants';

export const AUTH_ROUTES = Object.freeze({
  SIGN_IN: '/sign-in',
  SIGN_UP: '/sign-up',
});

export const AUTH_ROUTE_NOTICE = Object.freeze({
  GOOGLE_AUTH_FAILED: 'google-auth-failed',
  OAUTH_ACCOUNT_ALREADY_REGISTERED: 'oauth-account-already-registered',
  GOOGLE_PASSWORD_LOGIN_REQUIRED: 'google-password-login-required',
  GOOGLE_PROVIDER_COLLISION: 'google-provider-collision',
  GOOGLE_SIGNUP_REQUIRED: 'google-signup-required',
  OAUTH_AUTH_FAILED: 'oauth-auth-failed',
});

export const AUTH_ROUTE_NOTICE_COOKIE_NAME = 'tvz_auth_notice';

export function normalizeAuthRouteNotice(value) {
  const normalized = normalizeLowerValue(value);
  if (Object.values(AUTH_ROUTE_NOTICE).includes(normalized)) {
    return normalized;
  }
  return '';
}

function expireNoticeCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = `${AUTH_ROUTE_NOTICE_COOKIE_NAME}=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

export function consumeAuthRouteNoticeCookie() {
  if (typeof document === 'undefined') return '';

  const prefix = `${AUTH_ROUTE_NOTICE_COOKIE_NAME}=`;
  const cookieEntry = String(document.cookie || '')
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(prefix));

  if (!cookieEntry) return '';
  expireNoticeCookie();

  return normalizeAuthRouteNotice(decodeURIComponent(cookieEntry.slice(prefix.length)));
}

export function resolveSignInNoticeToast(notice, provider = null) {
  switch (notice) {
    case AUTH_ROUTE_NOTICE.OAUTH_ACCOUNT_ALREADY_REGISTERED:
      return {
        type: 'warning',
        message: `This email is used to sign in with ${getOAuthProviderLabel(provider, 'a social provider')} on another account. Continue with it, or disconnect it from that account’s security settings before using this email here.`,
      };
    case AUTH_ROUTE_NOTICE.GOOGLE_PASSWORD_LOGIN_REQUIRED:
      return {
        type: 'warning',
        message:
          'This email is already used by another account. Sign in with your password once to link Google.',
      };
    case AUTH_ROUTE_NOTICE.GOOGLE_AUTH_FAILED:
      return {
        type: 'error',
        message: 'Google sign-in could not be completed. Please try again.',
      };
    case AUTH_ROUTE_NOTICE.OAUTH_AUTH_FAILED:
      return {
        type: 'error',
        message: 'Social sign-in could not be completed. Please try again.',
      };
    case AUTH_ROUTE_NOTICE.GOOGLE_PROVIDER_COLLISION:
      return {
        type: 'error',
        message: 'This Google account is already linked to another account',
      };
    default:
      return null;
  }
}

export function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export function isEmailIdentifier(value) {
  return String(value || '').includes('@');
}

export function validateAllowedEmailDomain(value) {
  const email = normalizeEmail(value);
  const parts = email.split('@');

  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error('Enter a valid email address');
  }

  const [, domain] = parts;
  const isAllowed = EMAIL_DOMAIN_PATTERNS.some((pattern) => pattern.test(domain));

  if (!isAllowed) {
    throw new Error(
      'Only supported email domains are allowed: gmail, outlook, hotmail, yandex, yahoo, protonmail, icloud',
    );
  }

  return email;
}

export function formatVerificationExpiry(expiresAt) {
  if (!expiresAt) return null;
  const date = new Date(expiresAt);

  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function resolveVerificationTimestamp(value) {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  const parsedNumber = Number(value);
  if (Number.isFinite(parsedNumber) && parsedNumber > 0) return parsedNumber;

  const parsedDate = new Date(value).getTime();
  return Number.isFinite(parsedDate) && parsedDate > 0 ? parsedDate : 0;
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

  return query ? `${normalizedPath}?${query}` : normalizedPath;
}

export function buildAuthHref(pathname, { next, email, identifier, notice, provider } = {}) {
  const params = new URLSearchParams();
  const safeNext = sanitizeNextPath(next, '');

  if (safeNext) params.set('next', safeNext);

  const normalizedIdentifier = String(identifier || '').trim();
  const normalizedEmail = normalizeEmail(email);
  const normalizedNotice = String(notice || '').trim();
  const normalizedProvider = String(provider || '').trim();

  if (normalizedIdentifier) params.set('identifier', normalizedIdentifier);
  if (normalizedEmail) params.set('email', normalizedEmail);
  if (normalizedNotice) params.set('notice', normalizedNotice);
  if (normalizedProvider) params.set('provider', normalizedProvider);

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}


