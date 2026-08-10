import { FOLLOW_STATUSES } from '@/domains/social/client/follows';

export function getMediaTitle(item = {}) {
  return item?.title || item?.name || item?.original_title || item?.original_name || 'Untitled';
}

export function sortAccountItems(items, sortMethod) {
  if (!items || items.length === 0) return [];

  const sorted = [...items];
  const getPositionValue = (item) => {
    if (Number.isFinite(Number(item?.position))) {
      return Number(item.position);
    }
    const addedAt = new Date(item?.addedAt || '').getTime();
    return Number.isFinite(addedAt) ? addedAt : 0;
  };

  switch (sortMethod) {
    case 'default':
      return sorted.sort((first, second) => getPositionValue(second) - getPositionValue(first));
    case 'newest':
      return sorted.sort((first, second) => new Date(second.addedAt) - new Date(first.addedAt));
    case 'oldest':
      return sorted.sort((first, second) => new Date(first.addedAt) - new Date(second.addedAt));
    case 'rating_high':
      return sorted.sort((first, second) => (second.vote_average || 0) - (first.vote_average || 0));
    case 'rating_low':
      return sorted.sort((first, second) => (first.vote_average || 0) - (second.vote_average || 0));
    case 'title_az':
      return sorted.sort((first, second) =>
        getMediaTitle(first).localeCompare(getMediaTitle(second)),
      );
    default:
      return sorted;
  }
}

export function removeAccountCollectionItem(items = [], itemToRemove) {
  const removedId = String(itemToRemove?.entityId || itemToRemove?.id || '').trim();
  const removedType = String(itemToRemove?.media_type || itemToRemove?.entityType || '')
    .trim()
    .toLowerCase();

  return items.filter((item) => {
    if (itemToRemove?.mediaKey && item?.mediaKey) {
      return item.mediaKey !== itemToRemove.mediaKey;
    }
    return (
      String(item?.entityId || item?.id || '').trim() !== removedId ||
      String(item?.media_type || item?.entityType || '')
        .trim()
        .toLowerCase() !== removedType
    );
  });
}

export function formatPaginationSummaryLabel({
  emptyLabel = '0 items',
  pageSize,
  startIndex,
  totalCount,
}) {
  if (!Number.isFinite(totalCount) || totalCount <= 0) {
    return emptyLabel;
  }
  const safeStart = Math.max(0, Number(startIndex) || 0);
  const safeSize = Math.max(1, Number(pageSize) || 1);
  const visibleFrom = safeStart + 1;
  const visibleTo = Math.min(safeStart + safeSize, totalCount);

  return `${visibleFrom}-${visibleTo} of ${totalCount}`;
}

export function buildAccountCollectionPageHref(basePath, pageNumber) {
  if (!basePath) return '';
  const [pathname, search = ''] = basePath.split('?');
  const params = new URLSearchParams(search);

  if (pageNumber <= 1) {
    params.delete('page');
  } else {
    params.set('page', String(pageNumber));
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function getFollowState(followRelationship) {
  if (followRelationship.outboundStatus === FOLLOW_STATUSES.ACCEPTED) return 'following';
  if (followRelationship.outboundStatus === FOLLOW_STATUSES.PENDING) return 'requested';
  if (followRelationship.showFollowBack) return 'follow_back';
  return 'follow';
}

export function getNavDescription({ activeTab, auth, selectedList, username }) {
  if (!username && auth.isReady && !auth.isAuthenticated) {
    return 'Sign in to see your account';
  }

  if (activeTab === 'likes') return 'Likes';
  if (activeTab === 'activity') return 'Recent Activity';
  if (activeTab === 'watched') return 'Watched';
  if (activeTab === 'watchlist') return 'Watchlist';
  if (activeTab === 'reviews') return 'Reviews';
  if (activeTab === 'liked_reviews') return 'Liked Reviews';
  if (activeTab === 'liked_lists') return 'Liked Lists';

  if (activeTab === 'lists') {
    if (selectedList) return `Lists / ${selectedList.title}`;
    return 'Custom Lists';
  }

  return '';
}

export function getIsFullScreenEmpty({
  activeTab,
  canViewPrivateContent,
  likes,
  isLoadingCollections,
  isLoadingListItems,
  isOwner,
  isPrivateProfile,
  listItems,
  lists,
  selectedList,
  watchlist,
}) {
  if (!isOwner && isPrivateProfile && !canViewPrivateContent) return true;

  if (activeTab === 'likes') return isLoadingCollections || likes.length === 0;
  if (activeTab === 'watchlist') return isLoadingCollections || watchlist.length === 0;
  if (activeTab === 'lists') {
    if (isLoadingCollections) return true;
    if (!selectedList) return lists.length === 0;
    return isLoadingListItems || listItems.length === 0;
  }

  return false;
}
