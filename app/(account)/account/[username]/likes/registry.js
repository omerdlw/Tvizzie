'use client'

import AccountAction from '@/features/navigation/actions/account-action'
import AccountBioMask from '@/features/navigation/masks/account-bio-mask'
import {
  EMPTY_ACCOUNT_REGISTRY_AUTH,
  buildAccountPageState,
  noopAccountRegistryHandler,
} from '@/features/account/account-registry-config'
import { useRegistry } from '@/modules/registry'

const ACCOUNT_LIKES_REGISTRY_SOURCE = 'account-likes'

export default function Registry({
  activeSegment = 'films',
  auth = EMPTY_ACCOUNT_REGISTRY_AUTH,
  canShowLikesGrid = false,
  followState = 'follow',
  handleEditProfile = noopAccountRegistryHandler,
  handleFollow = noopAccountRegistryHandler,
  handleOpenFollowList = noopAccountRegistryHandler,
  handleSegmentChange = noopAccountRegistryHandler,
  handleSignInRequest = noopAccountRegistryHandler,
  isBioMaskOpen = false,
  isFollowLoading = false,
  isOwner = false,
  isPageLoading = false,
  isResolvingProfile = false,
  itemRemoveConfirmation = null,
  pendingFollowRequestCount = 0,
  profile = null,
  registrySource = ACCOUNT_LIKES_REGISTRY_SOURCE,
  resolveError = null,
  setIsBioMaskOpen = noopAccountRegistryHandler,
  unfollowConfirmation = null,
  username,
}) {
  const segmentTabs = [
    { key: 'films', label: 'Films' },
    { key: 'reviews', label: 'Reviews' },
    { key: 'lists', label: 'Lists' },
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
      navActionOverride: canShowLikesGrid ? (
        <AccountAction
          mode="tab-switch"
          activeTab={activeSegment}
          tabs={segmentTabs}
          onTabChange={handleSegmentChange}
        />
      ) : null,
      navDescription: 'Likes',
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
