import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

import { hasPasswordProvider } from '@/core/auth/servers/account.js';
import { EMAIL_ACCOUNT_STATES, resolveEmailAccountState } from '@/core/auth/servers/account.js';
import { writeAuthAuditLog } from '@/core/auth/servers/audit.js';
import { requireSessionRequest } from '@/core/auth/servers/session.js';
import { getRequestContext, setDeviceIdCookie } from '@/core/auth/servers/session.js';
import { applySessionCookies, createCsrfToken } from '@/core/auth/servers/session.js';
import { assertCsrfRequest } from '@/core/auth/servers/security.js';
import { assertRecentReauth } from '@/core/auth/servers/security.js';
import { createStepUpToken, setStepUpCookie } from '@/core/auth/servers/security.js';
import { sendVerificationCodeEmail } from '@/core/auth/servers/verification.js';
import {
  PURPOSES,
  assertVerificationPurpose,
  createEmailVerificationChallenge,
  verifyEmailVerificationChallenge,
} from '@/core/auth/servers/verification.js';
import {
  assertPendingSignIn,
  clearPendingSignInCookie,
  createPendingSignInToken,
  setPendingSignInCookie,
  setTrustedLoginDeviceCookie,
} from '@/core/auth/servers/verification.js';
import { createPasswordResetProofToken } from '@/core/auth/servers/verification.js';
import {
  lookupAccountByEmail,
  lookupPasswordAccountByEmail,
  resolvePasswordAccountIdentifier,
} from '@/core/auth/servers/verification.js';
import { createSignUpProofToken } from '@/core/auth/servers/verification.js';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/core/clients/supabase/constants';

const VERIFICATION_ACTIONS = Object.freeze({
  RESEND: 'resend',
  VERIFY: 'verify',
});

const ACTION_ALIASES = Object.freeze({
  'send-code': VERIFICATION_ACTIONS.RESEND,
  'verify-code': VERIFICATION_ACTIONS.VERIFY,
});

const EMAIL_DOMAIN_PATTERNS = [
  /^gmail\.com$/i,
  /^outlook\.[a-z.]+$/i,
  /^hotmail\.[a-z.]+$/i,
  /^yandex\.[a-z.]+$/i,
  /^yahoo\.[a-z.]+$/i,
  /^protonmail\.[a-z.]+$/i,
  /^icloud\.com$/i,
];

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeAction(value) {
  const normalizedAction = normalizeValue(value).toLowerCase();

  return ACTION_ALIASES[normalizedAction] || normalizedAction;
}

function normalizeEmail(value) {
  return normalizeValue(value).toLowerCase();
}

function validateAllowedEmailDomain(value) {
  const email = normalizeEmail(value);
  const [localPart, domain] = email.split('@');

  if (!localPart || !domain) {
    throw new Error('Enter a valid email address');
  }

  const isAllowed = EMAIL_DOMAIN_PATTERNS.some((pattern) => pattern.test(domain));

  if (!isAllowed) {
    throw new Error(
      'Only supported email domains are allowed: gmail, outlook, hotmail, yandex, yahoo, protonmail, icloud'
    );
  }

  return email;
}

function isSecurePurpose(purpose) {
  return (
    purpose === PURPOSES.ACCOUNT_DELETE ||
    purpose === PURPOSES.EMAIL_CHANGE ||
    purpose === PURPOSES.PASSWORD_CHANGE ||
    purpose === PURPOSES.PASSWORD_SET ||
    purpose === PURPOSES.PROVIDER_LINK
  );
}

function normalizeSuccessPayload(challenge) {
  return {
    challengeToken: challenge.challengeToken,
    expiresAt: challenge.expiresAt,
    resendAvailableAt: challenge.resendAvailableAt,
  };
}

function resolvePasswordResetLookupError(code) {
  if (code === 'auth/user-not-found') {
    throw new Error('No account was found with this email address');
  }

  if (code === 'auth/password-sign-in-disabled' || code === 'auth/password-reset-unavailable') {
    throw new Error('Password reset is not available for this account');
  }

  throw new Error('Password reset could not be started');
}

async function resolvePasswordResetEmail(identifier) {
  const normalizedIdentifier = normalizeValue(identifier);

  if (!normalizedIdentifier) {
    throw new Error('Username or email is required');
  }

  if (normalizedIdentifier.includes('@')) {
    return validateAllowedEmailDomain(normalizedIdentifier);
  }

  try {
    return (await resolvePasswordAccountIdentifier(normalizedIdentifier)).email;
  } catch (error) {
    if (normalizeValue(error?.code) === 'auth/user-not-found') {
      resolvePasswordResetLookupError('auth/user-not-found');
    }

    throw error;
  }
}

function createResponseClient(request, response) {
  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });
}

async function handleResend(request, body) {
  const requestContext = getRequestContext(request);
  let email = null;
  let purpose = PURPOSES.SIGN_UP;
  let pendingSignIn = null;
  let userId = null;

  try {
    purpose = assertVerificationPurpose(body?.purpose || PURPOSES.SIGN_UP);
    const forceNew = Boolean(body?.forceNew);
    let dummy = false;

    if (isSecurePurpose(purpose)) {
      assertCsrfRequest(request);

      const authContext = await requireSessionRequest(request, {
        allowBearerFallback: true,
      });

      userId = authContext.userId;

      if (purpose === PURPOSES.EMAIL_CHANGE || purpose === PURPOSES.PASSWORD_CHANGE) {
        assertRecentReauth(request, {
          sessionJti: authContext.sessionJti,
          userId: authContext.userId,
        });
      }

      if (purpose === PURPOSES.EMAIL_CHANGE || purpose === PURPOSES.PASSWORD_CHANGE) {
        if (!hasPasswordProvider(authContext.userRecord)) {
          throw new Error('This account does not have email/password sign-in enabled');
        }
      }

      if (purpose === PURPOSES.PASSWORD_SET && hasPasswordProvider(authContext.userRecord)) {
        throw new Error('Email/password sign-in is already linked to this account');
      }

      if (purpose === PURPOSES.EMAIL_CHANGE) {
        email = validateAllowedEmailDomain(body?.email);

        if (email === authContext.email) {
          throw new Error('New email must be different from current email');
        }

        const lookup = await lookupAccountByEmail(email);

        if (lookup.exists) {
          throw new Error('This email address is already in use');
        }
      } else {
        email = normalizeEmail(authContext.email);
      }
    } else {
      if (purpose === PURPOSES.SIGN_IN) {
        pendingSignIn = assertPendingSignIn(request, {
          deviceHash: requestContext.deviceHash,
          email: body?.email,
        });

        email = pendingSignIn.email;
        userId = pendingSignIn.userId;
      } else if (purpose === PURPOSES.PASSWORD_RESET) {
        email = await resolvePasswordResetEmail(body?.identifier || body?.email);
      } else {
        email = validateAllowedEmailDomain(body?.email);
      }

      if (purpose === PURPOSES.PASSWORD_RESET) {
        const lookup = await lookupPasswordAccountByEmail(email, {
          requireProfile: true,
        });

        if (!lookup.eligible) {
          resolvePasswordResetLookupError(lookup.code);
        }
      } else if (purpose === PURPOSES.SIGN_IN) {
        dummy = false;
      } else if (purpose === PURPOSES.SIGN_UP) {
        const accountState = await resolveEmailAccountState(email);

        if (accountState.state === EMAIL_ACCOUNT_STATES.EXISTING_GOOGLE_ONLY) {
          throw new Error(
            'This email is already used by a Google-linked Tvizzie account. Continue with Google to sign in.'
          );
        }

        if (accountState.state === EMAIL_ACCOUNT_STATES.EXISTING_PASSWORD_ACCOUNT) {
          throw new Error('This email address is already in use');
        }
      }
    }

    const challenge = await createEmailVerificationChallenge({
      deviceId: requestContext.deviceId,
      dummy,
      email,
      forceNew,
      ipAddress: requestContext.ipAddress,
      purpose,
      userId,
    });

    if (!dummy && challenge.code) {
      await sendVerificationCodeEmail({
        code: challenge.code,
        email,
        expiresAt: challenge.expiresAt,
        purpose,
      });
    }

    const response = NextResponse.json(normalizeSuccessPayload(challenge));

    if (purpose === PURPOSES.SIGN_IN && pendingSignIn) {
      setPendingSignInCookie(
        response,
        createPendingSignInToken({
          accessToken: pendingSignIn.accessToken,
          deviceHash: pendingSignIn.deviceHash,
          email: pendingSignIn.email,
          provider: pendingSignIn.provider,
          refreshToken: pendingSignIn.refreshToken,
          user: pendingSignIn.user,
          userId: pendingSignIn.userId,
        })
      );
    }

    return response;
  } catch (error) {
    const message = String(error?.message || 'Could not send verification code');
    const rateLimitError = message.includes('Too many') || message.includes('Please wait');
    const providerConfigError =
      message.includes('SMTP configuration is incomplete') ||
      message.includes('Brevo SMTP configuration is incomplete');
    const providerAuthError = message.includes('Email provider authentication failed');
    const status = rateLimitError
      ? 429
      : providerConfigError || providerAuthError
        ? 502
        : message.includes('Invalid CSRF token')
          ? 403
          : message.includes('Pending sign-in session')
            ? 400
            : message.includes('Authentication session is required') ||
                message.includes('Invalid or expired authentication token') ||
                message.includes('Authentication token has been revoked') ||
                message.includes('Recent authentication is required')
              ? 401
              : message.includes('already in use') || message.includes('already linked to this account')
                ? 409
                : message.includes('required') ||
                    message.includes('Username or email is required') ||
                    message.includes('invalid') ||
                    message.includes('must be') ||
                    message.includes('Unsupported verification purpose') ||
                    message.includes('email/password sign-in enabled') ||
                    message.includes('supported email domains') ||
                    message.includes('Enter a valid email address')
                  ? 400
                  : 500;

    await writeAuthAuditLog({
      request,
      eventType: 'failed-attempt',
      status: status === 429 ? 'blocked' : 'failure',
      email,
      provider: 'password',
      metadata: {
        action: 'verification-resend',
        csrfValid: !message.includes('Invalid CSRF token'),
        message,
        purpose,
        source: 'api/auth/verification',
        status,
      },
    }).catch((auditError) => {
      console.error('[AuthAudit] verification resend failed-attempt log failed:', auditError);
    });

    return NextResponse.json({ error: message }, { status });
  }
}

async function handleVerify(request, body) {
  try {
    const requestContext = getRequestContext(request);
    const challengeToken = normalizeValue(body?.challengeToken);
    const code = normalizeValue(body?.code);
    const email = normalizeEmail(body?.email);
    const rememberDevice = Boolean(body?.rememberDevice);
    const purpose = assertVerificationPurpose(body?.purpose || PURPOSES.SIGN_UP);

    const emailRequired =
      purpose !== PURPOSES.PASSWORD_CHANGE &&
      purpose !== PURPOSES.PASSWORD_SET &&
      purpose !== PURPOSES.ACCOUNT_DELETE &&
      purpose !== PURPOSES.PROVIDER_LINK;

    if (!challengeToken || !code || (emailRequired && !email)) {
      return NextResponse.json({ error: 'challengeToken, email, and code are required' }, { status: 400 });
    }

    let userId = null;
    let verificationEmail = email;
    let pendingSignIn = null;

    if (isSecurePurpose(purpose)) {
      assertCsrfRequest(request);

      const authContext = await requireSessionRequest(request, {
        allowBearerFallback: true,
      });

      userId = authContext.userId;

      if (purpose === PURPOSES.EMAIL_CHANGE || purpose === PURPOSES.PASSWORD_CHANGE) {
        assertRecentReauth(request, {
          sessionJti: authContext.sessionJti,
          userId: authContext.userId,
        });
      }

      if (
        purpose === PURPOSES.PASSWORD_CHANGE ||
        purpose === PURPOSES.PASSWORD_SET ||
        purpose === PURPOSES.ACCOUNT_DELETE ||
        purpose === PURPOSES.PROVIDER_LINK
      ) {
        verificationEmail = authContext.email;
      }
    } else if (purpose === PURPOSES.SIGN_IN) {
      pendingSignIn = assertPendingSignIn(request, {
        deviceHash: requestContext.deviceHash,
        email,
      });
      userId = pendingSignIn.userId;
      verificationEmail = pendingSignIn.email;
    }

    const result = await verifyEmailVerificationChallenge({
      challengeToken,
      code,
      email: verificationEmail,
      purpose,
      userId,
    });

    const responsePayload = {
      success: true,
      verifiedAt: result.verifiedAt,
    };

    if (purpose === PURPOSES.PASSWORD_RESET) {
      responsePayload.passwordResetProof = createPasswordResetProofToken({
        challengeJti: result.challengeJti,
        challengeKey: result.challengeKey,
        email: verificationEmail,
      });
    }

    if (purpose === PURPOSES.SIGN_UP) {
      responsePayload.signUpProof = createSignUpProofToken({
        challengeJti: result.challengeJti,
        challengeKey: result.challengeKey,
        email: verificationEmail,
      });
    }

    if (purpose === PURPOSES.SIGN_IN && pendingSignIn) {
      responsePayload.session = {
        expiresAt: null,
        provider: pendingSignIn.provider || null,
        user: pendingSignIn.user || null,
      };
    }

    const response = NextResponse.json(responsePayload);

    if (purpose === PURPOSES.SIGN_IN && pendingSignIn) {
      const supabase = createResponseClient(request, response);
      const sessionResult = await supabase.auth.refreshSession({
        refresh_token: pendingSignIn.refreshToken,
      });

      if (sessionResult.error || !sessionResult.data?.session?.access_token) {
        throw new Error(sessionResult.error?.message || 'Sign-in session could not be restored');
      }

      applySessionCookies(response, {
        csrfToken: createCsrfToken(),
      });
      setDeviceIdCookie(response, requestContext.deviceId);
      clearPendingSignInCookie(response);

      if (rememberDevice) {
        setTrustedLoginDeviceCookie(response, {
          deviceHash: requestContext.deviceHash,
          userId: pendingSignIn.userId,
        });
      }
    }

    if (isSecurePurpose(purpose)) {
      setStepUpCookie(
        response,
        createStepUpToken({
          challengeJti: result.challengeJti,
          email: verificationEmail,
          purpose,
          userId: userId || result.userId,
        })
      );
    }

    return response;
  } catch (error) {
    const message = String(error?.message || 'Verification failed');
    const status = message.includes('Invalid CSRF token')
      ? 403
      : message.includes('Pending sign-in session')
        ? 400
        : message.includes('Authentication session is required') ||
            message.includes('Invalid or expired authentication token') ||
            message.includes('Authentication token has been revoked') ||
            message.includes('Recent authentication is required')
          ? 401
          : message.includes('required') ||
              message.includes('invalid') ||
              message.includes('expired') ||
              message.includes('Unsupported verification purpose') ||
              message.includes('Verification could not be completed')
            ? 400
            : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const action = normalizeAction(body?.action);

  switch (action) {
    case VERIFICATION_ACTIONS.RESEND:
      return handleResend(request, body);
    case VERIFICATION_ACTIONS.VERIFY:
      return handleVerify(request, body);
    default:
      return NextResponse.json(
        {
          error: action ? `Unsupported verification action: ${action}` : 'action is required',
        },
        { status: 400 }
      );
  }
}
