import { NextResponse } from 'next/server';

import {
  EMAIL_ACCOUNT_STATES,
  hasPasswordProvider,
  resolveEmailAccountState,
} from '@/core/auth/servers/account.js';
import { writeAuthAuditLog } from '@/core/auth/servers/audit.js';
import {
  assertCsrfRequest,
  assertRecentReauth,
  createStepUpToken,
  setStepUpCookie,
} from '@/core/auth/servers/security.js';
import {
  applySessionCookies,
  createCsrfToken,
  getRequestContext,
  requireSessionRequest,
  setDeviceIdCookie,
} from '@/core/auth/servers/session.js';

import {
  PURPOSES,
  VERIFICATION_ACTIONS,
  assertPendingSignIn,
  assertVerificationPurpose,
  clearPendingSignInCookie,
  createEmailVerificationChallenge,
  createPasswordResetProofToken,
  createPendingSignInToken,
  createSignUpProofToken,
  isPasswordAccountUserNotFoundError,
  isSecureVerificationPurpose,
  lookupAccountByEmail,
  lookupPasswordAccountByEmail,
  mapVerificationResendErrorStatus,
  mapVerificationVerifyErrorStatus,
  normalizeEmail as normalizeVerificationEmail,
  normalizeVerificationAction,
  resolvePasswordAccountIdentifier,
  sendVerificationCodeEmail,
  setPendingSignInCookie,
  setTrustedLoginDeviceCookie,
  throwPasswordResetLookupError,
  validateAllowedEmailDomain,
  verifyEmailVerificationChallenge,
} from '@/core/auth/servers/verification.js';
import { createSupabaseResponseClient } from '@/core/clients/supabase/response-client.server';
import { normalizeValue } from '@/core/utils/string';

function normalizeSuccessPayload(challenge) {
  return {
    challengeToken: challenge.challengeToken,
    expiresAt: challenge.expiresAt,
    resendAvailableAt: challenge.resendAvailableAt,
  };
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
    if (isPasswordAccountUserNotFoundError(error)) {
      throwPasswordResetLookupError('auth/user-not-found');
    }

    throw error;
  }
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

    if (isSecureVerificationPurpose(purpose)) {
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
        email = normalizeVerificationEmail(authContext.email);
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
          throwPasswordResetLookupError(lookup.code);
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
    const status = mapVerificationResendErrorStatus(message);

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
    const email = normalizeVerificationEmail(body?.email);
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

    if (isSecureVerificationPurpose(purpose)) {
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
      const supabase = createSupabaseResponseClient(request, response);
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

    if (isSecureVerificationPurpose(purpose)) {
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
    const status = mapVerificationVerifyErrorStatus(message);

    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const action = normalizeVerificationAction(body?.action);

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
