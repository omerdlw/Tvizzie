import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

import { requireSessionRequest } from '@/core/auth/servers/session/authenticated-request.server';
import { assertCsrfRequest } from '@/core/auth/servers/security/csrf.server';
import {
  PURPOSES,
  assertVerificationPurpose,
  verifyEmailVerificationChallenge,
} from '@/core/auth/servers/verification/email-verification.server';
import {
  assertPendingSignIn,
  clearPendingSignInCookie,
  setTrustedLoginDeviceCookie,
} from '@/core/auth/servers/verification/login-verification.server';
import { createPasswordResetProofToken } from '@/core/auth/servers/verification/password-reset-proof.server';
import { createSignUpProofToken } from '@/core/auth/servers/verification/signup-proof.server';
import { applySessionCookies, createCsrfToken } from '@/core/auth/servers/session/session.server';
import { getRequestContext, setDeviceIdCookie } from '@/core/auth/servers/session/request-context.server';
import { assertRecentReauth } from '@/core/auth/servers/security/recent-reauth.server';
import { createStepUpToken, setStepUpCookie } from '@/core/auth/servers/security/step-up.server';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/core/clients/supabase/constants';

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
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

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const requestContext = getRequestContext(request);
    const challengeToken = String(body?.challengeToken || '').trim();
    const code = String(body?.code || '').trim();
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
