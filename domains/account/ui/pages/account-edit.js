'use client';

import { useAccountEditPageState } from '@/domains/account/hooks/account-edit-page-state';
import { AccountEditView } from '@/domains/account/ui/sections/edit/account-edit-view';
import { AccountEditRegistry } from '@/domains/account/ui/registry';

export default function AccountEditPage({ initialSnapshot = null }) {
  const pageState = useAccountEditPageState({ initialSnapshot });
  const {
    activeTab,
    auth,
    avatarPreview,
    deleteConfirmation,
    handleCancel,
    handleSave,
    handleSignIn,
    isAnyMediaUploading,
    isGeneralAccountDirty,
    isLoading,
    isSaving,
    mediaUploadFileName,
    setActiveTab,
  } = pageState;
  const shouldRegisterEditRoute = auth?.isReady && !isLoading && auth?.isAuthenticated;

  return (
    <>
      {shouldRegisterEditRoute ? (
        <AccountEditRegistry
          activeTab={activeTab}
          authIsAuthenticated={auth.isAuthenticated}
          avatarPreview={avatarPreview}
          deleteConfirmation={deleteConfirmation}
          handleCancel={handleCancel}
          handleSignIn={handleSignIn}
          handleSave={handleSave}
          isGeneralAccountDirty={isGeneralAccountDirty}
          isLoading={false}
          isMediaUploading={isAnyMediaUploading}
          mediaUploadFileName={mediaUploadFileName}
          isSaving={isSaving}
          setActiveTab={setActiveTab}
        />
      ) : null}
      <AccountEditView {...pageState} />
    </>
  );
}
