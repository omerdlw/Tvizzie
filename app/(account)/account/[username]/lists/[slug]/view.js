'use client';

import { useState } from 'react';

import AccountListDetailFeed from '@/features/account/feeds/list-detail';
import SearchAction from '@/features/navigation/actions/search-action';
import { noopAccountRegistryHandler } from '@/features/account/registry-config';
import { useRegistry } from '@/core/modules/registry';
import { buildAccountRegistryState } from '../../../shared/registry-state';

const ACCOUNT_LIST_DETAIL_REGISTRY_SOURCE = 'account-list-detail';

export function Registry({
  auth,
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
  showProfileFollowAction = true,
  setIsBioSurfaceOpen = noopAccountRegistryHandler,
  unfollowConfirmation = null,
  username,
}) {
  const [isSearching, setIsSearching] = useState(false);
  const canLikeList = Boolean(list);
  const navCountsDescription = list
    ? `${listItemsCount} items · ${list?.likesCount || 0} likes · ${list?.reviewsCount || 0} reviews`
    : null;

  useRegistry(
    buildAccountRegistryState(
      {
        auth,
        followState,
        handleEditProfile,
        handleFollow,
        handleOpenFollowList,
        handleSignInRequest,
        isBioSurfaceOpen,
        isFollowLoading,
        isOwner,
        isPageLoading,
        isResolvingProfile,
        itemRemoveConfirmation,
        pendingFollowRequestCount,
        profile,
        resolveError,
        setIsBioSurfaceOpen,
        unfollowConfirmation,
        username,
      },
      {
        extraNavActions: [
          {
            key: 'search-overlay',
            tooltip: 'Search',
            icon: isSearching ? 'material-symbols:close-rounded' : 'solar:magnifer-linear',
            order: 30,
            onClick: (event) => {
              event.stopPropagation();
              setIsSearching((value) => !value);
            },
          },
        ],
        listDeleteConfirmation,
        navDescription: navCountsDescription,
        navActionOverride: !reviewState?.isActive && isSearching ? <SearchAction /> : null,
        navRegistrySource: registrySource,
        isLiked: canLikeList ? isLiked : false,
        isLikeLoading: canLikeList ? isLikeLoading : false,
        onDeleteList: list ? () => handleDeleteList(list) : null,
        onEditList: list ? () => handleEditList(list) : null,
        onToggleLike: list ? handleToggleLike : null,
        reviewState,
        showProfileFollowAction: Boolean(list) && showProfileFollowAction,
        showToolbarFollowActionWithOverride: Boolean(list) && !isSearching,
      }
    )
  );

  return null;
}

export default function ListView({ model = null }) {
  return <AccountListDetailFeed model={model} RegistryComponent={Registry} />;
}
