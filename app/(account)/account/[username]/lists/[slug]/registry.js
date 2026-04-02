'use client'

import AccountBioMask from '@/features/navigation/masks/account-bio-mask'
import {
  EMPTY_ACCOUNT_REGISTRY_AUTH,
  buildAccountPageState,
  noopAccountRegistryHandler,
} from '@/features/account/account-registry-config'
import { useRegistry } from '@/modules/registry'

const ACCOUNT_LIST_DETAIL_REGISTRY_SOURCE = 'account-list-detail'

export default function Registry({
  auth = EMPTY_ACCOUNT_REGISTRY_AUTH,
  followState = 'follow',
  handleDeleteList = noopAccountRegistryHandler,
  handleEditList = noopAccountRegistryHandler,
  handleEditProfile = noopAccountRegistryHandler,
  handleFollow = noopAccountRegistryHandler,
  handleOpenFollowList = noopAccountRegistryHandler,
  handleSignInRequest = noopAccountRegistryHandler,
  handleToggleLike = noopAccountRegistryHandler,
  isBioMaskOpen = false,
  isFollowLoading = false,
  isLiked = false,
  isLikeLoading = false,
  isOwner = false,
  isPageLoading = false,
  isResolvingProfile = false,
  itemRemoveConfirmation = null,
  list,
  listDeleteConfirmation,
  pendingFollowRequestCount = 0,
  profile = null,
  registrySource = ACCOUNT_LIST_DETAIL_REGISTRY_SOURCE,
  resolveError = null,
  reviewState,
  showProfileFollowAction = false,
  setIsBioMaskOpen = noopAccountRegistryHandler,
  unfollowConfirmation = null,
  username,
}) {
  const canLikeList = Boolean(list) && !showProfileFollowAction

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
      listDeleteConfirmation,
      maskDismissible: true,
      navDescription: list?.title ? `Lists / ${list.title}` : 'List',
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
      isLiked: canLikeList ? isLiked : false,
      isLikeLoading: canLikeList ? isLikeLoading : false,
      onDeleteList: handleDeleteList,
      onEditList: () => handleEditList(list),
      onToggleLike: canLikeList ? handleToggleLike : null,
      reviewState,
      showProfileFollowAction,
    })
  )

  return null
}
