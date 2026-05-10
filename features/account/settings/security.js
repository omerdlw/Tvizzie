import { createCsrfHeaders } from '@/core/auth/clients/csrf.client';
import { validatePasswordRules } from '@/core/auth/password-validation';

export const AUTH_PURPOSE = {
  ACCOUNT_DELETE: 'account-delete',
  EMAIL_CHANGE: 'email-change',
  PASSWORD_CHANGE: 'password-change',
  PASSWORD_SET: 'password-set',
  PROVIDER_LINK: 'provider-link',
};

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const INITIAL_EMAIL_FLOW = {
  currentPassword: '',
  isSubmitting: false,
  newEmail: '',
};

export const INITIAL_PASSWORD_FLOW = {
  confirmPassword: '',
  currentPassword: '',
  isSubmitting: false,
  newPassword: '',
};

export const INITIAL_DELETE_FLOW = {
  confirmText: '',
  currentPassword: '',
  isSubmitting: false,
};

export function resolveSecurityErrorMessage(error, fallbackMessage) {
  const message = String(error?.message || '').trim();
  const code = String(error?.code || '').trim();

  if (
    code === 'auth/wrong-password' ||
    code === 'auth/invalid-credential' ||
    code === 'invalid_credentials' ||
    code === 'invalid_login_credentials' ||
    message.includes('auth/wrong-password') ||
    message.includes('auth/invalid-credential') ||
    message.includes('INVALID_LOGIN_CREDENTIALS') ||
    message.toLowerCase().includes('invalid login credentials') ||
    message.toLowerCase().includes('invaild login credantials')
  ) {
    return 'Current password is incorrect';
  }

  if (
    message.toLowerCase().includes('invalid jwt') ||
    message.toLowerCase().includes('token is malformed') ||
    message.includes('Authentication token has been revoked') ||
    message.includes('Invalid or expired authentication token')
  ) {
    return 'Session expired. Please sign in again';
  }

  if (message.includes('Recent authentication is required') || message.includes('auth/requires-recent-login')) {
    return 'Please re-enter your current password and try again';
  }

  if (message.includes('Verification code has expired')) {
    return 'Verification code has expired. Request a new code';
  }

  if (message.includes('Verification code is invalid')) {
    return 'Verification code is invalid';
  }

  if (message.includes('Verification code has already been used')) {
    return 'Verification code already used. Request a new code';
  }

  if (message.includes('Verification could not be completed')) {
    return 'Verification could not be completed. Request a new code and try again';
  }

  if (message.includes('Verification code attempts are exhausted')) {
    return 'Too many invalid code attempts. Request a new code';
  }

  if (message.includes('Step-up verification is required')) {
    return 'Verification is required before completing this action';
  }

  if (message.includes('already linked to this account')) {
    return 'Email/password sign-in is already linked to this account';
  }

  if (message.includes('supported email domains')) {
    return 'This email domain is not allowed';
  }

  if (message.includes('already in use')) {
    return 'This email address is already in use';
  }

  if (message.includes('email/password sign-in enabled')) {
    return 'Email/password sign-in must be enabled for this action';
  }

  if (message.includes('Google account email must match')) {
    return 'Google account email must match your current account email';
  }

  if (
    code === 'GOOGLE_LINK_EMAIL_MISMATCH' ||
    message.includes('current Tvizzie email to link') ||
    message.includes('current email to link')
  ) {
    return 'Google account email must match your current email to link';
  }

  if (code === 'GOOGLE_UNLINK_REQUIRES_PASSWORD' || message.includes('email/password sign-in remains enabled')) {
    return 'Google can only be unlinked while email/password sign-in remains enabled';
  }

  if (code === 'GOOGLE_UNLINK_DISABLED' || message.includes('Google unlink is disabled in Tvizzie 2.0')) {
    return 'Google unlink is disabled in this rollout';
  }

  if (code === 'single_identity_not_deletable' || message.includes('at least 1 identity after unlinking')) {
    return 'Google unlink failed because this account has no backup identity yet. Add email/password as a real linked identity first.';
  }

  if (
    code === 'GOOGLE_LINK_MANUAL_LINKING_DISABLED' ||
    code === 'GOOGLE_UNLINK_MANUAL_LINKING_DISABLED' ||
    message.includes('Manual linking is disabled')
  ) {
    return 'Google linking/unlinking is disabled in Supabase. Enable "Manual Linking" in Supabase Auth settings and try again';
  }

  if (
    code === 'GOOGLE_PROVIDER_COLLISION' ||
    message.includes('already linked to another Tvizzie account') ||
    message.includes('already linked to another account')
  ) {
    return 'This Google account is already linked to another account';
  }

  if (message && !message.includes('Supabase error')) {
    return message;
  }

  return fallbackMessage;
}

export function validatePassword(value) {
  return validatePasswordRules(value);
}

export async function deleteAccountRequest({ currentPassword }) {
  const response = await fetch('/api/auth/account/delete', {
    method: 'POST',
    credentials: 'include',
    headers: {
      ...createCsrfHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      currentPassword: currentPassword || null,
    }),
  });

  const payload = await response.json().catch(() => ({ error: 'Account could not be deleted' }));

  if (!response.ok) {
    throw new Error(payload?.error || 'Account could not be deleted');
  }

  return payload;
}

export async function completeEmailChangeRequest({ newEmail }) {
  const response = await fetch('/api/auth/account/change-email', {
    method: 'POST',
    credentials: 'include',
    headers: {
      ...createCsrfHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      newEmail,
    }),
  });

  const payload = await response.json().catch(() => ({ error: 'Email could not be updated' }));

  if (!response.ok) {
    throw new Error(payload?.error || 'Email could not be updated');
  }

  return payload;
}

export async function completePasswordChangeRequest({ currentPassword, newPassword }) {
  const response = await fetch('/api/auth/account/change-password', {
    method: 'POST',
    credentials: 'include',
    headers: {
      ...createCsrfHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      currentPassword,
      newPassword,
    }),
  });

  const payload = await response.json().catch(() => ({ error: 'Password could not be updated' }));

  if (!response.ok) {
    throw new Error(payload?.error || 'Password could not be updated');
  }

  return payload;
}

export async function completePasswordSetRequest({ newPassword }) {
  const response = await fetch('/api/auth/account/set-password', {
    method: 'POST',
    credentials: 'include',
    headers: {
      ...createCsrfHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      newPassword,
    }),
  });

  const payload = await response.json().catch(() => ({ error: 'Password could not be set' }));

  if (!response.ok) {
    throw new Error(payload?.error || 'Password could not be set');
  }

  return payload;
}
