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
