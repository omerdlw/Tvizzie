import { NextResponse } from 'next/server';

import { hasPasswordProvider } from '@/core/auth/servers/account/account-deletion.server';
import { writeAuthAuditLog } from '@/core/auth/servers/audit/audit-log.server';
import { requireSessionRequest } from '@/core/auth/servers/session/authenticated-request.server';
import { assertCsrfRequest } from '@/core/auth/servers/security/csrf.server';
import { sendVerificationCodeEmail } from '@/core/auth/servers/verification/email-sender.server';
import { EMAIL_ACCOUNT_STATES, resolveEmailAccountState } from '@/core/auth/servers/account/account-state.server';
import {
  PURPOSES,
  assertVerificationPurpose,
  createEmailVerificationChallenge,
} from '@/core/auth/servers/verification/email-verification.server';
import { assertPendingSignIn } from '@/core/auth/servers/verification/login-verification.server';
import {
  lookupAccountByEmail,
  lookupPasswordAccountByEmail,
} from '@/core/auth/servers/verification/password-account.server';
import { getRequestContext } from '@/core/auth/servers/session/request-context.server';
import { assertRecentReauth } from '@/core/auth/servers/security/recent-reauth.server';

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

export async function POST(request) {
  const requestContext = getRequestContext(request);
  let email = null;
  let purpose = PURPOSES.SIGN_UP;
  let userId = null;

  try {
    const body = await request.json().catch(() => ({}));
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
        const pendingSignIn = assertPendingSignIn(request, {
          deviceHash: requestContext.deviceHash,
          email: body?.email,
        });

        email = pendingSignIn.email;
        userId = pendingSignIn.userId;
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

    return NextResponse.json(normalizeSuccessPayload(challenge));
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
        action: 'verification-send-code',
        csrfValid: !message.includes('Invalid CSRF token'),
        message,
        purpose,
        source: 'api/auth/verification/send-code',
        status,
      },
    }).catch((auditError) => {
      console.error('[AuthAudit] send-code failed-attempt log failed:', auditError);
    });

    return NextResponse.json({ error: message }, { status });
  }
}
