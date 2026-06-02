'use client';

import { clearAccountFeedback, emitAccountFeedback, normalizeEmail } from '../utils';
import {
  AUTH_PURPOSE,
  INITIAL_EMAIL_FLOW,
  INITIAL_PASSWORD_FLOW,
  completeEmailChangeRequest,
  completePasswordChangeRequest,
  completePasswordSetRequest,
  resolveSecurityErrorMessage,
} from '../security';
import AuthVerificationSurface from '@/core/modules/nav/surfaces/auth-verification-surface';
import { useCallback } from 'react';
import {
  logCredentialAuditFailure,
  logCredentialAuditSuccess,
  redirectToSignInWithEmail,
  resetLinkedProviderOverrides,
  signOutIfRequested,
} from './security-credential-helpers';
import {
  validateEmailChangeInput,
  validateNewPasswordPair,
  validatePasswordChangeInput,
} from './security-credential-validation';

export async function openAccountVerificationPrompt({
  description,
  email,
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
        email: verificationEmail,
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

export function useAccountCredentialActions({
  auth,
  canUsePasswordSecurity,
  currentAuthEmail,
  emailFlow,
  openModal,
  openSurface,
  passwordFlow,
  setEmailFlow,
  setLinkedProviderDescriptorsOverride,
  setLinkedProviderIdsOverride,
  setPasswordFlow,
  toast,
}) {
  const resetLinkedProviders = useCallback(() => {
    resetLinkedProviderOverrides({
      setLinkedProviderDescriptorsOverride,
      setLinkedProviderIdsOverride,
    });
  }, [setLinkedProviderDescriptorsOverride, setLinkedProviderIdsOverride]);

  const reauthenticateWithPassword = useCallback(
    async (password) => {
      if (typeof auth?.reauthenticate !== 'function') {
        throw new Error('Reauthentication is not supported by this auth adapter');
      }

      return auth.reauthenticate({
        password: String(password || ''),
      });
    },
    [auth]
  );

  const openVerificationModal = useCallback(
    async ({ purpose, email, title = 'Email verification', description = 'Code verification' }) => {
      return openAccountVerificationPrompt({
        description,
        email,
        openModal,
        openSurface,
        purpose,
        title,
        toast,
      });
    },
    [openModal, openSurface, toast]
  );

  const handleCompleteEmailChange = useCallback(async () => {
    if (emailFlow.isSubmitting) {
      return;
    }
    if (!canUsePasswordSecurity || !auth.user?.id) {
      toast.error('Email/password sign-in must be enabled for this action');
      return;
    }

    const validatedInput = validateEmailChangeInput({
      currentAuthEmail,
      currentPassword: emailFlow.currentPassword,
      newEmail: emailFlow.newEmail,
      toast,
    });

    if (!validatedInput) {
      return;
    }

    setEmailFlow((prev) => ({ ...prev, isSubmitting: true }));
    try {
      await reauthenticateWithPassword(validatedInput.currentPassword);

      const verification = await openVerificationModal({
        description: 'Verify your new email',
        email: validatedInput.nextEmail,
        purpose: AUTH_PURPOSE.EMAIL_CHANGE,
        title: 'Email verification',
      });

      if (!verification?.success) {
        setEmailFlow((prev) => ({ ...prev, isSubmitting: false }));
        return;
      }

      emitAccountFeedback('email-change', 'start');

      const result = await completeEmailChangeRequest({
        newEmail: validatedInput.nextEmail,
      });

      await signOutIfRequested(auth, result, 'email-change');
      resetLinkedProviders();
      logCredentialAuditSuccess({
        email: validatedInput.nextEmail,
        eventType: 'email-change',
        userId: auth.user.id,
      });

      emitAccountFeedback('email-change', 'success');
      setEmailFlow(INITIAL_EMAIL_FLOW);
      redirectToSignInWithEmail(validatedInput.nextEmail);
    } catch (error) {
      setEmailFlow((prev) => ({ ...prev, isSubmitting: false }));
      clearAccountFeedback('email-change');
      logCredentialAuditFailure({
        action: 'email-change',
        email: currentAuthEmail || null,
        error,
        userId: auth.user?.id || null,
      });
      toast.error(resolveSecurityErrorMessage(error, 'Email could not be updated'));
    }
  }, [
    auth,
    canUsePasswordSecurity,
    currentAuthEmail,
    emailFlow,
    openVerificationModal,
    reauthenticateWithPassword,
    resetLinkedProviders,
    setEmailFlow,
    toast,
  ]);

  const handleCompletePasswordChange = useCallback(async () => {
    if (passwordFlow.isSubmitting) {
      return;
    }
    if (!canUsePasswordSecurity) {
      toast.error('Email/password sign-in must be enabled for this action');
      return;
    }

    const validatedInput = validatePasswordChangeInput({
      confirmPassword: passwordFlow.confirmPassword,
      currentPassword: passwordFlow.currentPassword,
      newPassword: passwordFlow.newPassword,
      toast,
    });

    if (!validatedInput) {
      return;
    }

    setPasswordFlow((prev) => ({ ...prev, isSubmitting: true }));
    try {
      await reauthenticateWithPassword(validatedInput.currentPassword);

      const verification = await openVerificationModal({
        description: 'Verify your current email',
        email: currentAuthEmail,
        purpose: AUTH_PURPOSE.PASSWORD_CHANGE,
        title: 'Password verification',
      });

      if (!verification?.success) {
        setPasswordFlow((prev) => ({ ...prev, isSubmitting: false }));
        return;
      }

      emitAccountFeedback('password-change', 'start');

      const result = await completePasswordChangeRequest({
        currentPassword: validatedInput.currentPassword,
        newPassword: validatedInput.newPassword,
      });

      await signOutIfRequested(auth, result, 'password-change');
      logCredentialAuditSuccess({
        email: currentAuthEmail || null,
        eventType: 'password-change',
        userId: auth.user?.id || null,
      });

      emitAccountFeedback('password-change', 'success');
      setPasswordFlow(INITIAL_PASSWORD_FLOW);
      redirectToSignInWithEmail(currentAuthEmail);
    } catch (error) {
      setPasswordFlow((prev) => ({ ...prev, isSubmitting: false }));
      clearAccountFeedback('password-change');
      logCredentialAuditFailure({
        action: 'password-change',
        email: currentAuthEmail || null,
        error,
        userId: auth.user?.id || null,
      });
      toast.error(resolveSecurityErrorMessage(error, 'Password could not be updated'));
    }
  }, [
    auth,
    canUsePasswordSecurity,
    currentAuthEmail,
    openVerificationModal,
    passwordFlow,
    reauthenticateWithPassword,
    setPasswordFlow,
    toast,
  ]);

  const handleSetPassword = useCallback(async () => {
    if (passwordFlow.isSubmitting) {
      return;
    }

    if (canUsePasswordSecurity) {
      toast.error('Email/password sign-in is already linked to this account');
      return;
    }

    if (!auth.user?.id) {
      toast.error('Authentication session is required');
      return;
    }

    const validatedInput = validateNewPasswordPair({
      confirmPassword: passwordFlow.confirmPassword,
      newPassword: passwordFlow.newPassword,
      toast,
    });

    if (!validatedInput) {
      return;
    }

    setPasswordFlow((prev) => ({ ...prev, isSubmitting: true }));

    try {
      const verification = await openVerificationModal({
        description: 'Verify your current email before adding a password',
        email: currentAuthEmail,
        purpose: AUTH_PURPOSE.PASSWORD_SET,
        title: 'Set password verification',
      });

      if (!verification?.success) {
        setPasswordFlow((prev) => ({ ...prev, isSubmitting: false }));
        return;
      }

      emitAccountFeedback('password-set', 'start');

      const result = await completePasswordSetRequest({
        newPassword: validatedInput.newPassword,
      });

      await signOutIfRequested(auth, result, 'password-set');
      resetLinkedProviders();
      logCredentialAuditSuccess({
        email: currentAuthEmail || null,
        eventType: 'password-set',
        userId: auth.user?.id || null,
      });

      emitAccountFeedback('password-set', 'success');
      setPasswordFlow(INITIAL_PASSWORD_FLOW);
      redirectToSignInWithEmail(currentAuthEmail);
    } catch (error) {
      setPasswordFlow((prev) => ({ ...prev, isSubmitting: false }));
      clearAccountFeedback('password-set');
      logCredentialAuditFailure({
        action: 'password-set',
        email: currentAuthEmail || null,
        error,
        userId: auth.user?.id || null,
      });
      toast.error(resolveSecurityErrorMessage(error, 'Password could not be set'));
    }
  }, [
    auth,
    canUsePasswordSecurity,
    currentAuthEmail,
    openVerificationModal,
    passwordFlow,
    resetLinkedProviders,
    setPasswordFlow,
    toast,
  ]);

  return {
    handleCompleteEmailChange,
    handleCompletePasswordChange,
    handleSetPassword,
    reauthenticateWithPassword,
  };
}
