import { NextResponse } from 'next/server';

import {
  abortAccountDeleteLifecycle,
  ACCOUNT_LIFECYCLE_STATES,
  assertPasswordProviderLinked,
  beginAccountDeleteLifecycle,
  completeAccountDeleteLifecycle,
  EMAIL_ACCOUNT_STATES,
  hasPasswordProvider,
  resolveEmailAccountState,
} from '@/core/auth/servers/account.js';
import { writeAuthAuditLog } from '@/core/auth/servers/audit.js';
import { AUTH_ROUTE_POLICY_KEYS, requirePolicySession } from '@/core/auth/servers/policy.js';
import { clearAuthCookies, getRequestContext, requireSessionRequest } from '@/core/auth/servers/session.js';
import {
  assertCsrfRequest,
  assertRecentReauth,
  assertStepUp,
  AUTH_RATE_LIMIT_POLICY_KEYS,
  clearRecentReauthCookie,
  clearStepUpCookie,
  createRecentReauthToken,
  enforceAuthRateLimit,
  enforceSlidingWindowRateLimit,
  isSlidingWindowRateLimitError,
  setRecentReauthCookie,
  validateStrongPassword,
  verifyPasswordWithIdentityToolkit,
} from '@/core/auth/servers/security.js';
import {
  lookupPasswordAccountByEmail,
  resolvePasswordAccountIdentifier,
} from '@/core/auth/servers/verification.js';
import { createAdminClient } from '@/core/clients/supabase/admin';
import { ACCOUNT_WRITE_FUNCTION } from '@/core/services/account/account.constants';
import {
  buildInternalRequestMeta,
  createApiErrorResponse,
  createApiSuccessResponse,
  executeWriteRollout,
  invokeInternalEdgeFunction,
} from '@/core/services/shared/server';

const ACCOUNT_ACTIONS = Object.freeze({
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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const INTENTS = Object.freeze({
  PASSWORD_RESET: 'password-reset',
  SIGN_IN: 'sign-in',
  SIGN_UP: 'sign-up',
});

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeEmail(value) {
  return normalizeValue(value).toLowerCase();
}

function normalizePassword(value) {
  return String(value || '');
}

function normalizeAction(value) {
  const normalizedAction = normalizeValue(value).toLowerCase();

  return ACTION_ALIASES[normalizedAction] || normalizedAction;
}

function normalizeIntent(value) {
  const normalizedIntent = normalizeValue(value).toLowerCase();

  if (Object.values(INTENTS).includes(normalizedIntent)) {
    return normalizedIntent;
  }

  return INTENTS.SIGN_IN;
}

function buildRequestMeta(request, action) {
  return buildInternalRequestMeta({
    request,
    source: ACTION_SOURCES[action] || 'api/auth/account',
  });
}

function createStatusPayload({
  email,
  lookup = null,
  accountExists = false,
  accountState = null,
  passwordEnabled = false,
  signInMethods = [],
  allowedIntent = null,
  messageCode = null,
}) {
  return {
    accountExists,
    accountState,
    allowedIntent,
    email,
    messageCode,
    passwordEnabled,
    signInMethods: Array.isArray(signInMethods)
      ? signInMethods
      : Array.isArray(lookup?.signInMethods)
        ? lookup.signInMethods
        : [],
  };
}

function resolveLookupError(intent, code) {
  if (code === 'auth/user-not-found') {
    return {
      allowedIntent: intent === INTENTS.SIGN_UP ? INTENTS.SIGN_UP : null,
      messageCode: intent === INTENTS.SIGN_UP ? 'SIGNUP_ALLOWED' : 'ACCOUNT_NOT_FOUND',
      error:
        intent === INTENTS.SIGN_UP
          ? 'This email can be used to create a new account'
          : 'No account was found with this email address',
      status: intent === INTENTS.SIGN_UP ? 200 : 404,
    };
  }

  if (code === 'auth/password-sign-in-disabled') {
    return {
      allowedIntent: 'google-sign-in',
      messageCode: 'PASSWORD_SIGN_IN_DISABLED',
      error:
        intent === INTENTS.PASSWORD_RESET
          ? 'Password reset is not available for this account'
          : 'This account does not have email/password sign-in enabled',
      status: 409,
    };
  }

  if (code === 'auth/password-reset-unavailable') {
    return {
      allowedIntent: null,
      messageCode: 'PASSWORD_RESET_UNAVAILABLE',
      error: 'Password reset is not available for this account',
      status: 409,
    };
  }

  return {
    allowedIntent: null,
    messageCode: 'ACCOUNT_STATUS_UNRESOLVED',
    error: 'Account status could not be resolved',
    status: 500,
  };
}

function resolveDeleteErrorMessage(error) {
  const rawMessage = normalizeValue(error?.message);
  const errorCode = normalizeValue(error?.code);

  if (rawMessage.includes('FAILED_PRECONDITION') || errorCode === '9' || errorCode === 'failed-precondition') {
    return 'Account deletion is temporarily unavailable. Please try again';
  }

  return rawMessage || 'Account could not be deleted';
}

function buildDeleteSuccessResponse({ request, requestMeta, sessionJti, userId }) {
  const response = createApiSuccessResponse(
    {
      messageCode: 'ACCOUNT_DELETED',
      nextAction: 'signed_out',
    },
    {
      code: 'ACCOUNT_DELETED',
      legacyPayload: {
        ok: true,
        nextAction: 'signed_out',
        messageCode: 'ACCOUNT_DELETED',
      },
      requestMeta: {
        ...requestMeta,
        sessionId: sessionJti,
        userId,
      },
    }
  );
  clearAuthCookies(response, request);
  clearStepUpCookie(response);
  return response;
}

async function syncProfileEmail({ userId, email, request = null, requestMeta = null }) {
  const normalizedUserId = normalizeValue(userId);
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedUserId) {
    throw new Error('Authenticated user is required');
  }

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('Enter a valid email address');
  }

  const result = await invokeInternalEdgeFunction(ACCOUNT_WRITE_FUNCTION, {
    body: {
      action: 'sync-email',
      email: normalizedEmail,
      userId: normalizedUserId,
    },
    request,
    requestMeta,
  });

  if (result?.ok !== true) {
    throw new Error('Profile email could not be synced');
  }
}

async function rollbackEmailChange({ adminAuth, userId, previousEmail, request = null, requestMeta = null }) {
  const normalizedPreviousEmail = normalizeEmail(previousEmail);

  if (!normalizedPreviousEmail) {
    return;
  }

  await adminAuth.updateUser(userId, {
    email: normalizedPreviousEmail,
    emailVerified: true,
  });
  await syncProfileEmail({
    userId,
    email: normalizedPreviousEmail,
    request,
    requestMeta,
  });
}

async function signOutAuthSession(accessToken, scope = 'local') {
  const normalizedAccessToken = normalizeValue(accessToken);

  if (!normalizedAccessToken) {
    throw new Error('Authenticated access token is required');
  }

  const result = await createAdminClient().auth.admin.signOut(normalizedAccessToken, scope);

  if (result.error) {
    throw new Error(result.error.message || 'Authentication session could not be terminated');
  }

  return true;
}

async function assertEmailAvailable(adminAuth, email) {
  try {
    const existingUser = await adminAuth.getUserByEmail(email);

    if (existingUser?.uid) {
      throw new Error('This email address is already in use');
    }
  } catch (error) {
    if (normalizeValue(error?.code) === 'auth/user-not-found') {
      return;
    }

    throw error;
  }
}

export {
  ACCOUNT_ACTIONS,
  ACTION_SOURCES,
  EMAIL_PATTERN,
  INTENTS,
  NextResponse,
  ACCOUNT_LIFECYCLE_STATES,
  AUTH_RATE_LIMIT_POLICY_KEYS,
  AUTH_ROUTE_POLICY_KEYS,
  EMAIL_ACCOUNT_STATES,
  abortAccountDeleteLifecycle,
  assertCsrfRequest,
  assertEmailAvailable,
  assertPasswordProviderLinked,
  assertRecentReauth,
  assertStepUp,
  beginAccountDeleteLifecycle,
  buildDeleteSuccessResponse,
  buildRequestMeta,
  clearAuthCookies,
  clearRecentReauthCookie,
  clearStepUpCookie,
  completeAccountDeleteLifecycle,
  createAdminClient,
  createApiErrorResponse,
  createApiSuccessResponse,
  createRecentReauthToken,
  createStatusPayload,
  enforceAuthRateLimit,
  enforceSlidingWindowRateLimit,
  executeWriteRollout,
  getRequestContext,
  hasPasswordProvider,
  invokeInternalEdgeFunction,
  isSlidingWindowRateLimitError,
  lookupPasswordAccountByEmail,
  normalizeAction,
  normalizeEmail,
  normalizeIntent,
  normalizePassword,
  normalizeValue,
  requirePolicySession,
  requireSessionRequest,
  resolveDeleteErrorMessage,
  resolveEmailAccountState,
  resolveLookupError,
  resolvePasswordAccountIdentifier,
  rollbackEmailChange,
  setRecentReauthCookie,
  signOutAuthSession,
  syncProfileEmail,
  validateStrongPassword,
  verifyPasswordWithIdentityToolkit,
  writeAuthAuditLog,
};
