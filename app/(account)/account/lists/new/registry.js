'use client';

import { getUserAvatarUrl } from '@/core/utils';
import AccountAction from '@/features/navigation/actions/account-action';
import { useRegistry } from '@/core/modules/registry';

export default function Registry({
  authIsAuthenticated,
  authIsReady,
  isLoading,
  isSaving,
  onSave,
  profile,
  saveDisabled,
}) {
  useRegistry({
    loading: {
      isLoading: !authIsReady || isLoading,
      showOverlay: false,
      registry: {
        source: 'account-lists-new',
      },
    },
    nav: {
      title: 'Create List',
      description: 'Search titles and publish a list in one flow',
      icon: getUserAvatarUrl(profile),
      registry: {
        priority: 190,
        source: 'account-lists-new',
      },
      action: authIsAuthenticated ? (
        <AccountAction
          isSaveDisabled={saveDisabled}
          isSaveLoading={isSaving}
          saveLabel="Create List"
          onSave={onSave}
          mode="save"
        />
      ) : null,
    },
  });

  return null;
}
