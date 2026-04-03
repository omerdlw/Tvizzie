'use client'

import AccountAction from '@/features/navigation/actions/account-action'
import AccountBioSurface from '@/features/navigation/surfaces/account-bio-surface'
import {
  EMPTY_ACCOUNT_REGISTRY_AUTH,
  buildAccountPageState,
  noopAccountRegistryHandler,
} from '@/features/account/account-registry-config'
import { useRegistry } from '@/core/modules/registry'

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
  isBioSurfaceOpen = false,
  isFollowLoading = false,
  isOwner = false,
  isPageLoading = false,
  isResolvingProfile = false,
  itemRemoveConfirmation = null,
  pendingFollowRequestCount = 0,
  profile = null,
  registrySource = ACCOUNT_LIKES_REGISTRY_SOURCE,
  resolveError = null,
  setIsBioSurfaceOpen = noopAccountRegistryHandler,
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
      navActionOverride: canShowLikesGrid ? (
        <AccountAction
          mode="tab-switch"
          activeTab={activeSegment}
          tabs={segmentTabs}
          onTabChange={handleSegmentChange}
        />
      ) : null,
      navDescription: 'Likes',
      navSurface:
        isBioSurfaceOpen && profile?.description ? (
          <AccountBioSurface
            title={profile?.displayName || 'About'}
            description={profile.description}
            onClose={() => setIsBioSurfaceOpen(false)}
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
