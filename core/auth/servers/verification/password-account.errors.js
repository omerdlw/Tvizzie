import { normalizeValue } from '@/core/utils/string';

export const PASSWORD_ACCOUNT_LOOKUP_CODES = Object.freeze({
  PASSWORD_RESET_UNAVAILABLE: 'auth/password-reset-unavailable',
  PASSWORD_SIGN_IN_DISABLED: 'auth/password-sign-in-disabled',
  USER_NOT_FOUND: 'auth/user-not-found',
});

export function normalizePasswordAccountLookupCode(value) {
  return normalizeValue(value);
}

export function isPasswordAccountUserNotFoundError(error) {
  return normalizePasswordAccountLookupCode(error?.code) === PASSWORD_ACCOUNT_LOOKUP_CODES.USER_NOT_FOUND;
}

export function throwSignInLookupError(code) {
  const normalizedCode = normalizePasswordAccountLookupCode(code);

  if (normalizedCode === PASSWORD_ACCOUNT_LOOKUP_CODES.USER_NOT_FOUND) {
    const error = new Error('Invalid login credentials');
    error.code = 'invalid_login_credentials';
    throw error;
  }

  if (normalizedCode === PASSWORD_ACCOUNT_LOOKUP_CODES.PASSWORD_SIGN_IN_DISABLED) {
    throw new Error('This account does not have email/password sign-in enabled');
  }

  throw new Error('Sign in failed');
}

export function throwPasswordResetLookupError(code) {
  const normalizedCode = normalizePasswordAccountLookupCode(code);

  if (normalizedCode === PASSWORD_ACCOUNT_LOOKUP_CODES.USER_NOT_FOUND) {
    throw new Error('No account was found with this email address');
  }

  if (
    normalizedCode === PASSWORD_ACCOUNT_LOOKUP_CODES.PASSWORD_SIGN_IN_DISABLED ||
    normalizedCode === PASSWORD_ACCOUNT_LOOKUP_CODES.PASSWORD_RESET_UNAVAILABLE
  ) {
    throw new Error('Password reset is not available for this account');
  }

  throw new Error('Password reset could not be started');
}
