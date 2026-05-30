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
  createStatusPayload,
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

export async function handlePasswordStatus(request, body) {
  const requestContext = getRequestContext(request);

  try {
    const identifier = normalizeValue(body?.identifier || body?.email);
    const emailInput = normalizeValue(body?.email);
    const intent = normalizeIntent(body?.intent);
    const lookupTarget = intent === INTENTS.SIGN_UP ? emailInput : identifier;

    await enforceSlidingWindowRateLimit({
      namespace: `auth:account:password-status:${intent}`,
      windowMs: 15 * 60 * 1000,
      dimensions: [
        { id: 'identifier', value: lookupTarget, limit: 10 },
        { id: 'ip', value: requestContext.ipAddress || 'unknown', limit: 40 },
        { id: 'device', value: requestContext.deviceId || 'unknown', limit: 25 },
      ],
      message: 'Too many account lookup requests',
    });

    let resolvedEmail = emailInput;

    if (intent !== INTENTS.SIGN_UP) {
      try {
        resolvedEmail = (await resolvePasswordAccountIdentifier(identifier)).email;
      } catch (error) {
        if (normalizeValue(error?.code) === 'auth/user-not-found') {
          const resolvedError = resolveLookupError(intent, 'auth/user-not-found');

          return NextResponse.json(
            {
              ...createStatusPayload({
                email: null,
                lookup: null,
                accountExists: false,
                accountState: null,
                passwordEnabled: false,
                allowedIntent: resolvedError.allowedIntent,
                messageCode: resolvedError.messageCode,
              }),
              code: resolvedError.messageCode,
              email: null,
              error: resolvedError.error,
            },
            { status: resolvedError.status }
          );
        }

        throw error;
      }
    }

    const lookup =
      intent === INTENTS.SIGN_UP
        ? null
        : await lookupPasswordAccountByEmail(resolvedEmail, {
            requireProfile: intent === INTENTS.PASSWORD_RESET,
          });

    if (intent === INTENTS.SIGN_UP) {
      const accountState = await resolveEmailAccountState(resolvedEmail);

      if (accountState.state === EMAIL_ACCOUNT_STATES.EXISTING_GOOGLE_ONLY) {
        return NextResponse.json(
          {
            ...createStatusPayload({
              accountExists: true,
              accountState: accountState.state,
              email: accountState.email,
              lookup: accountState.lookup,
              passwordEnabled: false,
              allowedIntent: 'google-sign-in',
              messageCode: 'GOOGLE_ACCOUNT_EXISTS',
            }),
            code: 'SIGNUP_GOOGLE_ACCOUNT_EXISTS',
            error: 'This email is already used by a Google-linked Tvizzie account. Continue with Google to sign in.',
          },
          { status: 409 }
        );
      }

      if (accountState.state === EMAIL_ACCOUNT_STATES.EXISTING_PASSWORD_ACCOUNT) {
        return NextResponse.json(
          {
            ...createStatusPayload({
              accountExists: true,
              accountState: accountState.state,
              email: accountState.email,
              lookup: accountState.lookup,
              passwordEnabled: true,
              allowedIntent: INTENTS.SIGN_IN,
              messageCode: 'EMAIL_IN_USE',
            }),
            code: 'SIGNUP_EMAIL_IN_USE',
            error: 'This email address is already in use. Sign in instead.',
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        createStatusPayload({
          email: accountState.email,
          lookup: accountState.lookup,
          accountExists: accountState.state === EMAIL_ACCOUNT_STATES.RECOVERABLE_PASSWORD_ORPHAN,
          accountState: accountState.state,
          passwordEnabled: accountState.state === EMAIL_ACCOUNT_STATES.RECOVERABLE_PASSWORD_ORPHAN,
          allowedIntent: INTENTS.SIGN_UP,
          messageCode:
            accountState.state === EMAIL_ACCOUNT_STATES.RECOVERABLE_PASSWORD_ORPHAN
              ? 'SIGNUP_RECOVERY_ALLOWED'
              : 'SIGNUP_ALLOWED',
          signInMethods:
            accountState.state === EMAIL_ACCOUNT_STATES.RECOVERABLE_PASSWORD_ORPHAN
              ? accountState.lookup?.signInMethods
              : [],
        })
      );
    }

    if (!lookup.eligible) {
      const resolvedError = resolveLookupError(intent, lookup.code);

      return NextResponse.json(
        {
          ...createStatusPayload({
            email: lookup.email,
            lookup,
            accountExists: Boolean(lookup.exists),
            accountState: null,
            passwordEnabled: Boolean(lookup.supportsPasswordAuth),
            allowedIntent: resolvedError.allowedIntent,
            messageCode: resolvedError.messageCode,
          }),
          code: resolvedError.messageCode,
          email: lookup.email,
          error: resolvedError.error,
        },
        { status: resolvedError.status }
      );
    }

    return NextResponse.json(
      createStatusPayload({
        email: lookup.email,
        lookup,
        accountExists: Boolean(lookup.exists),
        accountState: null,
        passwordEnabled: Boolean(lookup.supportsPasswordAuth),
        allowedIntent: intent === INTENTS.PASSWORD_RESET ? INTENTS.PASSWORD_RESET : INTENTS.SIGN_IN,
        messageCode: intent === INTENTS.PASSWORD_RESET ? 'PASSWORD_RESET_ALLOWED' : 'SIGNIN_ALLOWED',
      })
    );
  } catch (error) {
    const message = String(error?.message || 'Account status could not be resolved');
    const status = isSlidingWindowRateLimitError(error)
      ? 429
      : message.includes('Enter a valid email address') || message.includes('Username or email is required')
        ? 400
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
