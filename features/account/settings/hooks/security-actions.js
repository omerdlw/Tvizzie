'use client';

import { useCallback, useState } from 'react';

import { useAccountDeleteAction } from './delete-account-action';
import { useAccountEmailCredentialAction } from './email-credentials';
import { useAccountPasswordCredentialActions } from './password-credentials';
import AuthVerificationForm from '@/features/auth/auth-verification-form';
import AuthVerificationSurface from '@/core/modules/nav/surfaces/auth-verification-surface';
import { clearAccountFeedback, emitAccountFeedback } from '../../feedback/account-feedback';
import { normalizeEmail, normalizeProviderDescriptors } from '../normalizers';
import { resolveSecurityErrorMessage } from '../security';

export { useAccountDeleteAction } from './delete-account-action';

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
      const providerDescriptors = Array.isArray(
        session?.metadata?.providerDescriptors ||
          session?.user?.metadata?.providerDescriptors ||
          auth?.user?.metadata?.providerDescriptors
      )
        ? normalizeProviderDescriptors(
            session?.metadata?.providerDescriptors ||
              session?.user?.metadata?.providerDescriptors ||
              auth?.user?.metadata?.providerDescriptors ||
              []
          )
        : [];

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

  const { handleCompletePasswordChange, handleSetPassword, reauthenticateWithPassword } =
    useAccountPasswordCredentialActions({
      auth,
      canUsePasswordSecurity,
      currentAuthEmail,
      openVerificationModal,
      passwordFlow,
      setLinkedProviderDescriptorsOverride,
      setLinkedProviderIdsOverride,
      setPasswordFlow,
      toast,
    });

  const handleCompleteEmailChange = useAccountEmailCredentialAction({
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
  });

  return {
    handleCompleteEmailChange,
    handleCompletePasswordChange,
    handleSetPassword,
    reauthenticateWithPassword,
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
