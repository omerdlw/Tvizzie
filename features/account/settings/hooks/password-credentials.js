'use client';

import {
  AUTH_PURPOSE,
  INITIAL_PASSWORD_FLOW,
  completePasswordChangeRequest,
  completePasswordSetRequest,
  resolveSecurityErrorMessage,
  validatePassword,
} from '../security';
import { useCallback } from 'react';
import { logAuthAuditEvent } from '@/core/auth/clients';
import { AUTH_ROUTES } from '@/features/auth/constants';
import { buildAuthHref } from '@/features/auth/auth-flow';
import { clearAccountFeedback, emitAccountFeedback } from '../../feedback/account-feedback';

function redirectToSignIn(currentAuthEmail) {
  if (typeof window === 'undefined') {
    return;
  }

  window.location.replace(
    buildAuthHref(AUTH_ROUTES.SIGN_IN, {
      email: currentAuthEmail || '',
    })
  );
}

function startPasswordFeedback(flow) {
  emitAccountFeedback(flow, 'start');
}

function completePasswordFeedback(flow) {
  emitAccountFeedback(flow, 'success');
}

function clearPasswordFeedback(flow) {
  clearAccountFeedback(flow);
}

function logPasswordAuditSuccess({ currentAuthEmail, eventType, userId }) {
  logAuthAuditEvent({
    email: currentAuthEmail || null,
    eventType,
    metadata: {
      source: 'app/account/edit',
    },
    provider: 'password',
    status: 'success',
    userId: userId || null,
  });
}

function logPasswordAuditFailure({ action, currentAuthEmail, error, userId }) {
  logAuthAuditEvent({
    email: currentAuthEmail || null,
    eventType: 'failed-attempt',
    metadata: {
      action,
      message: error?.message || 'Password action failed',
      source: 'app/account/edit',
    },
    provider: 'password',
    status: 'failure',
    userId: userId || null,
  });
}

export function useAccountPasswordCredentialActions({
  auth,
  canUsePasswordSecurity,
  currentAuthEmail,
  openVerificationModal,
  passwordFlow,
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

      startPasswordFeedback('password-change');

      const result = await completePasswordChangeRequest({
        currentPassword,
        newPassword,
      });

      if (result?.nextAction === 'signed_out') {
        await auth.signOut({
          reason: 'password-change',
        });
      }

      logPasswordAuditSuccess({
        currentAuthEmail,
        eventType: 'password-change',
        userId: auth.user?.id,
      });

      completePasswordFeedback('password-change');
      setPasswordFlow(INITIAL_PASSWORD_FLOW);
      redirectToSignIn(currentAuthEmail);
    } catch (error) {
      setPasswordFlow((prev) => ({ ...prev, isSubmitting: false }));
      clearPasswordFeedback('password-change');
      logPasswordAuditFailure({
        action: 'password-change',
        currentAuthEmail,
        error,
        userId: auth.user?.id,
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

      startPasswordFeedback('password-set');

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

      logPasswordAuditSuccess({
        currentAuthEmail,
        eventType: 'password-set',
        userId: auth.user?.id,
      });

      completePasswordFeedback('password-set');
      setPasswordFlow(INITIAL_PASSWORD_FLOW);
      redirectToSignIn(currentAuthEmail);
    } catch (error) {
      setPasswordFlow((prev) => ({ ...prev, isSubmitting: false }));
      clearPasswordFeedback('password-set');
      logPasswordAuditFailure({
        action: 'password-set',
        currentAuthEmail,
        error,
        userId: auth.user?.id,
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
    handleCompletePasswordChange,
    handleSetPassword,
    reauthenticateWithPassword,
  };
}
