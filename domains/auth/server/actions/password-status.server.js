'use server';

import { normalizeEmailValue, normalizeValue } from '@/shared/utils';
import { resolvePrimaryProvider } from '@/domains/auth/utils';
import {
  lookupAccountByEmail,
  lookupPasswordAccountByEmail,
  resolvePasswordAccountIdentifier,
} from '../verification.server';

export async function getPasswordAccountStatus({ email, identifier, intent } = {}) {
  try {
    const normalizedIntent = normalizeValue(intent);

    if (normalizedIntent === 'sign-up') {
      const normalizedEmail = normalizeEmailValue(email);
      if (!normalizedEmail) return { success: false, error: 'Email is required' };

      const account = await lookupAccountByEmail(normalizedEmail);
      if (!account.exists) return { success: true };

      const provider = account.supportsPasswordAuth
        ? null
        : resolvePrimaryProvider(account.providerIds);
      return {
        success: false,
        code: provider ? 'OAUTH_ACCOUNT_ALREADY_REGISTERED' : 'AUTH_ACCOUNT_ALREADY_REGISTERED',
        data: {
          email: normalizedEmail,
          needsPasswordSetup: Boolean(provider),
          provider,
        },
        error: provider
          ? `This email is already registered with ${provider}. Continue with ${provider} sign-in, then set a password from Account Settings.`
          : 'This email is already registered',
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
