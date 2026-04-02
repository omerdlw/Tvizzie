'use client'

import { getUserAvatarUrl } from '@/lib/utils'
import AccountAction from '@/features/navigation/actions/account-action'
import { useRegistry } from '@/modules/registry'

const ACCOUNT_LISTS_NEW_REGISTRY_SOURCE = 'account-lists-new'

export default function Registry({
  authIsAuthenticated,
  authIsReady,
  isLoading,
  isSaving,
  onSave,
  profile,
  registrySource = ACCOUNT_LISTS_NEW_REGISTRY_SOURCE,
  saveDisabled,
}) {
  useRegistry({
    nav: {
      title: 'Create List',
      description: 'Search titles and publish a list in one flow',
      icon: getUserAvatarUrl(profile),
      isLoading: !authIsReady || isLoading,
      registry: {
        priority: 190,
        source: registrySource,
      },
      action: authIsAuthenticated ? (
        <AccountAction
          mode="save"
          onSave={onSave}
          isSaveDisabled={saveDisabled}
          saveLabel="Create List"
          isSaveLoading={isSaving}
        />
      ) : null,
    },
  })

  return null
}
