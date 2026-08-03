import { requestApiJson } from '@/infrastructure/http/api-request-service';

export const AUTH_PURPOSE = Object.freeze({
  ACCOUNT_DELETE: 'ACCOUNT_DELETE',
  EMAIL_CHANGE: 'EMAIL_CHANGE',
  PASSWORD_SET: 'PASSWORD_SET',
  PASSWORD_UPDATE: 'PASSWORD_UPDATE',
});

export const INITIAL_PASSWORD_FLOW = Object.freeze({
  confirmPassword: '',
  currentPassword: '',
  isSubmitting: false,
  newPassword: '',
});

export const INITIAL_EMAIL_FLOW = Object.freeze({
  currentPassword: '',
  isSubmitting: false,
  newEmail: '',
});

export const INITIAL_DELETE_FLOW = Object.freeze({
  confirmText: '',
  currentPassword: '',
  isSubmitting: false,
});

export function validatePassword(password) {
  const value = String(password || '');
  if (!value) return 'Password is required';
  if (value.length < 6) return 'Password must be at least 6 characters';
  return null;
}

export function resolveSecurityErrorMessage(error, fallbackMessage = 'Security operation failed') {
  if (!error) return fallbackMessage;
  const message = String(error?.message || '').trim();
  if (!message) return fallbackMessage;

  const lower = message.toLowerCase();
  if (lower.includes('invalid-credential') || lower.includes('wrong-password') || lower.includes('invalid password')) {
    return 'Current password is incorrect';
  }
  if (lower.includes('email-already-in-use') || lower.includes('email exists')) {
    return 'This email address is already in use by another account';
  }
  if (lower.includes('requires-recent-login')) {
    return 'Please sign in again before making security changes';
  }
  return message;
}

export async function completePasswordChangeRequest({ currentPassword, newPassword }) {
  return requestApiJson('/api/auth/password-reset/complete', {
    method: 'POST',
    body: { action: 'change-password', currentPassword, newPassword },
  });
}

export async function completePasswordSetRequest({ newPassword }) {
  return requestApiJson('/api/auth/password-reset/complete', {
    method: 'POST',
    body: { action: 'set-password', newPassword },
  });
}

export async function completeEmailChangeRequest({ currentPassword, newEmail }) {
  return requestApiJson('/api/auth/account', {
    method: 'POST',
    body: { action: 'change-email', currentPassword, newEmail },
  });
}

export async function deleteAccountRequest({ currentPassword }) {
  return requestApiJson('/api/auth/account', {
    method: 'POST',
    body: { action: 'delete-account', currentPassword },
  });
}
