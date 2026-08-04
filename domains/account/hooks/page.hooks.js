'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAccountProfile, useResolvedAccountUser } from '@/modules/account';
import { useAuthSessionReady } from '@/modules/auth';
import { useModal } from '@/modules/modal';
import { useToast } from '@/modules/notification';
import { deleteUserList, subscribeToUserListItems } from '@/domains/media/server/lists';
import { getAccountSocialProof } from '@/domains/media/server/social-proof';
import {
  FOLLOW_STATUSES,
  cancelFollowRequest,
  followUser,
  subscribeToFollowRelationship,
  subscribeToFollowers,
  subscribeToFollowing,
  unfollowUser,
} from '@/domains/social/server/social/follow-service';
import {
  getFollowState,
  getUserAvatarUrl,
  logDataError,
  notifyAccountLoadError,
} from '@/domains/account/utils';
import { AUTH_ROUTES, buildAuthHref, getCurrentPathWithSearch } from '@/domains/auth/utils';
import { useAccountCollections } from './collections.hooks';
import {
  useAccountCollectionRemoveActions,
  useAccountCollectionReorderActions,
} from './collections.hooks';

// ============================================================
// Relationship & Social Proof Hooks
// ============================================================

export function useAccountRelationshipData({
  authIsReady,
  authUserId,
  canManageRequests,
  isOwner,
  isPrivateProfile,
  isProfileLoaded,
  publicFollowerCount = 0,
  publicFollowingCount = 0,
  resolvedUserId,
}) {
  const [followRelationship, setFollowRelationship] = useState({
    canViewPrivateContent: false,
    inboundStatus: null,
    isInboundRelationshipLoaded: false,
    isOutboundRelationshipLoaded: false,
    isPrivateProfile: false,
    isTargetProfileLoaded: false,
    outboundStatus: null,
    showFollowBack: false,
  });
  const [followerCount, setFollowerCount] = useState(publicFollowerCount);
  const [followingCount, setFollowingCount] = useState(publicFollowingCount);
  const [pendingFollowRequestCount, setPendingFollowRequestCount] = useState(0);

  const followPollingOptions = useMemo(() => ({ hiddenIntervalMs: 60000, intervalMs: 15000 }), []);

  useEffect(() => {
    if (!resolvedUserId || !authIsReady) {
      setFollowRelationship({
        canViewPrivateContent: false,
        inboundStatus: null,
        isInboundRelationshipLoaded: false,
        isOutboundRelationshipLoaded: false,
        isPrivateProfile: false,
        isTargetProfileLoaded: false,
        outboundStatus: null,
        showFollowBack: false,
      });
      return undefined;
    }

    if (isOwner) {
      setFollowRelationship({
        canViewPrivateContent: true,
        inboundStatus: null,
        isInboundRelationshipLoaded: true,
        isOutboundRelationshipLoaded: true,
        isPrivateProfile: Boolean(isPrivateProfile),
        isTargetProfileLoaded: true,
        outboundStatus: null,
        showFollowBack: false,
      });
      return undefined;
    }

    return subscribeToFollowRelationship(
      authUserId || null,
      resolvedUserId,
      (rel) => setFollowRelationship(rel),
      followPollingOptions,
    );
  }, [authIsReady, authUserId, followPollingOptions, isOwner, isPrivateProfile, resolvedUserId]);

  useEffect(() => {
    if (!resolvedUserId || !authIsReady) {
      setFollowerCount(0);
      setFollowingCount(0);
      setPendingFollowRequestCount(0);
      return undefined;
    }

    const hasKnownPrivacyState =
      isOwner || isProfileLoaded || followRelationship.isTargetProfileLoaded;
    const resolvedIsPrivateProfile = isProfileLoaded
      ? isPrivateProfile
      : followRelationship.isPrivateProfile;

    if (
      !hasKnownPrivacyState ||
      (!isOwner && resolvedIsPrivateProfile && !followRelationship.canViewPrivateContent)
    ) {
      setFollowerCount(publicFollowerCount);
      setFollowingCount(publicFollowingCount);
      setPendingFollowRequestCount(0);
      return undefined;
    }

    if (isOwner) {
      setFollowerCount(publicFollowerCount);
      setFollowingCount(publicFollowingCount);

      const unsubFollowers = subscribeToFollowers(
        resolvedUserId,
        (f) => setFollowerCount(f.length),
        {
          ...followPollingOptions,
          onError: () => setFollowerCount(publicFollowerCount),
          status: FOLLOW_STATUSES.ACCEPTED,
        },
      );
      const unsubFollowing = subscribeToFollowing(
        resolvedUserId,
        (f) => setFollowingCount(f.length),
        {
          ...followPollingOptions,
          onError: () => setFollowingCount(publicFollowingCount),
          status: FOLLOW_STATUSES.ACCEPTED,
        },
      );
      const unsubPending = canManageRequests
        ? subscribeToFollowers(
            resolvedUserId,
            (reqs) => setPendingFollowRequestCount(reqs.length),
            {
              ...followPollingOptions,
              enablePendingFallback: false,
              onError: () => setPendingFollowRequestCount(0),
              status: FOLLOW_STATUSES.PENDING,
            },
          )
        : () => {};

      return () => {
        unsubFollowers();
        unsubFollowing();
        unsubPending();
      };
    }

    const unsubFollowers = subscribeToFollowers(resolvedUserId, (f) => setFollowerCount(f.length), {
      ...followPollingOptions,
      onError: () => setFollowerCount(publicFollowerCount),
    });
    const unsubFollowing = subscribeToFollowing(
      resolvedUserId,
      (f) => setFollowingCount(f.length),
      { ...followPollingOptions, onError: () => setFollowingCount(publicFollowingCount) },
    );
    const unsubPending = canManageRequests
      ? subscribeToFollowers(resolvedUserId, (reqs) => setPendingFollowRequestCount(reqs.length), {
          ...followPollingOptions,
          enablePendingFallback: false,
          onError: () => setPendingFollowRequestCount(0),
          status: FOLLOW_STATUSES.PENDING,
        })
      : () => {};

    return () => {
      unsubFollowers();
      unsubFollowing();
      unsubPending();
    };
  }, [
    authIsReady,
    canManageRequests,
    followRelationship.canViewPrivateContent,
    followRelationship.isPrivateProfile,
    followRelationship.isTargetProfileLoaded,
    followPollingOptions,
    isOwner,
    isPrivateProfile,
    isProfileLoaded,
    publicFollowerCount,
    publicFollowingCount,
    resolvedUserId,
  ]);

  return { followerCount, followingCount, followRelationship, pendingFollowRequestCount };
}

export function useAccountSocialProof({
  authUserId,
  canViewPrivateContent,
  isOwner,
  isSocialFollowsEnabled,
  resolvedUserId,
}) {
  const [profileSocialProof, setProfileSocialProof] = useState(null);

  useEffect(() => {
    let ignore = false;
    if (
      !isSocialFollowsEnabled ||
      !authUserId ||
      !resolvedUserId ||
      isOwner ||
      !canViewPrivateContent
    ) {
      setProfileSocialProof(null);
      return undefined;
    }

    getAccountSocialProof({
      canViewPrivateContent,
      targetUserId: resolvedUserId,
      viewerId: authUserId,
    })
      .then((proof) => {
        if (!ignore) setProfileSocialProof(proof);
      })
      .catch((err) => {
        if (!ignore) {
          logDataError('[Profile] Social proof warning:', err);
          setProfileSocialProof(null);
        }
      });

    return () => {
      ignore = true;
    };
  }, [authUserId, canViewPrivateContent, isOwner, isSocialFollowsEnabled, resolvedUserId]);

  return { profileSocialProof };
}

export function useAccountListItems({
  activeListId,
  activeTab,
  canViewPrivateContent,
  isOwner,
  isPrivateProfile,
  resolvedUserId,
}) {
  const toast = useToast();
  const [listItems, setListItems] = useState([]);
  const [isLoadingListItems, setIsLoadingListItems] = useState(false);

  useEffect(() => {
    if (activeTab !== 'lists' || !resolvedUserId || !activeListId) {
      setListItems([]);
      setIsLoadingListItems(false);
      return undefined;
    }

    if (!isOwner && isPrivateProfile && !canViewPrivateContent) {
      setListItems([]);
      setIsLoadingListItems(false);
      return undefined;
    }

    setIsLoadingListItems(true);
    return subscribeToUserListItems(
      resolvedUserId,
      activeListId,
      (nextItems) => {
        setListItems(nextItems);
        setIsLoadingListItems(false);
      },
      {
        activeTab,
        onError: (err) => {
          setListItems([]);
          notifyAccountLoadError(toast, err, 'List items could not be loaded');
          setIsLoadingListItems(false);
        },
      },
    );
  }, [
    activeListId,
    activeTab,
    canViewPrivateContent,
    isOwner,
    isPrivateProfile,
    resolvedUserId,
    toast,
  ]);

  return { isLoadingListItems, listItems, setListItems };
}

// ============================================================
// Page Data Orchestration Hook
// ============================================================

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
  const isAuthSessionReady = useAuthSessionReady(
    auth.isAuthenticated ? auth.user?.id || null : null,
  );
  const toast = useToast();
  const handleProfileError = useCallback(
    (err) => notifyAccountLoadError(toast, err, 'Profile could not be loaded'),
    [toast],
  );

  const { isResolvingProfile, resolveError, resolvedUserId } = useResolvedAccountUser({
    authUserId: auth.user?.id || null,
    initialResolvedUserId,
    initialResolveError,
    username,
  });
  const { hasLoadedProfile, profile } = useAccountProfile({
    resolvedUserId,
    initialProfile,
    onError: handleProfileError,
  });

  const isCurrentAccountMissing =
    !username &&
    auth.isAuthenticated &&
    Boolean(resolvedUserId) &&
    !profile &&
    (initialResolveError === 'Account not found' || hasLoadedProfile);
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
  const { followerCount, followingCount, followRelationship, pendingFollowRequestCount } =
    useAccountRelationshipData({
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
  const canViewPrivateContent =
    isOwner || !normalizedIsPrivateProfile || followRelationship.canViewPrivateContent;

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
    hasResolvedAccessState: true,
    likeCount: collectionCounts.likes === null ? likes.length : collectionCounts.likes,
    isLoadingCollections,
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

// ============================================================
// Page Actions Hook
// ============================================================

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { openModal } = useModal();

  const [itemRemoveConfirmation, setItemRemoveConfirmation] = useState(null);
  const [listDeleteConfirmation, setListDeleteConfirmation] = useState(null);
  const [unfollowConfirmation, setUnfollowConfirmation] = useState(null);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const currentPath = useMemo(
    () => getCurrentPathWithSearch(pathname, searchParams),
    [pathname, searchParams],
  );

  const handleEditList = useCallback(
    (list) => {
      const targetList = list || selectedList;
      if (!isOwner || !auth.user?.id || !targetList?.id) return;
      openModal(
        'LIST_EDITOR_MODAL',
        { desktop: 'center', mobile: 'bottom' },
        {
          data: {
            isOwner: true,
            userId: auth.user.id,
            initialData: targetList,
            initialItems: targetList?.id === selectedList?.id ? listItems : [],
            onItemsChange: targetList?.id === selectedList?.id ? setListItems : null,
          },
        },
      );
    },
    [auth.user?.id, isOwner, listItems, openModal, selectedList, setListItems],
  );

  const handleDeleteList = useCallback(
    (list) => {
      const targetList = list || selectedList;
      if (!isOwner || !auth.user?.id || !targetList?.id) return;

      setListDeleteConfirmation({
        title: 'Delete List?',
        confirmText: 'Delete List',
        description: 'This removes the list and all items inside it from your profile',
        isDestructive: true,
        onCancel: () => setListDeleteConfirmation(null),
        onConfirm: async () => {
          let previousLists = null;
          if (typeof setLists === 'function') {
            setLists((cur) => {
              previousLists = cur;
              return cur.filter((c) => c?.id !== targetList.id);
            });
          }
          try {
            await deleteUserList({ listId: targetList.id, userId: auth.user.id });
            setListDeleteConfirmation(null);
            if (activeListId === targetList.id) {
              if (pathname.includes('/lists/') && profileHandle) {
                router.push(`/account/${profileHandle}/lists`);
              } else {
                updateQuery({ list: null, tab: 'lists' });
              }
            }
          } catch (error) {
            if (previousLists && typeof setLists === 'function') setLists(previousLists);
            toast.error(error?.message || 'The list could not be deleted');
            throw error;
          }
        },
      });
    },
    [
      activeListId,
      auth.user?.id,
      isOwner,
      pathname,
      profileHandle,
      router,
      selectedList,
      setLists,
      toast,
      updateQuery,
    ],
  );

  const handleConfirmUnfollow = useCallback(async () => {
    if (!auth.user?.id || !profile?.id) return;
    setIsFollowLoading(true);
    try {
      await unfollowUser(auth.user.id, profile.id);
      setUnfollowConfirmation(null);
    } catch (error) {
      toast.error(error?.message || 'Follow state could not be updated');
      throw error;
    } finally {
      setIsFollowLoading(false);
    }
  }, [auth.user?.id, profile?.id, toast]);

  const handleSignInRequest = useCallback(() => {
    router.push(buildAuthHref(AUTH_ROUTES.SIGN_IN, { next: currentPath }));
  }, [currentPath, router]);

  const handleFollow = useCallback(async () => {
    if (!auth.isAuthenticated) {
      handleSignInRequest();
      return;
    }
    if (!auth.user?.id || !profile?.id) return;

    if (followRelationship.outboundStatus === FOLLOW_STATUSES.ACCEPTED) {
      const handle = profile?.username ? `@${profile.username}` : 'this user';
      const name = profile?.displayName || profile?.username || 'This user';
      setUnfollowConfirmation({
        title: `Unfollow ${handle}`,
        description:
          name === handle
            ? `${handle} will be removed from your following list until you follow again`
            : `${name} ${handle} will be removed from your following list until you follow again`,
        icon: getUserAvatarUrl(profile),
        confirmText: 'Unfollow',
        isDestructive: true,
        onCancel: () => setUnfollowConfirmation(null),
        onConfirm: handleConfirmUnfollow,
      });
      return;
    }

    setIsFollowLoading(true);
    try {
      if (followRelationship.outboundStatus === FOLLOW_STATUSES.PENDING) {
        await cancelFollowRequest(auth.user.id, profile.id);
      } else {
        await followUser(auth.user.id, profile.id);
      }
    } catch (error) {
      toast.error(error?.message || 'Follow state could not be updated');
    } finally {
      setIsFollowLoading(false);
    }
  }, [
    auth.isAuthenticated,
    auth.user?.id,
    followRelationship.outboundStatus,
    handleConfirmUnfollow,
    handleSignInRequest,
    profile,
    toast,
  ]);

  useEffect(() => {
    if (followRelationship.outboundStatus !== FOLLOW_STATUSES.ACCEPTED) {
      setUnfollowConfirmation(null);
    }
  }, [followRelationship.outboundStatus]);

  const handleEditProfile = useCallback(() => {
    if (!isOwner) return;
    router.push('/account/edit');
  }, [isOwner, router]);

  const handleOpenFollowList = useCallback(
    (type) => {
      if (!resolvedUserId || !profile) return;
      if (isPrivateProfile && !isOwner && !canViewPrivateContent) return;
      openModal(
        'ACCOUNT_SOCIAL_MODAL',
        { desktop: 'center', mobile: 'bottom' },
        {
          data: {
            canManageRequests: isOwner && profile?.isPrivate === true,
            userId: resolvedUserId,
            tab: type,
          },
        },
      );
    },
    [canViewPrivateContent, isOwner, isPrivateProfile, openModal, profile, resolvedUserId],
  );

  const removeActions = useAccountCollectionRemoveActions({
    auth,
    isOwner,
    selectedList,
    setItemRemoveConfirmation,
    setLikes,
    setListItems,
    setWatched,
    setWatchlist,
    toast,
  });
  const handleReorder = useAccountCollectionReorderActions({
    auth,
    isOwner,
    selectedList,
    setLikes,
    setListItems,
    setWatchlist,
    toast,
  });

  return {
    handleDeleteList,
    handleEditList,
    handleEditProfile,
    handleFollow,
    handleOpenFollowList,
    ...removeActions,
    handleReorder,
    handleSignInRequest,
    isFollowLoading,
    itemRemoveConfirmation,
    listDeleteConfirmation,
    unfollowConfirmation,
  };
}

// ============================================================
// Feed & Section Page Hooks
// ============================================================

export function hasMatchingSeededFeed({
  expectedValue = null,
  initialFeed = null,
  resolvedUserId = null,
  valueKey = 'mode',
}) {
  if (!initialFeed?.userId || !resolvedUserId || initialFeed.userId !== resolvedUserId)
    return false;
  if (!valueKey) return true;
  return (initialFeed?.[valueKey] ?? expectedValue) === expectedValue;
}

export function shouldBlockAccountFeedLoad({
  canViewPrivateContent,
  hasSeededFeed = false,
  isOwner,
  isPrivateProfile,
  isViewerReady,
  resolvedUserId,
}) {
  if (hasSeededFeed) return false;
  if (!isViewerReady || !resolvedUserId) return true;
  return !isOwner && isPrivateProfile && !canViewPrivateContent;
}

export function useSeededFeedState(initialFeed = null) {
  const [items, setItems] = useState(Array.isArray(initialFeed?.items) ? initialFeed.items : []);
  const [cursor, setCursor] = useState(initialFeed?.nextCursor ?? null);
  const [hasMore, setHasMore] = useState(Boolean(initialFeed?.hasMore));
  const [totalCount, setTotalCount] = useState(
    Number.isFinite(Number(initialFeed?.totalCount))
      ? Math.max(0, Math.floor(Number(initialFeed.totalCount)))
      : Array.isArray(initialFeed?.items)
        ? initialFeed.items.length
        : 0,
  );
  const [isFeedLoading, setIsFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState(initialFeed?.error || null);

  const resetFeed = useCallback(() => {
    setItems([]);
    setCursor(null);
    setFeedError(null);
    setHasMore(false);
    setTotalCount(0);
    setIsFeedLoading(false);
  }, []);

  const applyFeedResult = useCallback((result, { append = false } = {}) => {
    const incomingItems = Array.isArray(result?.items) ? result.items : [];
    const explicitTotalCount = Number.isFinite(Number(result?.totalCount))
      ? Math.max(0, Math.floor(Number(result.totalCount)))
      : null;

    setItems((current) => (append ? [...current, ...incomingItems] : incomingItems));
    setCursor(result?.nextCursor ?? null);
    setFeedError(null);
    setHasMore(Boolean(result?.hasMore));

    if (explicitTotalCount !== null) {
      setTotalCount(explicitTotalCount);
    } else if (append) {
      setTotalCount((current) => current + incomingItems.length);
    } else {
      setTotalCount(incomingItems.length);
    }
  }, []);

  const syncFeed = useCallback((nextFeed = null) => {
    const nextItems = Array.isArray(nextFeed?.items) ? nextFeed.items : [];
    const nextTotalCount = Number.isFinite(Number(nextFeed?.totalCount))
      ? Math.max(0, Math.floor(Number(nextFeed.totalCount)))
      : nextItems.length;

    setItems(nextItems);
    setCursor(nextFeed?.nextCursor ?? null);
    setFeedError(nextFeed?.error || null);
    setHasMore(Boolean(nextFeed?.hasMore));
    setTotalCount(nextTotalCount);
    setIsFeedLoading(false);
  }, []);

  return {
    applyFeedResult,
    cursor,
    feedError,
    hasMore,
    isFeedLoading,
    items,
    resetFeed,
    setFeedError,
    setIsFeedLoading,
    setItems,
    setTotalCount,
    syncFeed,
    totalCount,
  };
}

export function useDeferredPreviewFeed({
  canLoad,
  hasSeededFeed = false,
  initialFeed = null,
  loadFeed,
  onLoadError = null,
}) {
  const feedState = useSeededFeedState(initialFeed);
  const { applyFeedResult, resetFeed, setFeedError, setIsFeedLoading, syncFeed } = feedState;

  useEffect(() => {
    if (hasSeededFeed) syncFeed(initialFeed);
  }, [hasSeededFeed, initialFeed, syncFeed]);

  useEffect(() => {
    if (!canLoad && !hasSeededFeed) {
      resetFeed();
      return undefined;
    }
    if (hasSeededFeed) {
      setIsFeedLoading(false);
      return undefined;
    }

    let ignore = false;
    async function loadDeferredFeed() {
      setIsFeedLoading(true);
      setFeedError(null);
      const result = await loadFeed().then(
        (value) => ({ status: 'fulfilled', value }),
        (reason) => ({ status: 'rejected', reason }),
      );
      if (ignore) return;
      if (result.status === 'fulfilled') {
        applyFeedResult(result.value);
      } else {
        resetFeed();
        const nextError = typeof onLoadError === 'function' ? onLoadError(result.reason) : null;
        if (nextError) setFeedError(nextError);
      }
      setIsFeedLoading(false);
    }

    const timer = setTimeout(loadDeferredFeed, 150);
    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [
    applyFeedResult,
    canLoad,
    hasSeededFeed,
    loadFeed,
    onLoadError,
    resetFeed,
    setFeedError,
    setIsFeedLoading,
  ]);

  return feedState;
}

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
        (!profile || !hasResolvedAccessState || (canViewPrivateContent && isLoadingCollections))),
    isViewerReady: auth.isReady && isAuthSessionReady,
  };
}

export function useAccountEditData({ auth, initialSnapshot = null }) {
  const { isProfileLoaded, profile } = useAccountProfile({
    initialProfile: initialSnapshot?.profile || null,
    resolvedUserId: auth.user?.id || null,
  });

  const [avatarUrl, setAvatarUrl] = useState(
    profile?.avatarUrl || initialSnapshot?.profile?.avatarUrl || null,
  );
  const [bannerUrl, setBannerUrl] = useState(
    profile?.bannerUrl || initialSnapshot?.profile?.bannerUrl || null,
  );
  const [displayName, setDisplayName] = useState(
    profile?.displayName || initialSnapshot?.profile?.displayName || '',
  );
  const [username, setUsername] = useState(
    profile?.username || initialSnapshot?.profile?.username || '',
  );
  const [description, setDescription] = useState(
    profile?.description || initialSnapshot?.profile?.description || '',
  );
  const [isPrivate, setIsPrivate] = useState(
    profile?.isPrivate === true || initialSnapshot?.profile?.isPrivate === true,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (profile) {
      setAvatarUrl(profile.avatarUrl || null);
      setBannerUrl(profile.bannerUrl || null);
      setDisplayName(profile.displayName || '');
      setUsername(profile.username || '');
      setDescription(profile.description || '');
      setIsPrivate(profile.isPrivate === true);
    }
  }, [profile]);

  return {
    avatarUrl,
    bannerUrl,
    description,
    displayName,
    isPrivate,
    isProfileLoaded,
    isSubmitting,
    profile: profile || initialSnapshot?.profile || null,
    setAvatarUrl,
    setBannerUrl,
    setDescription,
    setDisplayName,
    setIsPrivate,
    setIsSubmitting,
    setUsername,
    username,
  };
}
