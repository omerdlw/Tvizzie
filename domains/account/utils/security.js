import { changeEmailServer, changePasswordServer, deleteAccountServer, setPasswordServer } from '@/domains/auth/api/account.server';

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

export async function completePasswordChangeRequest({ userId, newPassword }) {
  const res = await changePasswordServer({ userId, newPassword });
  if (!res.success) throw new Error(res.error || 'Password change failed');
  return res;
}

export async function completePasswordSetRequest({ userId, newPassword }) {
  const res = await setPasswordServer({ userId, newPassword });
  if (!res.success) throw new Error(res.error || 'Password setup failed');
  return res;
}

export async function completeEmailChangeRequest({ userId, newEmail }) {
  const res = await changeEmailServer({ userId, newEmail });
  if (!res.success) throw new Error(res.error || 'Email change failed');
  return res;
}

export async function deleteAccountRequest({ userId }) {
  const res = await deleteAccountServer({ userId });
  if (!res.success) throw new Error(res.error || 'Account deletion failed');
  return res;
}

