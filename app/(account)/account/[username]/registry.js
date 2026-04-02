'use client'

import AccountBioMask from '@/features/navigation/masks/account-bio-mask'
import {
  EMPTY_ACCOUNT_REGISTRY_AUTH,
  buildAccountPageState,
  noopAccountRegistryHandler,
} from '@/features/account/account-registry-config'
import { useRegistry } from '@/modules/registry'

const ACCOUNT_PROFILE_OVERVIEW_REGISTRY_SOURCE = 'account-profile-overview'

export default function Registry({
  auth = EMPTY_ACCOUNT_REGISTRY_AUTH,
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
  navDescription,
  pendingFollowRequestCount = 0,
  profile = null,
  registrySource = ACCOUNT_PROFILE_OVERVIEW_REGISTRY_SOURCE,
  resolveError = null,
  setIsBioMaskOpen = noopAccountRegistryHandler,
  unfollowConfirmation = null,
  username,
}) {
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
      navDescription,
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
      showProfileFollowAction: true,
      unfollowConfirmation,
      username,
    })
  )

  return null
}
