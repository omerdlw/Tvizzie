'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AUTH_PURPOSE,
  INITIAL_EMAIL_FLOW,
  INITIAL_PASSWORD_FLOW,
  clearAccountFeedback,
  completeEmailChangeRequest,
  completePasswordChangeRequest,
  completePasswordSetRequest,
  deleteAccountRequest,
  emitAccountFeedback,
  normalizeEmail,
  normalizeProviderDescriptors,
  resolveSecurityErrorMessage,
} from '@/domains/account/utils';
import { AuthVerificationSurface } from '@/domains/auth/ui';
import { AUTH_ROUTES, buildAuthHref } from '@/domains/auth/utils';

// ============================================================
// Security Helpers & Validation
// ============================================================

export function resetLinkedProviderOverrides({ setLinkedProviderDescriptorsOverride, setLinkedProviderIdsOverride }) {
  if (typeof setLinkedProviderIdsOverride === 'function') setLinkedProviderIdsOverride(null);
  if (typeof setLinkedProviderDescriptorsOverride === 'function') setLinkedProviderDescriptorsOverride(null);
}

export async function logCredentialAuditSuccess(event, metadata = {}) {
  try {
    const { logAuditServer } = await import('@/domains/auth/api/audit.server');
    await logAuditServer({ event, metadata });
  } catch {}
}

export async function logCredentialAuditFailure(event, error) {
  try {
    const { logAuditServer } = await import('@/domains/auth/api/audit.server');
    await logAuditServer({ event, metadata: { error: error?.message || 'Action failed' } });
  } catch {}
}

export async function signOutIfRequested(auth, nextAction) {
  if (nextAction !== 'signed_out' || typeof auth?.signOut !== 'function') return;
  await auth.signOut({ reason: 'security-credential-update', redirect: false }).catch(() => {});
}

export function redirectToSignInWithEmail(router, email) {
  if (!router || typeof router.push !== 'function') return;
  router.push(buildAuthHref(AUTH_ROUTES.SIGN_IN, { email }));
}

export function validateEmailChangeInput({ currentEmail, currentPassword, newEmail, isPasswordLinked }) {
  if (isPasswordLinked && !currentPassword) return 'Current password is required';
  if (!newEmail || !newEmail.includes('@')) return 'Valid new email address is required';
  if (currentEmail && newEmail.toLowerCase() === currentEmail.toLowerCase()) return 'New email must be different from current email';
  return null;
}

export function validateNewPasswordPair(newPassword, confirmPassword) {
  if (!newPassword || newPassword.length < 6) return 'Password must be at least 6 characters';
  if (newPassword !== confirmPassword) return 'Passwords do not match';
  return null;
}

export function validatePasswordChangeInput({ currentPassword, newPassword, confirmPassword, isPasswordLinked }) {
  if (isPasswordLinked && !currentPassword) return 'Current password is required';
  const pairError = validateNewPasswordPair(newPassword, confirmPassword);
  if (pairError) return pairError;
  if (isPasswordLinked && currentPassword === newPassword) return 'New password must be different from current password';
  return null;
}

// ============================================================
// Account Verification Prompt Helper
// ============================================================

export async function openAccountVerificationPrompt({ description, email, openModal, openSurface, purpose, title, toast }) {
  const verificationEmail = normalizeEmail(email);
  try {
    const config = { header: { description, title }, data: { email: verificationEmail, purpose } };
    if (typeof openSurface === 'function') return openSurface(AuthVerificationSurface, config);
    if (typeof openModal === 'function') return openModal('AUTH_VERIFICATION_MODAL', 'bottom', config);
    return { error: new Error('Verification prompt is unavailable'), success: false };
  } catch (error) {
    toast?.error?.(error?.message || 'Verification prompt is unavailable');
    return { error, success: false };
  }
}

// ============================================================
// Credential Actions Hook (Email & Password Changes)
// ============================================================

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
    resetLinkedProviderOverrides({ setLinkedProviderDescriptorsOverride, setLinkedProviderIdsOverride });
  }, [setLinkedProviderDescriptorsOverride, setLinkedProviderIdsOverride]);

  const reauthenticateWithPassword = useCallback(
    async (password) => {
      if (typeof auth?.reauthenticate !== 'function') {
        throw new Error('Reauthentication is not supported by this auth adapter');
      }
      return auth.reauthenticate({ password });
    },
    [auth],
  );

  const handleUpdatePassword = useCallback(
    async (isPasswordLinked) => {
      if (passwordFlow.isSubmitting) return;

      const currentPassword = String(passwordFlow.currentPassword || '');
      const newPassword = String(passwordFlow.newPassword || '');
      const confirmPassword = String(passwordFlow.confirmPassword || '');

      const validationError = validatePasswordChangeInput({ confirmPassword, currentPassword, isPasswordLinked, newPassword });
      if (validationError) {
        toast.error(validationError);
        return;
      }

      setPasswordFlow((prev) => ({ ...prev, isSubmitting: true }));

      try {
        if (isPasswordLinked) {
          await reauthenticateWithPassword(currentPassword);
        }

        const verification = await openAccountVerificationPrompt({
          description: isPasswordLinked ? 'Verify your email before updating password' : 'Verify your email before setting password',
          email: currentAuthEmail,
          openModal,
          openSurface,
          purpose: isPasswordLinked ? AUTH_PURPOSE.PASSWORD_UPDATE : AUTH_PURPOSE.PASSWORD_SET,
          title: isPasswordLinked ? 'Update password verification' : 'Set password verification',
          toast,
        });

        if (!verification?.success) {
          setPasswordFlow((prev) => ({ ...prev, isSubmitting: false }));
          return;
        }

        emitAccountFeedback('password-update', 'start');

        const result = isPasswordLinked
          ? await completePasswordChangeRequest({ currentPassword, newPassword })
          : await completePasswordSetRequest({ newPassword });

        resetLinkedProviders();
        setPasswordFlow(INITIAL_PASSWORD_FLOW);
        toast.success(isPasswordLinked ? 'Password updated successfully' : 'Password created successfully');
        await logCredentialAuditSuccess(isPasswordLinked ? 'password_update' : 'password_set', { userId: auth?.user?.id });

        await signOutIfRequested(auth, result?.nextAction);
      } catch (error) {
        setPasswordFlow((prev) => ({ ...prev, isSubmitting: false }));
        const errorMessage = resolveSecurityErrorMessage(error, 'Password update failed');
        toast.error(errorMessage);
        await logCredentialAuditFailure(isPasswordLinked ? 'password_update' : 'password_set', error);
      } finally {
        clearAccountFeedback('password-update');
      }
    },
    [auth, currentAuthEmail, openModal, openSurface, passwordFlow, reauthenticateWithPassword, resetLinkedProviders, setPasswordFlow, toast],
  );

  const handleUpdateEmail = useCallback(
    async (isPasswordLinked) => {
      if (emailFlow.isSubmitting) return;

      const currentPassword = String(emailFlow.currentPassword || '');
      const newEmail = normalizeEmail(emailFlow.newEmail);

      const validationError = validateEmailChangeInput({ currentEmail: currentAuthEmail, currentPassword, isPasswordLinked, newEmail });
      if (validationError) {
        toast.error(validationError);
        return;
      }

      setEmailFlow((prev) => ({ ...prev, isSubmitting: true }));

      try {
        if (isPasswordLinked) {
          await reauthenticateWithPassword(currentPassword);
        }

        const verification = await openAccountVerificationPrompt({
          description: 'Verify your new email address to complete change',
          email: newEmail,
          openModal,
          openSurface,
          purpose: AUTH_PURPOSE.EMAIL_CHANGE,
          title: 'New email verification',
          toast,
        });

        if (!verification?.success) {
          setEmailFlow((prev) => ({ ...prev, isSubmitting: false }));
          return;
        }

        emitAccountFeedback('email-update', 'start');

        const result = await completeEmailChangeRequest({ currentPassword: isPasswordLinked ? currentPassword : '', newEmail });
        setEmailFlow(INITIAL_EMAIL_FLOW);
        toast.success('Email update completed successfully');
        await logCredentialAuditSuccess('email_change', { newEmail, userId: auth?.user?.id });

        await signOutIfRequested(auth, result?.nextAction);
      } catch (error) {
        setEmailFlow((prev) => ({ ...prev, isSubmitting: false }));
        const errorMessage = resolveSecurityErrorMessage(error, 'Email update failed');
        toast.error(errorMessage);
        await logCredentialAuditFailure('email_change', error);
      } finally {
        clearAccountFeedback('email-update');
      }
    },
    [auth, currentAuthEmail, emailFlow, openModal, openSurface, reauthenticateWithPassword, setEmailFlow, toast],
  );

  return { handleUpdateEmail, handleUpdatePassword, reauthenticateWithPassword };
}

// ============================================================
// Account Delete Action Hook
// ============================================================

export function useAccountDeleteAction({
  auth,
  deleteFlow,
  isPasswordLinked,
  reauthenticateWithPassword,
  currentAuthEmail,
  openModal,
  openSurface,
  setDeleteConfirmation,
  setDeleteFlow,
  toast,
}) {
  const router = useRouter();
  const deleteRequestLockRef = useRef(false);

  const handleDeleteAccount = useCallback(async () => {
    if (deleteFlow.isSubmitting || deleteRequestLockRef.current) return;

    const currentPassword = String(deleteFlow.currentPassword || '');
    const confirmText = String(deleteFlow.confirmText || '').trim();

    if (isPasswordLinked && !currentPassword) {
      toast.error('Current password is required');
      return;
    }
    if (confirmText !== 'DELETE') {
      toast.error('Type DELETE to confirm account deletion');
      return;
    }

    setDeleteConfirmation({
      cancelText: 'Cancel',
      confirmText: 'Delete Account',
      description: 'This action permanently deletes your account and signs you out',
      icon: 'solar:danger-triangle-bold',
      isDestructive: true,
      onCancel: () => setDeleteConfirmation(null),
      onConfirm: async () => {
        if (deleteRequestLockRef.current) return;
        deleteRequestLockRef.current = true;
        setDeleteFlow((prev) => ({ ...prev, isSubmitting: true }));

        try {
          if (isPasswordLinked) await reauthenticateWithPassword(currentPassword);

          const verification = await openAccountVerificationPrompt({
            description: 'Verify your current email before deletion',
            email: currentAuthEmail,
            openModal,
            openSurface,
            purpose: AUTH_PURPOSE.ACCOUNT_DELETE,
            title: 'Delete account verification',
            toast,
          });

          if (!verification?.success) {
            setDeleteConfirmation(null);
            setDeleteFlow((prev) => ({ ...prev, isSubmitting: false }));
            deleteRequestLockRef.current = false;
            return;
          }

          emitAccountFeedback('account-delete', 'start');
          const result = await deleteAccountRequest({ currentPassword: isPasswordLinked ? currentPassword : '' });
          setDeleteConfirmation(null);

          if (result?.nextAction === 'signed_out') {
            await auth.signOut({ reason: 'delete-account', redirect: false }).catch(() => {});
          }

          toast.success('Account deleted successfully');
          await logCredentialAuditSuccess('account_delete', { userId: auth?.user?.id });
          router.push('/');
        } catch (error) {
          deleteRequestLockRef.current = false;
          setDeleteConfirmation(null);
          setDeleteFlow((prev) => ({ ...prev, isSubmitting: false }));
          const errorMessage = resolveSecurityErrorMessage(error, 'Account deletion failed');
          toast.error(errorMessage);
          await logCredentialAuditFailure('account_delete', error);
        } finally {
          clearAccountFeedback('account-delete');
        }
      },
    });
  }, [auth, currentAuthEmail, deleteFlow, isPasswordLinked, openModal, openSurface, reauthenticateWithPassword, router, setDeleteConfirmation, setDeleteFlow, toast]);

  return { handleDeleteAccount };
}

export function useAccountSecurityActions({
  auth,
  currentAuthEmail,
  deleteFlow,
  emailFlow,
  isPasswordLinked,
  openModal,
  openSurface,
  passwordFlow,
  setEmailFlow,
  setDeleteConfirmation,
  setDeleteFlow,
  setLinkedProviderDescriptorsOverride,
  setLinkedProviderIdsOverride,
  setPasswordFlow,
  toast,
}) {
  const credentialActions = useAccountCredentialActions({
    auth,
    canUsePasswordSecurity: true,
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
  });

  const deleteAction = useAccountDeleteAction({
    auth,
    currentAuthEmail,
    deleteFlow,
    isPasswordLinked,
    openModal,
    openSurface,
    reauthenticateWithPassword: credentialActions.reauthenticateWithPassword,
    setDeleteConfirmation,
    setDeleteFlow,
    toast,
  });

  return {
    ...credentialActions,
    ...deleteAction,
  };
}
