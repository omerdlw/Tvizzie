'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAccountClient, useAccountProfile, useResolvedAccountUser } from '@/modules/account';
import { useAuthSessionReady } from '@/modules/auth';
import { useToast } from '@/modules/notification';
import { notifyAccountLoadError } from '@/domains/account/utils';
import { useAccountCollections } from './collections.hooks';
import { useAccountListItems } from './list-items.hooks';
import { useAccountRelationshipData, useAccountSocialProof } from './relationship.hooks';

export function useAccountPageData({
  activeListId,
  activeTab,
  auth,
  collectionPreviewLimits = null,
  initialCollections = null,
  initialFollowRelationship = null,
  initialProfile = null,
  initialResolvedUserId = null,
  initialResolveError = null,
  isSocialFollowsEnabled,
  username,
}) {
  const isAuthSessionReady = useAuthSessionReady(
    auth.isAuthenticated ? auth.user?.id || null : null,
  );
  const toast = useToast();
  const handleProfileError = useCallback(
    (err) => notifyAccountLoadError(toast, err, 'Profile could not be loaded'),
    [toast],
  );

  const accountClient = useAccountClient();
  const { isResolvingProfile, resolveError, resolvedUserId } = useResolvedAccountUser({
    authUserId: auth.user?.id || null,
    initialResolvedUserId,
    initialResolveError,
    username,
  });
  const { hasLoadedProfile, profile, setProfile } = useAccountProfile({
    resolvedUserId,
    initialProfile,
    onError: handleProfileError,
  });

  const [isBootstrappingProfile, setIsBootstrappingProfile] = useState(false);
  const [bootstrapAttempted, setBootstrapAttempted] = useState(false);

  useEffect(() => {
    if (
      !username &&
      auth.isAuthenticated &&
      auth.user?.id &&
      resolvedUserId === auth.user.id &&
      hasLoadedProfile &&
      !profile &&
      !bootstrapAttempted
    ) {
      let ignore = false;
      setIsBootstrappingProfile(true);

      if (typeof accountClient?.ensureAccount === 'function') {
        accountClient
          .ensureAccount(auth.user)
          .then((bootstrappedProfile) => {
            if (!ignore && bootstrappedProfile && typeof setProfile === 'function') {
              setProfile(bootstrappedProfile);
            }
          })
          .catch(() => null)
          .finally(() => {
            if (!ignore) {
              setIsBootstrappingProfile(false);
              setBootstrapAttempted(true);
            }
          });
      } else {
        setIsBootstrappingProfile(false);
        setBootstrapAttempted(true);
      }

      return () => {
        ignore = true;
      };
    }
  }, [
    accountClient,
    auth.isAuthenticated,
    auth.user,
    bootstrapAttempted,
    hasLoadedProfile,
    profile,
    resolvedUserId,
    setProfile,
    username,
  ]);

  const isCurrentAccountMissing =
    !username &&
    auth.isAuthenticated &&
    Boolean(resolvedUserId) &&
    !profile &&
    hasLoadedProfile &&
    !isBootstrappingProfile &&
    bootstrapAttempted;
  const isOwner = useMemo(() => {
    if (isCurrentAccountMissing) return false;
    if (!username) return Boolean(auth.user?.id || initialResolvedUserId);
    if (!auth.isAuthenticated || !auth.user?.id) return false;
    return profile?.id === auth.user.id || resolvedUserId === auth.user.id;
  }, [
    auth.isAuthenticated,
    auth.user?.id,
    initialResolvedUserId,
    isCurrentAccountMissing,
    profile?.id,
    resolvedUserId,
    username,
  ]);

  const isPrivateProfile = profile?.isPrivate === true;
  const {
    followerCount,
    setFollowerCount,
    followingCount,
    setFollowingCount,
    followRelationship,
    setFollowRelationship,
    pendingFollowRequestCount,
  } = useAccountRelationshipData({
    authIsReady: auth.isReady && isAuthSessionReady,
    authUserId: auth.user?.id || null,
    canManageRequests: Boolean(isOwner && isSocialFollowsEnabled && isPrivateProfile),
    initialFollowRelationship,
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
  const canViewPrivateContent =
    isOwner || !normalizedIsPrivateProfile || followRelationship.canViewPrivateContent;

  const {
    collectionCounts,
    isLoadingCollections,
    isLikesLoading,
    isListsLoading,
    isWatchedLoading,
    isWatchlistLoading,
    likes,
    lists,
    setLikes,
    setCollectionCounts,
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
    hasResolvedAccessState: true,
    likeCount: collectionCounts.likes === null ? likes.length : collectionCounts.likes,
    isLoadingCollections,
    isLikesLoading,
    isListsLoading,
    isWatchedLoading,
    isWatchlistLoading,
    isLoadingListItems,
    isAuthSessionReady,
    isCurrentAccountMissing,
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
    setFollowRelationship,
    setFollowerCount,
    setFollowingCount,
    setLikes,
    setLists,
    setListItems,
    setWatched,
    setWatchlist,
    watched,
    watchedCount: collectionCounts.watched === null ? watched.length : collectionCounts.watched,
    watchlist,
    watchlistCount:
      collectionCounts.watchlist === null ? watchlist.length : collectionCounts.watchlist,
  };
}
