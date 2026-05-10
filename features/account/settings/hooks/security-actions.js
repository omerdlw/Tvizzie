'use client';

import { useAccountDeleteAction } from './delete-account-action';
import { useAccountGoogleLinking } from './google-linking-action';
import { useAccountCredentialActions } from './security-credentials';

export { useAccountDeleteAction } from './delete-account-action';
export { useAccountGoogleLinking } from './google-linking-action';

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
