'use client';

import AccountBioSurface from '@/features/navigation/surfaces/account-bio-surface';
import {
  EMPTY_ACCOUNT_REGISTRY_AUTH,
  buildAccountPageState,
  noopAccountRegistryHandler,
} from '@/features/account/registry-config';
import { useRegistry } from '@/core/modules/registry';

const ACCOUNT_LIST_DETAIL_REGISTRY_SOURCE = 'account-list-detail';

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
  isBioSurfaceOpen = false,
  isFollowLoading = false,
  isLiked = false,
  isLikeLoading = false,
  isOwner = false,
  isPageLoading = false,
  isResolvingProfile = false,
  itemRemoveConfirmation = null,
  list,
  listItemsCount = 0,
  listDeleteConfirmation,
  pendingFollowRequestCount = 0,
  profile = null,
  registrySource = ACCOUNT_LIST_DETAIL_REGISTRY_SOURCE,
  resolveError = null,
  reviewState,
  showProfileFollowAction = false,
  setIsBioSurfaceOpen = noopAccountRegistryHandler,
  unfollowConfirmation = null,
  username,
}) {
  const canLikeList = Boolean(list);
  const navCountsDescription = list
    ? `${listItemsCount} items · ${list?.likesCount || 0} likes · ${list?.reviewsCount || 0} reviews`
    : 'List';

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
      listDeleteConfirmation,
      navDescription: navCountsDescription,
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
      isLiked: canLikeList ? isLiked : false,
      isLikeLoading: canLikeList ? isLikeLoading : false,
      onDeleteList: () => handleDeleteList(list),
      onEditList: () => handleEditList(list),
      onToggleLike: canLikeList ? handleToggleLike : null,
      reviewState,
      showProfileFollowAction,
    })
  );

  return null;
}
