'use client';

import { getFollowState } from '@/domains/account/utils';
import { useAccountPageActions } from './page-actions.hooks';
import { useAccountPageData } from './page-data.hooks';

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
  const pageData = useAccountPageData({
    activeListId,
    activeTab,
    auth,
    collectionPreviewLimits,
    initialCollections,
    initialProfile,
    initialResolvedUserId,
    initialResolveError,
    isSocialFollowsEnabled: true,
    username,
  });
  const {
    canViewPrivateContent,
    followRelationship,
    hasResolvedAccessState,
    isAuthSessionReady,
    isCurrentAccountMissing,
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
    updateQuery: () => {},
    profileHandle: username,
  });

  return {
    ...pageActions,
    ...pageData,
    canViewProfileCollections: !isPrivateProfile || isOwner || canViewPrivateContent,
    followState: getFollowState(followRelationship),
    isPageLoading:
      isResolvingProfile ||
      (!isCurrentAccountMissing &&
        Boolean(resolvedUserId) &&
        (!profile || !hasResolvedAccessState)),
    isViewerReady: auth.isReady && isAuthSessionReady,
  };
}
