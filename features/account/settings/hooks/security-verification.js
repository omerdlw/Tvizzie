'use client';

import { normalizeEmail } from '../normalizers';
import AuthVerificationForm from '@/features/auth/auth-verification-form';
import AuthVerificationSurface from '@/core/modules/nav/surfaces/auth-verification-surface';

export async function openAccountVerificationPrompt({
  autoSendOnOpen = true,
  description,
  email,
  initialChallenge = null,
  openModal,
  openSurface,
  purpose,
  title,
  toast,
}) {
  const verificationEmail = normalizeEmail(email);

  try {
    const config = {
      header: {
        description,
        title,
      },
      data: {
        autoSendOnOpen,
        email: verificationEmail,
        formComponent: AuthVerificationForm,
        initialChallenge,
        purpose,
      },
    };

    if (typeof openSurface === 'function') {
      return openSurface(AuthVerificationSurface, config);
    }

    if (typeof openModal === 'function') {
      return openModal('AUTH_VERIFICATION_MODAL', 'bottom', config);
    }

    const error = new Error('Verification prompt is unavailable');

    return {
      error,
      success: false,
    };
  } catch (error) {
    toast.error(error?.message || 'Verification prompt is unavailable');

    return {
      error,
      success: false,
    };
  }
}
