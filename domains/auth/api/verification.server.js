'use server';

import { normalizeEmailValue, normalizeValue } from '@/shared/utils';
import { requestVerificationCode, verifyCodeRequest } from '../server/verification.server';

export async function requestVerificationCodeServer({ email, purpose = 'sign-in' }) {
  try {
    const normEmail = normalizeEmailValue(email);
    const result = await requestVerificationCode({ email: normEmail, purpose });
    return { success: true, ...result };
  } catch (error) {
    return { success: false, error: error.message || 'Verification code request failed' };
  }
}

export async function verifyCodeServer({ code, email, purpose = 'sign-in' }) {
  try {
    const normEmail = normalizeEmailValue(email);
    const normCode = normalizeValue(code);
    const verified = await verifyCodeRequest({ code: normCode, email: normEmail, purpose });
    return { success: true, ...verified };
  } catch (error) {
    return { success: false, error: error.message || 'Verification failed' };
  }
}
