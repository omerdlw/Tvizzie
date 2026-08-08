'use server';

import { cookies } from 'next/headers';
import { normalizeEmailValue, normalizeValue } from '@/shared/utils';
import {
  requestVerificationCode,
  verifyCodeRequest,
  verifyPendingSignInToken,
  setTrustedDeviceCookieToCookieStore,
} from '../server/verification.server';
import { createSignUpProofToken, createPasswordResetProofToken } from '../server/proof-tokens.server';
import { applySessionCookiesToCookieStore } from '../server/session.server';
import { PENDING_SIGN_IN_COOKIE_NAME } from '@/domains/auth/utils';

export async function requestVerificationCodeServer({ email, purpose = 'sign-in', forceNew = false }) {
  try {
    const normEmail = normalizeEmailValue(email);
    const result = await requestVerificationCode({ email: normEmail, purpose, forceNew });
    return { success: true, challengeToken: result.challengeKey, ...result };
  } catch (error) {
    return { success: false, error: error.message || 'Verification code request failed' };
  }
}

export async function verifyCodeServer({ code, email, purpose = 'sign-in', rememberDevice = false }) {
  try {
    const normEmail = normalizeEmailValue(email);
    const normCode = normalizeValue(code);
    const verified = await verifyCodeRequest({ code: normCode, email: normEmail, purpose });
    
    const result = { success: true, ...verified };
    const normPurpose = String(purpose || '').trim().toLowerCase();
    
    if (normPurpose === 'sign-up') {
      result.signUpProof = createSignUpProofToken({
        challengeJti: verified.challengeJti,
        challengeKey: verified.challengeKey,
        email: verified.email,
        userId: verified.userId,
      });
    } else if (normPurpose === 'password-reset') {
      result.passwordResetProof = createPasswordResetProofToken({
        challengeJti: verified.challengeJti,
        challengeKey: verified.challengeKey,
        email: verified.email,
        userId: verified.userId,
      });
    } else if (normPurpose === 'sign-in') {
      const cookieStore = await cookies();
      const pendingToken = cookieStore.get(PENDING_SIGN_IN_COOKIE_NAME)?.value;
      if (!pendingToken) {
        throw new Error('Verification session has expired or is invalid. Please sign in again.');
      }

      const pending = verifyPendingSignInToken(pendingToken);
      const pendingEmail = normalizeEmailValue(pending.email);
      if (pendingEmail !== normEmail) {
        throw new Error(`Verification session does not match (session: ${pendingEmail}, target: ${normEmail})`);
      }

      // Apply actual session cookies
      applySessionCookiesToCookieStore(cookieStore, {
        accessToken: pending.accessToken,
        refreshToken: pending.refreshToken,
      });

      // Clear pending sign-in cookie
      cookieStore.set(PENDING_SIGN_IN_COOKIE_NAME, '', {
        path: '/',
        maxAge: 0,
      });

      // Set trusted device cookie if requested
      if (rememberDevice) {
        setTrustedDeviceCookieToCookieStore(cookieStore, {
          userId: pending.userId,
          deviceId: pending.deviceHash,
        });
      }

      result.session = {
        access_token: pending.accessToken,
        refresh_token: pending.refreshToken,
        user: pending.user,
      };
    }
    
    return result;
  } catch (error) {
    return { success: false, error: error.message || 'Verification failed' };
  }
}
