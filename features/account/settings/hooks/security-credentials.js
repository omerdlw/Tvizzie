'use client';

import { useCallback } from 'react';
import { useAccountEmailCredentialAction } from './email-credentials';
import { useAccountPasswordCredentialActions } from './password-credentials';
import { openAccountVerificationPrompt } from './security-verification';

export { openAccountVerificationPrompt } from './security-verification';

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
