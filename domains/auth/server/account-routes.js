import { NextResponse } from 'next/server';
import { normalizeEmailValue, normalizeValue } from '@/shared';
import { createAdminClient } from '@/infrastructure/supabase/server';
import {
  abortAccountDeleteLifecycle,
  ACCOUNT_LIFECYCLE_STATES,
  beginAccountDeleteLifecycle,
  completeAccountDeleteLifecycle,
  EMAIL_ACCOUNT_STATES,
  purgeAccountData,
  resolveEmailAccountState,
} from './account';
import { AUTH_ROUTE_POLICY_KEYS, requirePolicySession } from './policies';
import {
  clearAuthCookies,
  createRequestSupabaseClient,
  getRequestContext,
  withTimeout,
} from './session';
import {
  deleteUser,
  extractUuid,
  getUserByEmail,
  getUserById,
  revokeRefreshTokens,
} from './admin.js';
import {
  assertCsrfRequest,
  assertRecentReauth,
  consumeStepUp,
  AUTH_RATE_LIMIT_POLICY_KEYS,
  clearRecentReauthCookie,
  clearStepUpCookie,
  createRecentReauthToken,
  enforceAuthRateLimit,
  setRecentReauthCookie,
} from './security';
import { buildInternalRequestMeta } from '@/infrastructure/http/server';
import { createApiErrorResponse, createApiSuccessResponse } from '@/infrastructure/http/server';

export const ACCOUNT_ACTIONS = Object.freeze({
  CHANGE_EMAIL: 'change-email',
  DELETE: 'delete',
  REAUTHENTICATE: 'reauthenticate',
});

const ACTION_ALIASES = Object.freeze({
  'account-delete': ACCOUNT_ACTIONS.DELETE,
  'delete-account': ACCOUNT_ACTIONS.DELETE,
  'email-change': ACCOUNT_ACTIONS.CHANGE_EMAIL,
});

const ACTION_SOURCES = Object.freeze({
  [ACCOUNT_ACTIONS.CHANGE_EMAIL]: 'api/auth/account/change-email',
  [ACCOUNT_ACTIONS.DELETE]: 'api/auth/account/delete',
  [ACCOUNT_ACTIONS.REAUTHENTICATE]: 'api/auth/account/reauthenticate',
});

function normalizeAction(value) {
  const norm = normalizeValue(value).toLowerCase();
  return ACTION_ALIASES[norm] || norm;
}

async function resolveSessionUserId(session, request) {
  const candidates = [
    session?.userId,
    session?.decodedToken?.sub,
    session?.decodedToken?.user_id,
    session?.tokenClaims?.sub,
    session?.claims?.sub,
    session?.user?.id,
    session?.user?.uid,
    session?.user?.user_id,
    session?.sub,
    session?.uid,
    session?.user_id,
  ];

  for (const candidate of candidates) {
    const userId = extractUuid(normalizeValue(candidate));
    if (userId) return userId;
  }

  const accessToken = normalizeValue(session?.accessToken);
  if (accessToken) {
    try {
      const result = await createAdminClient().auth.getUser(accessToken);
      const userId = extractUuid(result?.data?.user?.id);
      if (userId) return userId;
    } catch {}
  }

  if (request) {
    try {
      const result = await withTimeout(createRequestSupabaseClient(request).auth.getUser(), 3500);
      const userId = extractUuid(result?.data?.user?.id);
      if (userId) return userId;
    } catch {}
  }
  const email = normalizeEmailValue(
    session?.email || session?.user?.email || session?.decodedToken?.email,
  );
  if (email) {
    try {
      const user = await getUserByEmail(email);
      const userId = extractUuid(user?.uid || user?.id);
      if (userId) return userId;
    } catch {}
  }

  return extractUuid(session);
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

export async function handleReauthenticate(request, body) {
  try {
    assertCsrfRequest(request);
    const session = await requirePolicySession(request, {
      policyKey: AUTH_ROUTE_POLICY_KEYS.ACCOUNT_REAUTHENTICATE,
    });
    const userId = await resolveSessionUserId(session, request);

    if (!userId) {
      return createApiErrorResponse(
        {
          code: 'INVALID_USER_ID',
          message: 'Valid User ID UUID is required',
          retryable: false,
        },
        {
          requestMeta: buildRequestMeta(request, ACCOUNT_ACTIONS.REAUTHENTICATE),
          status: 400,
        },
      );
    }

    await consumeStepUp(request, {
      email: session?.email,
      purpose: 'account-reauth',
      userId,
    });
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

    const userId = await resolveSessionUserId(session, request);

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

    let userRecord;
    try {
      userRecord = await getUserById(userId);
    } catch {
      throw new Error('Authenticated user could not be loaded');
    }

    if (!userRecord) {
      throw new Error('Authenticated user could not be loaded');
    }

    await consumeStepUp(request, {
      email: session.email,
      purpose: 'account-delete',
      userId,
    });
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
      {
        requestMeta: buildRequestMeta(request, ACCOUNT_ACTIONS.DELETE),
        retryAfterSeconds: error?.retryAfterSeconds,
        status: Number.isInteger(error?.status) ? error.status : 400,
      },
    );
  }
}

export async function handleChangeEmail(request, body) {
  try {
    assertCsrfRequest(request);
    const session = await requirePolicySession(request, {
      policyKey: AUTH_ROUTE_POLICY_KEYS.ACCOUNT_CHANGE_EMAIL,
    });
    const userId = await resolveSessionUserId(session, request);
    assertRecentReauth(request, { sessionJti: session?.sessionJti, userId });
    await consumeStepUp(request, {
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
      {
        requestMeta: buildRequestMeta(request, ACCOUNT_ACTIONS.CHANGE_EMAIL),
        retryAfterSeconds: error?.retryAfterSeconds,
        status: Number.isInteger(error?.status) ? error.status : 400,
      },
    );
  }
}

export async function handleAccountPost(request) {
  const body = await request.json().catch(() => ({}));
  const action = normalizeAction(body?.action);

  switch (action) {
    case ACCOUNT_ACTIONS.REAUTHENTICATE:
      return handleReauthenticate(request, body);
    case ACCOUNT_ACTIONS.DELETE:
      return handleDeleteAccount(request, body);
    case ACCOUNT_ACTIONS.CHANGE_EMAIL:
      return handleChangeEmail(request, body);
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
