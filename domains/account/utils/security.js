import { requestApiJson } from '@/infrastructure/http/api-request-service';

export const AUTH_PURPOSE = Object.freeze({
  ACCOUNT_DELETE: 'account-delete',
  EMAIL_CHANGE: 'email-change',
  PASSWORD_SET: 'password-set',
  PASSWORD_UPDATE: 'password-change',
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

export async function completePasswordChangeRequest({ newPassword }) {
  return requestApiJson('/api/auth/account', {
    body: { action: 'change-password', newPassword },
    method: 'POST',
  });
}

export async function completePasswordSetRequest({ newPassword }) {
  return requestApiJson('/api/auth/account', {
    body: { action: 'set-password', newPassword },
    method: 'POST',
  });
}

export async function completeEmailChangeRequest({ newEmail }) {
  return requestApiJson('/api/auth/account', {
    body: { action: 'change-email', newEmail },
    method: 'POST',
  });
}

export async function deleteAccountRequest() {
  return requestApiJson('/api/auth/account', {
    body: { action: 'delete' },
    method: 'POST',
  });
}
