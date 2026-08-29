import { requestApiJson } from '@/infrastructure/http/client';

export const AUTH_PURPOSE = Object.freeze({
  ACCOUNT_DELETE: 'account-delete',
  ACCOUNT_REAUTH: 'account-reauth',
  EMAIL_CHANGE: 'email-change',
});

export const INITIAL_EMAIL_FLOW = Object.freeze({
  isSubmitting: false,
  newEmail: '',
});

export const INITIAL_DELETE_FLOW = Object.freeze({
  confirmText: '',
  isSubmitting: false,
});

export function resolveSecurityErrorMessage(error, fallbackMessage = 'Security operation failed') {
  if (!error) return fallbackMessage;
  const message = String(error?.message || '').trim();
  if (!message) return fallbackMessage;

  const lower = message.toLowerCase();
  if (lower.includes('email-already-in-use') || lower.includes('email exists')) {
    return 'This email address is already in use by another account';
  }
  if (lower.includes('requires-recent-login')) {
    return 'Please sign in again before making security changes';
  }
  return message;
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
