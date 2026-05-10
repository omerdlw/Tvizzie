'use client';

import { useAccountCollectionActions } from './collection-actions';
import { useAccountFollowActions } from './follow-actions';

export { useAccountHeroHeight } from './hero-height';
export { useAccountPageQueryState } from './page-query-state';

export function useAccountPageActions({
  activeListId,
  auth,
  canViewPrivateContent = false,
  followRelationship,
  isOwner,
  isPrivateProfile = false,
  profile,
  resolvedUserId,
  selectedList,
  listItems = [],
  setLikes,
  setLists,
  setListItems,
  setWatched,
  setWatchlist,
  updateQuery,
  profileHandle,
}) {
  const collectionActions = useAccountCollectionActions({
    activeListId,
    auth,
    isOwner,
    listItems,
    profileHandle,
    selectedList,
    setLikes,
    setLists,
    setListItems,
    setWatched,
    setWatchlist,
    updateQuery,
  });
  const followActions = useAccountFollowActions({
    auth,
    canViewPrivateContent,
    followRelationship,
    isOwner,
    isPrivateProfile,
    profile,
    resolvedUserId,
  });

  return {
    ...collectionActions,
    ...followActions,
  };
}
