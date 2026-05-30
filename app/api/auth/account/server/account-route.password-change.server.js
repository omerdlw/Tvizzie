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

export async function handleChangePassword(request, body) {
  const requestContext = getRequestContext(request);
  const requestMeta = buildRequestMeta(request, ACCOUNT_ACTIONS.CHANGE_PASSWORD);
  let email = null;
  let userId = null;
  let challengeJti = null;
  let sessionJti = null;

  try {
    const currentPassword = normalizePassword(body?.currentPassword);
    const newPassword = validateStrongPassword(body?.newPassword);

    if (!currentPassword) {
      return createApiErrorResponse(
        {
          code: 'VALIDATION_ERROR',
          message: 'currentPassword is required',
        },
        { status: 400, requestMeta }
      );
    }

    assertCsrfRequest(request);

    const authContext = await requirePolicySession(request, AUTH_ROUTE_POLICY_KEYS.PASSWORD_CHANGE_COMPLETE);

    userId = authContext.userId;
    sessionJti = authContext.sessionJti || null;
    email = normalizeEmail(authContext.email);
    assertRecentReauth(request, {
      sessionJti,
      userId,
    });
    assertPasswordProviderLinked(authContext.userRecord);

    const stepUp = assertStepUp(request, {
      purpose: 'password-change',
      userId,
    });
    challengeJti = stepUp?.challengeJti || null;

    await enforceAuthRateLimit(AUTH_RATE_LIMIT_POLICY_KEYS.PASSWORD_CHANGE_COMPLETE, {
      dimensionValues: {
        device: requestContext.deviceId,
        ip: requestContext.ipAddress,
        user: userId,
      },
    });

    await verifyPasswordWithIdentityToolkit({
      email,
      password: currentPassword,
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
      eventType: 'password-change',
      status: 'success',
      userId,
      email,
      provider: 'password',
      requestId: requestMeta.requestId,
      sessionJti,
      outcome: 'completed',
      metadata: {
        action: 'password-change-complete',
        challengeJti,
        csrfValid: true,
        sessionJti,
        source: ACTION_SOURCES[ACCOUNT_ACTIONS.CHANGE_PASSWORD],
        stepUpPurpose: 'password-change',
      },
    }).catch((auditError) => {
      console.error('[AuthAudit] password-change success log failed:', auditError);
    });

    const response = createApiSuccessResponse(
      {
        messageCode: 'PASSWORD_CHANGED',
        nextAction: 'signed_out',
      },
      {
        code: 'PASSWORD_CHANGED',
        legacyPayload: {
          ok: true,
          nextAction: 'signed_out',
          messageCode: 'PASSWORD_CHANGED',
        },
        requestMeta: {
          ...requestMeta,
          sessionId: sessionJti,
          userId,
        },
      }
    );
    clearAuthCookies(response, request);
    clearRecentReauthCookie(response);
    clearStepUpCookie(response);
    return response;
  } catch (error) {
    const message = String(error?.message || 'Password could not be changed');
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
                message.includes('Authentication token has been revoked') ||
                message.includes('Recent authentication is required')
              ? 401
              : message.includes('required') ||
                  message.includes('invalid') ||
                  message.includes('incorrect') ||
                  message.includes('disabled') ||
                  message.includes('verification') ||
                  message.includes('must contain') ||
                  message.includes('at least')
                ? 400
                : 500;

    await writeAuthAuditLog({
      request,
      eventType: 'password-change',
      status: status === 429 ? 'blocked' : 'failure',
      userId,
      email,
      provider: 'password',
      requestId: requestMeta.requestId,
      sessionJti,
      outcome: status === 429 ? 'blocked' : 'failed',
      metadata: {
        action: 'password-change-complete',
        challengeJti,
        csrfValid: !message.includes('Invalid CSRF token'),
        message,
        sessionJti,
        source: ACTION_SOURCES[ACCOUNT_ACTIONS.CHANGE_PASSWORD],
        status,
        stepUpPurpose: 'password-change',
      },
    }).catch((auditError) => {
      console.error('[AuthAudit] password-change failure log failed:', auditError);
    });

    await writeAuthAuditLog({
      request,
      eventType: 'failed-attempt',
      status: status === 429 ? 'blocked' : 'failure',
      userId,
      email,
      provider: 'password',
      requestId: requestMeta.requestId,
      sessionJti,
      outcome: status === 429 ? 'blocked' : 'failed',
      metadata: {
        action: 'password-change-complete',
        challengeJti,
        csrfValid: !message.includes('Invalid CSRF token'),
        message,
        sessionJti,
        source: ACTION_SOURCES[ACCOUNT_ACTIONS.CHANGE_PASSWORD],
        status,
        stepUpPurpose: 'password-change',
      },
    }).catch((auditError) => {
      console.error('[AuthAudit] failed-attempt password-change log failed:', auditError);
    });

    return createApiErrorResponse(
      {
        code: status === 429 ? 'RATE_LIMITED' : 'PASSWORD_CHANGE_FAILED',
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
