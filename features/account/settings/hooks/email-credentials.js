'use client';

import { clearAccountFeedback, emitAccountFeedback } from '../account-feedback';
import { normalizeEmail } from '../normalizers';
import {
  AUTH_PURPOSE,
  EMAIL_PATTERN,
  INITIAL_EMAIL_FLOW,
  completeEmailChangeRequest,
  resolveSecurityErrorMessage,
} from '../security';
import { requestVerificationCode } from '@/features/auth/requests';
import { AUTH_ROUTES } from '@/features/auth/constants';
import { buildAuthHref } from '@/features/auth/utils';
import { logAuthAuditEvent } from '@/core/auth/clients';
import { useCallback } from 'react';

export function useAccountEmailCredentialAction({
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
}) {
  return useCallback(async () => {
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
}
