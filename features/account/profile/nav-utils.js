import { FOLLOW_STATUSES } from '@/core/services/social/follows.service';
import { getUserAvatarUrl } from '@/core/utils';

export function getAvatarFallback(profile) {
  return getUserAvatarUrl(profile);
}

export function getFollowState(followRelationship) {
  if (followRelationship.outboundStatus === FOLLOW_STATUSES.ACCEPTED) {
    return 'following';
  }

  if (followRelationship.outboundStatus === FOLLOW_STATUSES.PENDING) {
    return 'requested';
  }

  if (followRelationship.showFollowBack) {
    return 'follow_back';
  }

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
    if (selectedList) {
      return `Lists / ${selectedList.title}`;
    }

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
  if (!isOwner && isPrivateProfile && !canViewPrivateContent) {
    return true;
  }

  if (activeTab === 'likes') {
    return isLoadingCollections || likes.length === 0;
  }

  if (activeTab === 'watchlist') {
    return isLoadingCollections || watchlist.length === 0;
  }

  if (activeTab === 'lists') {
    if (isLoadingCollections) return true;
    if (!selectedList) return lists.length === 0;
    return isLoadingListItems || listItems.length === 0;
  }

  return false;
}
