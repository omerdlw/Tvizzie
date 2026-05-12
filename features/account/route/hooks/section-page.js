'use client';

import { useEffect, useState } from 'react';

import { useAccountPageActions } from '@/features/account/route/hooks/page-actions';
import { useAccountPageData } from '@/features/account/route/hooks/page-data';
import { getFollowState } from '@/features/account/route/nav-utils';
export {
  hasMatchingSeededFeed,
  shouldBlockAccountFeedLoad,
  useDeferredPreviewFeed,
  useSeededFeedState,
} from '@/features/account/collections/feed-state';

function noop() {}

const IS_SOCIAL_FOLLOWS_ENABLED = true;

export function useAccountSectionPage({
  activeListId = '',
  activeTab,
  auth,
  collectionPreviewLimits = null,
  initialCollections = null,
  initialProfile = null,
  initialResolvedUserId = null,
  initialResolveError = null,
  selectedList = null,
  username,
}) {
  const [isBioSurfaceOpen, setIsBioSurfaceOpen] = useState(false);
  const pageData = useAccountPageData({
    activeListId,
    activeTab,
    auth,
    collectionPreviewLimits,
    initialCollections,
    initialProfile,
    initialResolvedUserId,
    initialResolveError,
    isSocialFollowsEnabled: IS_SOCIAL_FOLLOWS_ENABLED,
    username,
  });
  const {
    canViewPrivateContent,
    followRelationship,
    hasResolvedAccessState,
    isAuthSessionReady,
    isLoadingCollections,
    isOwner,
    isResolvingProfile,
    isPrivateProfile,
    listItems,
    profile,
    resolvedUserId,
    setLikes,
    setLists,
    setListItems,
    setWatched,
    setWatchlist,
  } = pageData;

  useEffect(() => {
    setIsBioSurfaceOpen(false);
  }, [profile?.description, resolvedUserId]);

  const pageActions = useAccountPageActions({
    activeListId,
    auth,
    canViewPrivateContent,
    followRelationship,
    isOwner,
    isPrivateProfile,
    listItems,
    profile,
    resolvedUserId,
    selectedList,
    setLikes,
    setLists,
    setListItems,
    setWatched,
    setWatchlist,
    updateQuery: noop,
    profileHandle: username,
  });

  const canViewProfileCollections = !isPrivateProfile || isOwner || canViewPrivateContent;

  return {
    ...pageActions,
    ...pageData,
    canViewProfileCollections,
    followState: getFollowState(followRelationship),
    isBioSurfaceOpen,
    isPageLoading:
      isResolvingProfile ||
      (Boolean(resolvedUserId) &&
        (!profile || !hasResolvedAccessState || (canViewPrivateContent && isLoadingCollections))),
    isViewerReady: auth.isReady && isAuthSessionReady,
    setIsBioSurfaceOpen,
  };
}
