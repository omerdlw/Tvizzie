import { NextResponse } from 'next/server';

import {
  enforceSlidingWindowRateLimit,
  isSlidingWindowRateLimitError,
} from '@/core/auth/servers/security/rate-limit.server';
import { EMAIL_ACCOUNT_STATES, resolveEmailAccountState } from '@/core/auth/servers/account/account-state.server';
import { getRequestContext } from '@/core/auth/servers/session/request-context.server';
import {
  lookupPasswordAccountByEmail,
  resolvePasswordAccountIdentifier,
} from '@/core/auth/servers/verification/password-account.server';

const INTENTS = Object.freeze({
  PASSWORD_RESET: 'password-reset',
  SIGN_IN: 'sign-in',
  SIGN_UP: 'sign-up',
});

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeIntent(value) {
  const normalizedIntent = normalizeValue(value).toLowerCase();

  if (Object.values(INTENTS).includes(normalizedIntent)) {
    return normalizedIntent;
  }

  return INTENTS.SIGN_IN;
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

export async function POST(request) {
  const requestContext = getRequestContext(request);

  try {
    const body = await request.json().catch(() => ({}));
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
