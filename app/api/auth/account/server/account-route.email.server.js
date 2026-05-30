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

export async function handleChangeEmail(request, body) {
  const requestContext = getRequestContext(request);
  const requestMeta = buildRequestMeta(request, ACCOUNT_ACTIONS.CHANGE_EMAIL);
  let userId = null;
  let previousEmail = null;
  let nextEmail = null;
  let challengeJti = null;
  let sessionJti = null;
  let serverSessionRevocationFailed = false;

  try {
    nextEmail = normalizeEmail(body?.email || body?.newEmail);

    if (!nextEmail || !EMAIL_PATTERN.test(nextEmail)) {
      return createApiErrorResponse(
        {
          code: 'VALIDATION_ERROR',
          message: 'email must be a valid email address',
        },
        { status: 400, requestMeta }
      );
    }

    assertCsrfRequest(request);

    const authContext = await requirePolicySession(request, AUTH_ROUTE_POLICY_KEYS.EMAIL_CHANGE_COMPLETE);

    userId = authContext.userId;
    sessionJti = authContext.sessionJti || null;
    previousEmail = normalizeEmail(authContext.email);
    assertRecentReauth(request, {
      sessionJti,
      userId,
    });
    const stepUp = assertStepUp(request, {
      email: nextEmail,
      purpose: 'email-change',
      userId,
    });
    challengeJti = stepUp?.challengeJti || null;

    if (nextEmail === previousEmail) {
      return createApiErrorResponse(
        {
          code: 'VALIDATION_ERROR',
          message: 'New email must be different from current email',
        },
        {
          requestMeta: {
            ...requestMeta,
            sessionId: sessionJti,
            userId,
          },
          status: 400,
        }
      );
    }

    await enforceAuthRateLimit(AUTH_RATE_LIMIT_POLICY_KEYS.EMAIL_CHANGE_COMPLETE, {
      dimensionValues: {
        device: requestContext.deviceId,
        ip: requestContext.ipAddress,
        user: userId,
      },
    });

    await assertEmailAvailable(authContext.adminAuth, nextEmail);

    let emailUpdated = false;

    try {
      await authContext.adminAuth.updateUser(userId, {
        email: nextEmail,
        emailVerified: true,
      });
      emailUpdated = true;

      await syncProfileEmail({
        userId,
        email: nextEmail,
        request,
        requestMeta: {
          ...requestMeta,
          sessionId: sessionJti,
          userId,
        },
      });
    } catch (mutationError) {
      if (emailUpdated) {
        await rollbackEmailChange({
          adminAuth: authContext.adminAuth,
          previousEmail,
          request,
          requestMeta: {
            ...requestMeta,
            sessionId: sessionJti,
            userId,
          },
          userId,
        }).catch((rollbackError) => {
          console.error('[Auth] email-change rollback failed:', rollbackError);
        });
      }

      throw mutationError;
    }

    try {
      await signOutAuthSession(authContext.accessToken, 'local');
    } catch (sessionError) {
      serverSessionRevocationFailed = true;
      console.error('[Auth] email-change session sign-out failed:', sessionError);
    }

    await writeAuthAuditLog({
      request,
      eventType: 'email-change',
      status: 'success',
      userId,
      email: nextEmail,
      provider: 'password',
      requestId: requestMeta.requestId,
      sessionJti,
      outcome: 'completed',
      metadata: {
        action: 'email-change-complete',
        challengeJti,
        googleProviderCleanupRequired: false,
        googleProviderDetached: false,
        googleProviderEmailMismatch: false,
        googleProviderEmail: null,
        previousEmail,
        sessionJti,
        serverSessionRevocationFailed,
        source: ACTION_SOURCES[ACCOUNT_ACTIONS.CHANGE_EMAIL],
      },
    }).catch((auditError) => {
      console.error('[AuthAudit] email-change success log failed:', auditError);
    });

    const response = createApiSuccessResponse(
      {
        email: nextEmail,
        messageCode: 'EMAIL_CHANGED',
        nextAction: 'signed_out',
      },
      {
        code: 'EMAIL_CHANGED',
        legacyPayload: {
          ok: true,
          nextAction: 'signed_out',
          messageCode: 'EMAIL_CHANGED',
          email: nextEmail,
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
    const message = String(error?.message || 'Email could not be changed');
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
              : message.includes('already in use')
                ? 409
                : message.includes('required') ||
                    message.includes('invalid') ||
                    message.includes('valid email') ||
                    message.includes('verification') ||
                    message.includes('different from current')
                  ? 400
                  : 500;

    await writeAuthAuditLog({
      request,
      eventType: 'email-change',
      status: status === 429 ? 'blocked' : 'failure',
      userId,
      email: nextEmail || previousEmail,
      provider: 'password',
      requestId: requestMeta.requestId,
      sessionJti,
      outcome: status === 429 ? 'blocked' : 'failed',
      metadata: {
        action: 'email-change-complete',
        challengeJti,
        csrfValid: !message.includes('Invalid CSRF token'),
        message,
        sessionJti,
        source: ACTION_SOURCES[ACCOUNT_ACTIONS.CHANGE_EMAIL],
        status,
        stepUpPurpose: 'email-change',
      },
    }).catch((auditError) => {
      console.error('[AuthAudit] email-change failure log failed:', auditError);
    });

    await writeAuthAuditLog({
      request,
      eventType: 'failed-attempt',
      status: status === 429 ? 'blocked' : 'failure',
      userId,
      email: nextEmail || previousEmail,
      provider: 'password',
      requestId: requestMeta.requestId,
      sessionJti,
      outcome: status === 429 ? 'blocked' : 'failed',
      metadata: {
        action: 'email-change-complete',
        challengeJti,
        csrfValid: !message.includes('Invalid CSRF token'),
        message,
        sessionJti,
        source: ACTION_SOURCES[ACCOUNT_ACTIONS.CHANGE_EMAIL],
        status,
        stepUpPurpose: 'email-change',
      },
    }).catch((auditError) => {
      console.error('[AuthAudit] failed-attempt email-change log failed:', auditError);
    });

    return createApiErrorResponse(
      {
        code: status === 429 ? 'RATE_LIMITED' : 'EMAIL_CHANGE_FAILED',
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
