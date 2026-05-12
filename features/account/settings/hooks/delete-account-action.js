'use client';

import { clearAccountFeedback, emitAccountFeedback } from '../../feedback/account-feedback';
import { AUTH_PURPOSE, deleteAccountRequest, resolveSecurityErrorMessage } from '../security';
import { useRouter } from 'next/navigation';
import { useCallback, useRef } from 'react';
import { openAccountVerificationPrompt } from './security-actions';

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

  const openVerificationModal = useCallback(
    async ({ purpose, email, title, description }) => {
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

  const handleDeleteAccount = useCallback(async () => {
    if (deleteFlow.isSubmitting || deleteRequestLockRef.current) {
      return;
    }

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
        if (deleteRequestLockRef.current) {
          return;
        }

        deleteRequestLockRef.current = true;
        setDeleteFlow((prev) => ({ ...prev, isSubmitting: true }));

        try {
          if (isPasswordLinked) {
            await reauthenticateWithPassword(currentPassword);
          }

          const verification = await openVerificationModal({
            description: 'Verify your current email before deletion',
            email: currentAuthEmail,
            purpose: AUTH_PURPOSE.ACCOUNT_DELETE,
            title: 'Delete account verification',
          });

          if (!verification?.success) {
            setDeleteConfirmation(null);
            setDeleteFlow((prev) => ({ ...prev, isSubmitting: false }));
            return;
          }

          emitAccountFeedback('account-delete', 'start');

          const result = await deleteAccountRequest({
            currentPassword: isPasswordLinked ? currentPassword : '',
          });

          setDeleteConfirmation(null);

          if (result?.nextAction === 'signed_out') {
            await auth.signOut({
              reason: 'delete-account',
            });
          }

          emitAccountFeedback('account-delete', 'success');
          router.replace('/');
        } catch (error) {
          clearAccountFeedback('account-delete');
          setDeleteFlow((prev) => ({ ...prev, isSubmitting: false }));
          toast.error(resolveSecurityErrorMessage(error, 'Account could not be deleted'));
          throw error;
        } finally {
          deleteRequestLockRef.current = false;
        }
      },
      title: 'Delete Account?',
    });
  }, [
    auth,
    currentAuthEmail,
    deleteFlow,
    isPasswordLinked,
    openVerificationModal,
    reauthenticateWithPassword,
    router,
    setDeleteConfirmation,
    setDeleteFlow,
    toast,
  ]);

  return { handleDeleteAccount };
}
