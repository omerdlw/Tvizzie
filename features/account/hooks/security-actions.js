'use client';

import {
  AUTH_PURPOSE,
  clearAccountFeedback,
  deleteAccountRequest,
  emitAccountFeedback,
  normalizeProviderDescriptors,
  resolveSecurityErrorMessage,
} from '../utils';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { openAccountVerificationPrompt, useAccountCredentialActions } from './security-credentials';

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
          toast.success('Account deleted');
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

export function useAccountGoogleLinking({
  auth,
  isSaving,
  setLinkedProviderDescriptorsOverride,
  setLinkedProviderIdsOverride,
  supportsGoogleLinking,
  toast,
}) {
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);

  const updateLinkedProvidersFromSession = useCallback(
    (session) => {
      const providerIds =
        session?.metadata?.providerIds ||
        session?.user?.metadata?.providerIds ||
        auth?.user?.metadata?.providerIds ||
        [];
      const providerDescriptors = normalizeProviderDescriptors(
        session?.metadata?.providerDescriptors ||
          session?.user?.metadata?.providerDescriptors ||
          auth?.user?.metadata?.providerDescriptors ||
          []
      );

      if (Array.isArray(providerIds)) {
        setLinkedProviderIdsOverride(providerIds);
      }

      if (typeof setLinkedProviderDescriptorsOverride === 'function') {
        setLinkedProviderDescriptorsOverride(providerDescriptors);
      }
    },
    [
      auth?.user?.metadata?.providerDescriptors,
      auth?.user?.metadata?.providerIds,
      setLinkedProviderDescriptorsOverride,
      setLinkedProviderIdsOverride,
    ]
  );

  const handleLinkGoogle = useCallback(async () => {
    if (isLinkingGoogle || isSaving || !supportsGoogleLinking) {
      return;
    }

    setIsLinkingGoogle(true);
    try {
      emitAccountFeedback('google-link', 'start');
      const session = await auth.linkProvider({
        googleAuthIntent: 'link',
        provider: 'google',
      });
      updateLinkedProvidersFromSession(session);
      emitAccountFeedback('google-link', 'success');
      toast.success('Google account linked successfully');
    } catch (error) {
      clearAccountFeedback('google-link');
      try {
        if (typeof auth.refreshSession === 'function') {
          const refreshedSession = await auth.refreshSession();
          updateLinkedProvidersFromSession(refreshedSession);
        } else {
          setLinkedProviderIdsOverride(null);
        }
      } catch {
        if (typeof setLinkedProviderDescriptorsOverride === 'function') {
          setLinkedProviderDescriptorsOverride(null);
        }
        setLinkedProviderIdsOverride(null);
      }
      toast.error(resolveSecurityErrorMessage(error, 'Google account could not be linked'));
    } finally {
      setIsLinkingGoogle(false);
    }
  }, [
    auth,
    isLinkingGoogle,
    isSaving,
    setLinkedProviderDescriptorsOverride,
    setLinkedProviderIdsOverride,
    supportsGoogleLinking,
    toast,
    updateLinkedProvidersFromSession,
  ]);

  return {
    handleLinkGoogle,
    isLinkingGoogle,
  };
}

export function useAccountSecurityActions({
  auth,
  canUsePasswordSecurity,
  currentAuthEmail,
  deleteFlow,
  emailFlow,
  isPasswordLinked,
  isSaving,
  openModal,
  openSurface,
  passwordFlow,
  setDeleteConfirmation,
  setDeleteFlow,
  setEmailFlow,
  setLinkedProviderDescriptorsOverride,
  setLinkedProviderIdsOverride,
  setPasswordFlow,
  supportsGoogleLinking,
  toast,
}) {
  const { handleCompleteEmailChange, handleCompletePasswordChange, handleSetPassword, reauthenticateWithPassword } =
    useAccountCredentialActions({
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
    });

  const { handleDeleteAccount } = useAccountDeleteAction({
    auth,
    currentAuthEmail,
    deleteFlow,
    isPasswordLinked,
    openModal,
    openSurface,
    reauthenticateWithPassword,
    setDeleteConfirmation,
    setDeleteFlow,
    toast,
  });

  const { handleLinkGoogle, isLinkingGoogle } = useAccountGoogleLinking({
    auth,
    isSaving,
    setLinkedProviderDescriptorsOverride,
    setLinkedProviderIdsOverride,
    supportsGoogleLinking,
    toast,
  });

  return {
    handleCompleteEmailChange,
    handleCompletePasswordChange,
    handleDeleteAccount,
    handleLinkGoogle,
    handleSetPassword,
    isLinkingGoogle,
  };
}
