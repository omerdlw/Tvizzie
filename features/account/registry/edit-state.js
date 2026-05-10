'use client';

import AccountAction from '@/features/navigation/actions/account-action';
import { Spinner } from '@/ui/loadings/spinner';
import { ACCOUNT_LOADING_NAV_PRIORITY, buildAccountLoadingState } from './common';

export function buildAccountEditState({
  activeTab,
  authIsAuthenticated,
  avatarPreview,
  deleteConfirmation,
  handleCancel,
  handleSignIn,
  handleSave,
  isGeneralAccountDirty,
  isLoading = false,
  isMediaUploading = false,
  mediaUploadFileName = '',
  isSaving,
  navRegistrySource,
  setActiveTab,
}) {
  const loadingState = buildAccountLoadingState({
    isLoading,
    navRegistrySource,
  });
  const editNavAction = !authIsAuthenticated ? (
    <AccountAction isAuthenticated={false} onSignIn={handleSignIn} />
  ) : isMediaUploading ? null : (
    <AccountAction
      mode="profile-edit"
      activeEditTab={activeTab}
      editTabs={[
        {
          key: 'general',
          icon: 'solar:user-circle-bold',
          label: 'General Info',
        },
        {
          key: 'security',
          icon: 'solar:shield-keyhole-bold',
          label: 'Security',
        },
      ]}
      onCancel={handleCancel}
      onEditTabChange={setActiveTab}
      onSave={handleSave}
      isCancelDisabled={isSaving || isMediaUploading}
      showCancelAction={activeTab === 'general' && isGeneralAccountDirty}
      isSaveDisabled={isMediaUploading}
      isSaveLoading={isSaving}
      saveLabel="Save"
      showSaveAction={activeTab === 'general' && isGeneralAccountDirty}
    />
  );

  return {
    loading: loadingState,
    nav: {
      actions:
        authIsAuthenticated && !isMediaUploading
          ? [
              {
                key: 'back-to-account',
                icon: 'solar:alt-arrow-left-bold',
                tooltip: 'Back to Account',
                order: -10,
                onClick: (event) => {
                  event.stopPropagation();
                  window.location.assign('/account');
                },
              },
            ]
          : [],
      confirmation: deleteConfirmation,
      title: authIsAuthenticated ? (isMediaUploading ? 'Media uploading' : 'Edit Account') : 'Account',
      icon: isMediaUploading ? <Spinner size={22} /> : avatarPreview,
      description: isLoading
        ? null
        : authIsAuthenticated
          ? isMediaUploading
            ? mediaUploadFileName || 'Uploading from device'
            : activeTab === 'general'
              ? 'Update your public account details'
              : 'Manage account security and providers'
          : 'Sign in to see your account',
      registry: navRegistrySource
        ? {
            priority: ACCOUNT_LOADING_NAV_PRIORITY,
            source: navRegistrySource,
          }
        : undefined,
      action: editNavAction,
    },
  };
}
