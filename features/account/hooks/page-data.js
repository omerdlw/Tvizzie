'use client';

import { useAccountProfile, useResolvedAccountUser } from '@/core/modules/account';
import { useAuthSessionReady } from '@/core/modules/auth';
import { useToast } from '@/core/modules/notification/hooks';
import { notifyAccountLoadError } from '../utils';
import { useCallback, useMemo } from 'react';
import { useAccountCollections } from './collections';
import { useAccountListItems, useAccountRelationshipData, useAccountSocialProof } from './relationships';

export function useAccountPageData({
  activeListId,
  activeTab,
  auth,
  collectionPreviewLimits = null,
  initialCollections = null,
  initialProfile = null,
  initialResolvedUserId = null,
  initialResolveError = null,
  isSocialFollowsEnabled,
  username,
}) {
  const isAuthSessionReady = useAuthSessionReady(auth.isAuthenticated ? auth.user?.id || null : null);
  const toast = useToast();
  const handleProfileError = useCallback(
    (error) => {
      notifyAccountLoadError(toast, error, 'Profile could not be loaded');
    },
    [toast]
  );
  const { isResolvingProfile, resolveError, resolvedUserId } = useResolvedAccountUser({
    authUserId: auth.user?.id || null,
    initialResolvedUserId,
    initialResolveError,
    username,
  });
  const { profile } = useAccountProfile({
    resolvedUserId,
    initialProfile,
    onError: handleProfileError,
  });

  const isOwner = useMemo(() => {
    if (!username) {
      return Boolean(auth.user?.id || initialResolvedUserId);
    }

    if (!auth.isAuthenticated || !auth.user?.id) return false;
    return profile?.id === auth.user.id || resolvedUserId === auth.user.id;
  }, [auth.isAuthenticated, auth.user?.id, initialResolvedUserId, profile?.id, resolvedUserId, username]);

  const isPrivateProfile = profile?.isPrivate === true;

  const { followerCount, followingCount, followRelationship, pendingFollowRequestCount } = useAccountRelationshipData({
    authIsReady: auth.isReady && isAuthSessionReady,
    authUserId: auth.user?.id || null,
    canManageRequests: Boolean(isOwner && isSocialFollowsEnabled && isPrivateProfile),
    isOwner,
    isPrivateProfile,
    isProfileLoaded: Boolean(profile),
    publicFollowerCount: Number(profile?.followerCount || 0),
    publicFollowingCount: Number(profile?.followingCount || 0),
    resolvedUserId,
  });

  const hasKnownPrivacyState =
    !resolvedUserId || isOwner || Boolean(profile) || followRelationship.isTargetProfileLoaded;
  const normalizedIsPrivateProfile = hasKnownPrivacyState
    ? isPrivateProfile || followRelationship.isPrivateProfile
    : Boolean(resolvedUserId) && !isOwner;
  const requiresPrivateAccessResolution =
    hasKnownPrivacyState && Boolean(resolvedUserId) && !isOwner && normalizedIsPrivateProfile;
  const hasResolvedAccessState =
    !resolvedUserId ||
    (hasKnownPrivacyState &&
      (!requiresPrivateAccessResolution ||
        (auth.isReady &&
          (!auth.isAuthenticated || (isAuthSessionReady && followRelationship.isOutboundRelationshipLoaded)))));
  const canViewPrivateContent = isOwner || !normalizedIsPrivateProfile || followRelationship.canViewPrivateContent;

  const {
    collectionCounts,
    isLoadingCollections,
    likes,
    lists,
    setLikes,
    setLists,
    setWatched,
    setWatchlist,
    watched,
    watchlist,
  } = useAccountCollections({
    activeTab,
    authIsAuthenticated: auth.isAuthenticated,
    authIsReady: auth.isReady && isAuthSessionReady,
    canViewPrivateContent,
    initialCollections,
    isOwner,
    isPrivateProfile: normalizedIsPrivateProfile,
    previewLimits: collectionPreviewLimits,
    resolvedUserId,
  });

  const { isLoadingListItems, listItems, setListItems } = useAccountListItems({
    activeListId,
    activeTab,
    canViewPrivateContent,
    isOwner,
    isPrivateProfile: normalizedIsPrivateProfile,
    resolvedUserId,
  });

  const { profileSocialProof } = useAccountSocialProof({
    authUserId: auth.user?.id || null,
    canViewPrivateContent,
    isOwner,
    isSocialFollowsEnabled,
    resolvedUserId,
  });

  return {
    canViewPrivateContent,
    favoriteShowcase: Array.isArray(profile?.favoriteShowcase) ? profile.favoriteShowcase : [],
    followerCount,
    followingCount,
    followRelationship,
    hasResolvedAccessState,
    likeCount: collectionCounts.likes === null ? likes.length : collectionCounts.likes,
    isLoadingCollections,
    isLoadingListItems,
    isAuthSessionReady,
    isOwner,
    isPrivateProfile: normalizedIsPrivateProfile,
    isResolvingProfile,
    likes,
    listCount: collectionCounts.lists === null ? lists.length : collectionCounts.lists,
    listItems,
    lists,
    pendingFollowRequestCount,
    profile,
    profileSocialProof,
    resolveError,
    resolvedUserId,
    setLikes,
    setLists,
    setListItems,
    setWatched,
    setWatchlist,
    watched,
    watchedCount: collectionCounts.watched === null ? watched.length : collectionCounts.watched,
    watchlist,
    watchlistCount: collectionCounts.watchlist === null ? watchlist.length : collectionCounts.watchlist,
  };
}
