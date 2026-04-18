'use client';

import {
  clearAccountFeedback,
  emitAccountFeedback,
  normalizeEmail,
} from '../utils';
import {
  AUTH_PURPOSE,
  EMAIL_PATTERN,
  INITIAL_EMAIL_FLOW,
  INITIAL_PASSWORD_FLOW,
  completeEmailChangeRequest,
  completePasswordChangeRequest,
  completePasswordSetRequest,
  resolveSecurityErrorMessage,
  validatePassword,
} from '../security';
import AuthVerificationForm from '@/features/auth/auth-verification-form';
import { AUTH_ROUTES, buildAuthHref, requestVerificationCode } from '@/features/auth';
import { logAuthAuditEvent } from '@/core/auth/clients/audit.client';
import AuthVerificationSurface from '@/core/modules/nav/surfaces/auth-verification-surface';
import { useCallback } from 'react';

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
    async ({
      autoSendOnOpen = true,
      purpose,
      email,
      initialChallenge = null,
      title = 'Email verification',
      description = 'Code verification',
    }) => {
      return openAccountVerificationPrompt({
        autoSendOnOpen,
        description,
        email,
        initialChallenge,
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

    const nextEmail = normalizeEmail(emailFlow.newEmail);
    const currentPassword = String(emailFlow.currentPassword || '');

    if (!nextEmail || !EMAIL_PATTERN.test(nextEmail)) {
      toast.error('Please provide a valid email address');
      return;
    }

    if (nextEmail === currentAuthEmail) {
      toast.error('New email must be different from current email');
      return;
    }

    if (!currentPassword) {
      toast.error('Current password is required');
      return;
    }

    setEmailFlow((prev) => ({ ...prev, isSubmitting: true }));
    try {
      await reauthenticateWithPassword(currentPassword);
      const initialChallenge = await requestVerificationCode({
        email: nextEmail,
        purpose: AUTH_PURPOSE.EMAIL_CHANGE,
      });

      const verification = await openVerificationModal({
        autoSendOnOpen: false,
        description: 'Verify your new email',
        email: nextEmail,
        initialChallenge,
        purpose: AUTH_PURPOSE.EMAIL_CHANGE,
        title: 'Email verification',
      });

      if (!verification?.success) {
        setEmailFlow((prev) => ({ ...prev, isSubmitting: false }));
        return;
      }

      emitAccountFeedback('email-change', 'start');

      const result = await completeEmailChangeRequest({
        newEmail: nextEmail,
      });

      if (result?.nextAction === 'signed_out') {
        await auth.signOut({
          reason: 'email-change',
        });
      }

      if (typeof setLinkedProviderIdsOverride === 'function') {
        setLinkedProviderIdsOverride(null);
      }

      if (typeof setLinkedProviderDescriptorsOverride === 'function') {
        setLinkedProviderDescriptorsOverride(null);
      }

      logAuthAuditEvent({
        email: nextEmail,
        eventType: 'email-change',
        metadata: {
          source: 'app/account/edit',
        },
        provider: 'password',
        status: 'success',
        userId: auth.user.id,
      });

      emitAccountFeedback('email-change', 'success');
      setEmailFlow(INITIAL_EMAIL_FLOW);

      if (typeof window !== 'undefined') {
        window.location.replace(
          buildAuthHref(AUTH_ROUTES.SIGN_IN, {
            email: nextEmail,
          })
        );
      }
    } catch (error) {
      setEmailFlow((prev) => ({ ...prev, isSubmitting: false }));
      clearAccountFeedback('email-change');
      logAuthAuditEvent({
        email: currentAuthEmail || null,
        eventType: 'failed-attempt',
        metadata: {
          action: 'email-change',
          message: error?.message || 'Email update failed',
          source: 'app/account/edit',
        },
        provider: 'password',
        status: 'failure',
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
    setEmailFlow,
    setLinkedProviderDescriptorsOverride,
    setLinkedProviderIdsOverride,
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

    const currentPassword = String(passwordFlow.currentPassword || '');
    let newPassword = '';
    const confirmPassword = String(passwordFlow.confirmPassword || '');

    if (!currentPassword) {
      toast.error('Current password is required');
      return;
    }

    try {
      newPassword = validatePassword(passwordFlow.newPassword);
    } catch (error) {
      toast.error(resolveSecurityErrorMessage(error, 'Password does not meet requirements'));
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match');
      return;
    }

    setPasswordFlow((prev) => ({ ...prev, isSubmitting: true }));
    try {
      await reauthenticateWithPassword(currentPassword);

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
        currentPassword,
        newPassword,
      });

      if (result?.nextAction === 'signed_out') {
        await auth.signOut({
          reason: 'password-change',
        });
      }

      logAuthAuditEvent({
        email: currentAuthEmail || null,
        eventType: 'password-change',
        metadata: {
          source: 'app/account/edit',
        },
        provider: 'password',
        status: 'success',
        userId: auth.user?.id || null,
      });

      emitAccountFeedback('password-change', 'success');
      setPasswordFlow(INITIAL_PASSWORD_FLOW);

      if (typeof window !== 'undefined') {
        window.location.replace(
          buildAuthHref(AUTH_ROUTES.SIGN_IN, {
            email: currentAuthEmail || '',
          })
        );
      }
    } catch (error) {
      setPasswordFlow((prev) => ({ ...prev, isSubmitting: false }));
      clearAccountFeedback('password-change');
      logAuthAuditEvent({
        email: currentAuthEmail || null,
        eventType: 'failed-attempt',
        metadata: {
          action: 'password-change',
          message: error?.message || 'Password update failed',
          source: 'app/account/edit',
        },
        provider: 'password',
        status: 'failure',
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

    let newPassword = '';
    const confirmPassword = String(passwordFlow.confirmPassword || '');

    try {
      newPassword = validatePassword(passwordFlow.newPassword);
    } catch (error) {
      toast.error(resolveSecurityErrorMessage(error, 'Password does not meet requirements'));
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match');
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
        newPassword,
      });

      if (result?.nextAction === 'signed_out') {
        await auth.signOut({
          reason: 'password-set',
        });
      }

      if (typeof setLinkedProviderIdsOverride === 'function') {
        setLinkedProviderIdsOverride(null);
      }

      if (typeof setLinkedProviderDescriptorsOverride === 'function') {
        setLinkedProviderDescriptorsOverride(null);
      }

      logAuthAuditEvent({
        email: currentAuthEmail || null,
        eventType: 'password-set',
        metadata: {
          source: 'app/account/edit',
        },
        provider: 'password',
        status: 'success',
        userId: auth.user?.id || null,
      });

      emitAccountFeedback('password-set', 'success');
      setPasswordFlow(INITIAL_PASSWORD_FLOW);

      if (typeof window !== 'undefined') {
        window.location.replace(
          buildAuthHref(AUTH_ROUTES.SIGN_IN, {
            email: currentAuthEmail || '',
          })
        );
      }
    } catch (error) {
      setPasswordFlow((prev) => ({ ...prev, isSubmitting: false }));
      clearAccountFeedback('password-set');
      logAuthAuditEvent({
        email: currentAuthEmail || null,
        eventType: 'failed-attempt',
        metadata: {
          action: 'password-set',
          message: error?.message || 'Password setup failed',
          source: 'app/account/edit',
        },
        provider: 'password',
        status: 'failure',
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
    setLinkedProviderDescriptorsOverride,
    setLinkedProviderIdsOverride,
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
