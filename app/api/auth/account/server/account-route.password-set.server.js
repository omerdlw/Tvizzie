import {
  ACCOUNT_ACTIONS,
  ACCOUNT_LIFECYCLE_STATES,
  ACTION_SOURCES,
  AUTH_RATE_LIMIT_POLICY_KEYS,
  AUTH_ROUTE_POLICY_KEYS,
  EMAIL_ACCOUNT_STATES,
  EMAIL_PATTERN,
  INTENTS,
  NextResponse,
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
  createApiErrorResponse,
  createApiSuccessResponse,
  createRecentReauthToken,
  enforceAuthRateLimit,
  enforceSlidingWindowRateLimit,
  getRequestContext,
  hasPasswordProvider,
  invokeInternalEdgeFunction,
  isSlidingWindowRateLimitError,
  lookupPasswordAccountByEmail,
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
} from './account-route.shared.server';

export async function handleSetPassword(request, body) {
  const requestContext = getRequestContext(request);
  const requestMeta = buildRequestMeta(request, ACCOUNT_ACTIONS.SET_PASSWORD);
  let email = null;
  let userId = null;
  let challengeJti = null;
  let sessionJti = null;

  try {
    const newPassword = validateStrongPassword(body?.newPassword);

    assertCsrfRequest(request);

    const authContext = await requirePolicySession(request, AUTH_ROUTE_POLICY_KEYS.PASSWORD_SET_COMPLETE);

    userId = authContext.userId;
    sessionJti = authContext.sessionJti || null;
    email = normalizeEmail(authContext.email);

    if (hasPasswordProvider(authContext.userRecord)) {
      throw new Error('Email/password sign-in is already linked to this account');
    }

    const stepUp = assertStepUp(request, {
      purpose: 'password-set',
      userId,
    });
    challengeJti = stepUp?.challengeJti || null;

    await enforceAuthRateLimit(AUTH_RATE_LIMIT_POLICY_KEYS.PASSWORD_SET_COMPLETE, {
      dimensionValues: {
        device: requestContext.deviceId,
        ip: requestContext.ipAddress,
        user: userId,
      },
    });

    await authContext.adminAuth.updateUser(userId, {
      appMetadata: {
        ...(authContext.userRecord?.app_metadata || {}),
        tvz_password_enabled: true,
      },
      password: newPassword,
    });
    await authContext.adminAuth.revokeRefreshTokens(userId);

    await writeAuthAuditLog({
      request,
      eventType: 'password-set',
      status: 'success',
      userId,
      email,
      provider: 'password',
      requestId: requestMeta.requestId,
      sessionJti,
      outcome: 'completed',
      metadata: {
        action: 'password-set-complete',
        challengeJti,
        csrfValid: true,
        sessionJti,
        source: ACTION_SOURCES[ACCOUNT_ACTIONS.SET_PASSWORD],
        stepUpPurpose: 'password-set',
      },
    }).catch((auditError) => {
      console.error('[AuthAudit] password-set success log failed:', auditError);
    });

    const response = createApiSuccessResponse(
      {
        messageCode: 'PASSWORD_SET',
        nextAction: 'signed_out',
      },
      {
        code: 'PASSWORD_SET',
        legacyPayload: {
          ok: true,
          nextAction: 'signed_out',
          messageCode: 'PASSWORD_SET',
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
  } catch (error) {
    const message = String(error?.message || 'Password could not be set');
    const status = message.includes('Too many')
      ? 429
      : message.includes('Invalid CSRF token')
        ? 403
        : message.includes('already deleted')
          ? 410
          : message.includes('pending deletion')
            ? 409
            : message.includes('Authentication session is required') ||
                message.includes('Invalid or expired authentication token') ||
                message.includes('Authentication token has been revoked')
              ? 401
              : message.includes('already linked to this account')
                ? 409
                : message.includes('required') ||
                    message.includes('invalid') ||
                    message.includes('verification') ||
                    message.includes('must contain') ||
                    message.includes('at least')
                  ? 400
                  : 500;

    await writeAuthAuditLog({
      request,
      eventType: 'password-set',
      status: status === 429 ? 'blocked' : 'failure',
      userId,
      email,
      provider: 'password',
      requestId: requestMeta.requestId,
      sessionJti,
      outcome: status === 429 ? 'blocked' : 'failed',
      metadata: {
        action: 'password-set-complete',
        challengeJti,
        csrfValid: !message.includes('Invalid CSRF token'),
        message,
        sessionJti,
        source: ACTION_SOURCES[ACCOUNT_ACTIONS.SET_PASSWORD],
        stepUpPurpose: 'password-set',
      },
    }).catch((auditError) => {
      console.error('[AuthAudit] password-set failure log failed:', auditError);
    });

    return createApiErrorResponse(
      {
        code: status === 429 ? 'RATE_LIMITED' : 'PASSWORD_SET_FAILED',
        message,
        retryable: status >= 500,
      },
      {
        requestMeta: {
          ...requestMeta,
          sessionId: sessionJti,
          userId,
        },
        status,
      }
    );
  }
}
