'use server';

import { normalizeEmailValue, normalizeValue } from '@/domains/shell/shared/utils.js';
import {
  createSignUpEmailAlreadyRegisteredError,
  lookupAccountByEmail,
  lookupPasswordAccountByEmail,
  resolvePasswordAccountIdentifier,
} from './verification.server.js';

export async function getPasswordAccountStatus({ email, identifier, intent } = {}) {
  try {
    const normalizedIntent = normalizeValue(intent);

    if (normalizedIntent === 'sign-up') {
      const normalizedEmail = normalizeEmailValue(email);
      if (!normalizedEmail) return { success: false, error: 'Email is required' };

      const account = await lookupAccountByEmail(normalizedEmail);
      if (!account.exists) return { success: true };

      const error = createSignUpEmailAlreadyRegisteredError(account);
      return {
        success: false,
        code: error.code,
        data: error.data,
        error: error.message,
      };
    }

    if (normalizedIntent !== 'password-reset') {
      return { success: true, passwordEnabled: true };
    }

    if (!identifier) return { success: false, error: 'Email or username is required' };

    let resolvedEmail;
    try {
      resolvedEmail = (await resolvePasswordAccountIdentifier(identifier)).email;
    } catch (error) {
      return { success: false, error: error.message || 'No account found' };
    }

    const account = await lookupPasswordAccountByEmail(resolvedEmail);
    if (!account.exists) return { success: false, error: 'No account found with this email' };
    if (!account.supportsPasswordAuth) {
      return { success: false, error: 'This account does not support password sign-in' };
    }

    return { success: true, email: resolvedEmail };
  } catch (error) {
    return { success: false, error: error.message || 'Status check failed' };
  }
}
