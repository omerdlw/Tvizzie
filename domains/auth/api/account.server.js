'use server';

import { normalizeEmailValue, normalizeValue } from '@/shared/utils';
import { resolvePrimaryProvider } from '@/domains/auth/utils';

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
        const oauthProvider = !lookup.supportsPasswordAuth
          ? resolvePrimaryProvider(lookup.providerIds)
          : null;

        return {
          success: false,
          code: oauthProvider
            ? 'OAUTH_ACCOUNT_ALREADY_REGISTERED'
            : 'AUTH_ACCOUNT_ALREADY_REGISTERED',
          data: {
            email: normEmail,
            needsPasswordSetup: Boolean(oauthProvider),
            provider: oauthProvider,
          },
          error: oauthProvider
            ? `This email is already registered with ${oauthProvider}. Continue with ${oauthProvider} sign-in, then set a password from Account Settings.`
            : 'This email is already registered',
        };
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
