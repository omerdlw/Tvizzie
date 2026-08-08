'use server';

import { normalizeEmailValue, normalizeValue } from '@/shared/utils';

import {
  lookupAccountByEmail,
  lookupPasswordAccountByEmail,
  resolvePasswordAccountIdentifier,
} from '../server/verification.server';

export async function getPasswordStatusServer({ email, identifier, intent } = {}) {
  try {
    const normIntent = normalizeValue(intent);

    if (normIntent === 'sign-up') {
      if (!email) {
        return { success: false, error: 'Email is required' };
      }
      const normEmail = normalizeEmailValue(email);
      const lookup = await lookupAccountByEmail(normEmail);
      if (lookup.exists) {
        return { success: false, error: 'This email is already registered' };
      }
      return { success: true };
    }

    if (normIntent === 'password-reset') {
      if (!identifier) {
        return { success: false, error: 'Email or username is required' };
      }
      let resolvedEmail = null;
      try {
        const resolved = await resolvePasswordAccountIdentifier(identifier);
        resolvedEmail = resolved.email;
      } catch (err) {
        return { success: false, error: err.message || 'No account found' };
      }

      const lookup = await lookupPasswordAccountByEmail(resolvedEmail);
      if (!lookup.exists) {
        return { success: false, error: 'No account found with this email' };
      }
      if (!lookup.supportsPasswordAuth) {
        return { success: false, error: 'This account does not support password sign-in' };
      }

      return { success: true, email: resolvedEmail };
    }

    return { success: true, passwordEnabled: true };
  } catch (error) {
    return { success: false, error: error.message || 'Status check failed' };
  }
}
