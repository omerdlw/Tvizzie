'use client'

import AccountAction from '@/features/navigation/actions/account-action'
import AccountBioMask from '@/features/navigation/masks/account-bio-mask'
import {
  EMPTY_ACCOUNT_REGISTRY_AUTH,
  buildAccountPageState,
  noopAccountRegistryHandler,
} from '@/features/account/account-registry-config'
import { useRegistry } from '@/modules/registry'

const ACCOUNT_ACTIVITY_REGISTRY_SOURCE = 'account-activity'

export default function Registry({
  activeScope = 'user',
  auth = EMPTY_ACCOUNT_REGISTRY_AUTH,
  canShowActivity = false,
  followState = 'follow',
  handleEditProfile = noopAccountRegistryHandler,
  handleFollow = noopAccountRegistryHandler,
  handleOpenFollowList = noopAccountRegistryHandler,
  handleSignInRequest = noopAccountRegistryHandler,
  isBioMaskOpen = false,
  isFollowLoading = false,
  isOwner = false,
  isPageLoading = false,
  isResolvingProfile = false,
  itemRemoveConfirmation = null,
  onScopeChange = noopAccountRegistryHandler,
  pendingFollowRequestCount = 0,
  profile = null,
  registrySource = ACCOUNT_ACTIVITY_REGISTRY_SOURCE,
  resolveError = null,
  setIsBioMaskOpen = noopAccountRegistryHandler,
  unfollowConfirmation = null,
  username,
}) {
  const scopeTabs = [
    {
      key: 'user',
      label: profile?.username || username || 'User',
    },
    {
      key: 'following',
      label: 'Following',
    },
  ]

  useRegistry(
    buildAccountPageState({
      authIsAuthenticated: auth.isAuthenticated,
      dismissMask: () => setIsBioMaskOpen(false),
      followState,
      handleEditProfile,
      handleFollow,
      handleOpenFollowList,
      handleSignInRequest,
      isFollowLoading,
      isOwner,
      isPageLoading,
      isResolvingProfile,
      isSectionEditing: false,
      isSectionOrderDirty: false,
      isSectionSaveLoading: false,
      itemRemoveConfirmation,
      listDeleteConfirmation: null,
      maskDismissible: true,
      navActionOverride: canShowActivity ? (
        <AccountAction
          mode="tab-switch"
          activeTab={activeScope}
          tabs={scopeTabs}
          onTabChange={onScopeChange}
        />
      ) : null,
      navDescription: 'Activity Feed',
      navMask:
        isBioMaskOpen && profile?.description ? (
          <AccountBioMask
            title={profile?.displayName || 'About'}
            description={profile.description}
            onClose={() => setIsBioMaskOpen(false)}
          />
        ) : undefined,
      navRegistrySource: registrySource,
      onSaveSectionOrder: null,
      pendingFollowRequestCount,
      profile,
      resolveError,
      unfollowConfirmation,
      username,
    })
  )

  return null
}
