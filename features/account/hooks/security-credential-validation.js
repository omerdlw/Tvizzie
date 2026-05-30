import { EMAIL_PATTERN, resolveSecurityErrorMessage, validatePassword } from '../security';
import { normalizeEmail } from '../utils';

export function validateEmailChangeInput({ currentAuthEmail, currentPassword, newEmail, toast }) {
  const normalizedEmail = normalizeEmail(newEmail);
  const resolvedPassword = String(currentPassword || '');

  if (!normalizedEmail || !EMAIL_PATTERN.test(normalizedEmail)) {
    toast.error('Please provide a valid email address');
    return null;
  }

  if (normalizedEmail === currentAuthEmail) {
    toast.error('New email must be different from current email');
    return null;
  }

  if (!resolvedPassword) {
    toast.error('Current password is required');
    return null;
  }

  return {
    currentPassword: resolvedPassword,
    nextEmail: normalizedEmail,
  };
}

export function validatePasswordChangeInput({ currentPassword, newPassword, confirmPassword, toast }) {
  const resolvedCurrentPassword = String(currentPassword || '');

  if (!resolvedCurrentPassword) {
    toast.error('Current password is required');
    return null;
  }

  const passwordPair = validateNewPasswordPair({
    confirmPassword,
    newPassword,
    toast,
  });

  if (!passwordPair) {
    return null;
  }

  return {
    currentPassword: resolvedCurrentPassword,
    newPassword: passwordPair.newPassword,
  };
}

export function validateNewPasswordPair({ newPassword, confirmPassword, toast }) {
  let validatedPassword = '';
  const resolvedConfirmPassword = String(confirmPassword || '');

  try {
    validatedPassword = validatePassword(newPassword);
  } catch (error) {
    toast.error(resolveSecurityErrorMessage(error, 'Password does not meet requirements'));
    return null;
  }

  if (validatedPassword !== resolvedConfirmPassword) {
    toast.error('New password and confirmation do not match');
    return null;
  }

  return {
    newPassword: validatedPassword,
  };
}
