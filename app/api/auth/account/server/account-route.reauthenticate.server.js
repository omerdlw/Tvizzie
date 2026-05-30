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

export async function handleReauthenticate(request, body) {
  try {
    const currentPassword = normalizePassword(body?.currentPassword);

    if (!currentPassword) {
      return NextResponse.json({ error: 'currentPassword is required' }, { status: 400 });
    }

    assertCsrfRequest(request);

    const authContext = await requireSessionRequest(request, {
      allowBearerFallback: true,
    });

    assertPasswordProviderLinked(authContext.userRecord);

    await verifyPasswordWithIdentityToolkit({
      email: normalizeEmail(authContext.email),
      password: currentPassword,
    });

    const response = NextResponse.json({
      ok: true,
      verifiedAt: new Date().toISOString(),
    });

    setRecentReauthCookie(
      response,
      createRecentReauthToken({
        email: authContext.email,
        sessionJti: authContext.sessionJti,
        userId: authContext.userId,
      })
    );

    return response;
  } catch (error) {
    const message = String(error?.message || 'Reauthentication failed');
    const status = message.includes('Invalid CSRF token')
      ? 403
      : message.includes('Authentication session is required') ||
          message.includes('Invalid or expired authentication token') ||
          message.includes('Authentication token has been revoked')
        ? 401
        : message.includes('required') ||
            message.includes('incorrect') ||
            message.includes('disabled') ||
            message.includes('email/password sign-in enabled')
          ? 400
          : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
