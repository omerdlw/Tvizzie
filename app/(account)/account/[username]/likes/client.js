'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import {
  hasMatchingSeededFeed,
  shouldBlockAccountFeedLoad,
  useAccountSectionPage,
  useSeededFeedState,
} from '@/features/account/section-client-hooks';
import { isPermissionDeniedError, logDataError } from '@/core/utils/errors';
import { useAuth } from '@/core/modules/auth';
import { useToast } from '@/core/modules/notification/hooks';
import { fetchProfileLikedLists } from '@/core/services/media/lists.service';
import { updateFavoriteShowcase } from '@/core/services/media/likes.service';
import { fetchProfileReviewFeed, toggleStoredReviewLike } from '@/core/services/media/reviews.service';
import { subscribeToUserWatched } from '@/core/services/media/watched.service';
import LikesView from './view';

const LIKE_SEGMENTS = new Set(['films', 'reviews', 'lists']);

export default function Client({
  currentPage = 1,
  initialCollections = null,
  initialLikedLists = null,
  initialProfile = null,
  initialResolvedUserId = null,
  initialResolveError = null,
  initialReviewFeed = null,
  username,
}) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [isShowcaseSaving, setIsShowcaseSaving] = useState(false);
  const [watchedItems, setWatchedItems] = useState([]);
  const activeSegment = LIKE_SEGMENTS.has(searchParams.get('segment')) ? searchParams.get('segment') : 'films';
  const requestedPage = Number.parseInt(searchParams.get('page') || String(currentPage), 10);
  const resolvedPage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const {
    canViewProfileCollections,
    canViewPrivateContent,
    favoriteShowcase,
    followerCount,
    followingCount,
    followState,
    handleEditProfile,
    handleFollow,
    handleOpenFollowList,
    handleRequestRemoveLike,
    handleSignInRequest,
    isBioSurfaceOpen,
    isFollowLoading,
    isOwner,
    isPageLoading,
    isPrivateProfile,
    isResolvingProfile,
    isViewerReady,
    itemRemoveConfirmation,
    likeCount,
    likes,
    listCount,
    pendingFollowRequestCount,
    profile,
    resolveError,
    resolvedUserId,
    setIsBioSurfaceOpen,
    unfollowConfirmation,
    watchlistCount,
  } = useAccountSectionPage({
    activeTab: 'likes',
    auth,
    initialCollections,
    initialProfile,
    initialResolvedUserId,
    initialResolveError,
    username,
  });
  const shouldForcePrivateRefresh = !isOwner && isPrivateProfile === true && canViewPrivateContent;
  const {
    applyFeedResult: applyReviewFeedResult,
    cursor: reviewsCursor,
    feedError: reviewsError,
    hasMore: hasMoreReviews,
    isFeedLoading: isReviewsLoading,
    items: reviews,
    resetFeed: resetReviews,
    setFeedError: setReviewsError,
    setIsFeedLoading: setIsReviewsLoading,
    setItems: setReviews,
    syncFeed: syncReviewFeed,
  } = useSeededFeedState(initialReviewFeed);
  const {
    feedError: likedListsError,
    isFeedLoading: isLikedListsLoading,
    items: likedLists,
    resetFeed: resetLikedLists,
    setFeedError: setLikedListsError,
    setIsFeedLoading: setIsLikedListsLoading,
    setItems: setLikedLists,
    syncFeed: syncLikedListsFeed,
  } = useSeededFeedState(initialLikedLists);
  const hasSeededReviewFeed =
    !shouldForcePrivateRefresh &&
    hasMatchingSeededFeed({
      expectedValue: 'liked',
      initialFeed: initialReviewFeed,
      resolvedUserId,
    });
  const hasSeededLikedLists =
    !shouldForcePrivateRefresh &&
    hasMatchingSeededFeed({
      expectedValue: 'liked-lists',
      initialFeed: initialLikedLists,
      resolvedUserId,
    });
  const shouldBlockReviewLoad = shouldBlockAccountFeedLoad({
    canViewPrivateContent,
    hasSeededFeed: hasSeededReviewFeed,
    isOwner,
    isPrivateProfile,
    isViewerReady,
    resolvedUserId,
  });
  const shouldBlockLikedListsLoad = shouldBlockAccountFeedLoad({
    canViewPrivateContent,
    hasSeededFeed: hasSeededLikedLists,
    isOwner,
    isPrivateProfile,
    isViewerReady,
    resolvedUserId,
  });

  useEffect(() => {
    if (!hasSeededReviewFeed) {
      return;
    }

    syncReviewFeed(initialReviewFeed);
  }, [hasSeededReviewFeed, initialReviewFeed, syncReviewFeed]);

  useEffect(() => {
    if (!hasSeededLikedLists) {
      return;
    }

    syncLikedListsFeed(initialLikedLists);
  }, [hasSeededLikedLists, initialLikedLists, syncLikedListsFeed]);

  const showcaseMap = useMemo(() => {
    return new Map(favoriteShowcase.map((item) => [item.mediaKey || `${item.entityType}_${item.entityId}`, item]));
  }, [favoriteShowcase]);

  const persistShowcase = useCallback(
    async (nextItems) => {
      if (!auth.user?.id) {
        return;
      }

      setIsShowcaseSaving(true);

      try {
        await updateFavoriteShowcase({
          items: nextItems,
          userId: auth.user.id,
        });
      } catch (error) {
        toast.error(error?.message || 'Favorites showcase could not be updated');
      } finally {
        setIsShowcaseSaving(false);
      }
    },
    [auth.user?.id, toast]
  );

  const handleToggleShowcase = useCallback(
    async (item) => {
      const mediaKey = item?.mediaKey || `${item?.entityType || item?.media_type}_${item?.entityId || item?.id}`;

      if (showcaseMap.has(mediaKey)) {
        await persistShowcase(favoriteShowcase.filter((currentItem) => currentItem.mediaKey !== mediaKey));
        return;
      }

      if (favoriteShowcase.length >= 5) {
        toast.error('Favorites showcase can contain up to 5 titles');
        return;
      }

      await persistShowcase([...favoriteShowcase, item]);
    },
    [favoriteShowcase, persistShowcase, showcaseMap, toast]
  );

  const updateLikesQuery = useCallback(
    (updates) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') {
          params.delete(key);
          return;
        }

        params.set(key, String(value));
      });

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams]
  );

  const handleSegmentChange = useCallback(
    (nextSegment) => {
      if (!LIKE_SEGMENTS.has(nextSegment) || nextSegment === activeSegment) {
        return;
      }

      updateLikesQuery({
        page: null,
        segment: nextSegment === 'films' ? null : nextSegment,
      });
    },
    [activeSegment, updateLikesQuery]
  );

  const loadReviews = useCallback(
    async ({ append = false } = {}) => {
      if (shouldBlockReviewLoad) {
        resetReviews();
        return;
      }

      if (!append && hasSeededReviewFeed) {
        setIsReviewsLoading(false);
        return;
      }

      setIsReviewsLoading(true);
      setReviewsError(null);

      try {
        const result = await fetchProfileReviewFeed({
          cursor: append ? reviewsCursor : null,
          mode: 'liked',
          userId: resolvedUserId,
        });

        applyReviewFeedResult(result, { append });
      } catch (error) {
        if (!append) {
          resetReviews();
        }

        if (!isPermissionDeniedError(error)) {
          logDataError('[Account] Liked reviews could not be loaded:', error);
          setReviewsError('Liked reviews could not be loaded right now.');
        }
      } finally {
        setIsReviewsLoading(false);
      }
    },
    [
      applyReviewFeedResult,
      hasSeededReviewFeed,
      resolvedUserId,
      resetReviews,
      reviewsCursor,
      setReviewsError,
      setIsReviewsLoading,
      shouldBlockReviewLoad,
    ]
  );

  useEffect(() => {
    if (activeSegment !== 'reviews') {
      return;
    }

    loadReviews();
  }, [activeSegment, auth.user?.id, isViewerReady, loadReviews]);

  useEffect(() => {
    if (activeSegment !== 'reviews') {
      setWatchedItems([]);
      return undefined;
    }

    if (!isViewerReady || !resolvedUserId) {
      setWatchedItems([]);
      return undefined;
    }

    if (!isOwner && isPrivateProfile && !canViewPrivateContent) {
      setWatchedItems([]);
      return undefined;
    }

    const unsubscribe = subscribeToUserWatched(resolvedUserId, setWatchedItems, {
      emitCachedPayloadOnSubscribe: !shouldForcePrivateRefresh,
      fetchOnSubscribe: true,
      refreshOnSubscribe: shouldForcePrivateRefresh,
      onError: () => setWatchedItems([]),
    });

    return unsubscribe;
  }, [
    activeSegment,
    canViewPrivateContent,
    isOwner,
    isPrivateProfile,
    isViewerReady,
    resolvedUserId,
    shouldForcePrivateRefresh,
  ]);

  useEffect(() => {
    if (activeSegment !== 'lists') {
      return undefined;
    }

    if (hasSeededLikedLists) {
      setIsLikedListsLoading(false);
      return undefined;
    }

    if (shouldBlockLikedListsLoad) {
      resetLikedLists();
      return undefined;
    }

    let ignore = false;

    async function loadLikedLists() {
      setIsLikedListsLoading(true);
      setLikedListsError(null);

      try {
        const result = await fetchProfileLikedLists({
          pageSize: 500,
          userId: resolvedUserId,
          viewerId: auth.user?.id || null,
        });

        if (!ignore) {
          setLikedLists(result.items || []);
        }
      } catch (error) {
        if (!ignore) {
          resetLikedLists();

          if (!isPermissionDeniedError(error)) {
            logDataError('[Account] Liked lists could not be loaded:', error);
            setLikedListsError('Liked lists could not be loaded right now.');
            toast.error('Liked lists could not be loaded');
          }
        }
      } finally {
        if (!ignore) {
          setIsLikedListsLoading(false);
        }
      }
    }

    loadLikedLists();

    return () => {
      ignore = true;
    };
  }, [
    activeSegment,
    auth.user?.id,
    hasSeededLikedLists,
    resetLikedLists,
    resolvedUserId,
    setLikedLists,
    setLikedListsError,
    setIsLikedListsLoading,
    shouldBlockLikedListsLoad,
    toast,
  ]);

  const handleLike = useCallback(
    async (review) => {
      if (!auth.isAuthenticated || !auth.user?.id) {
        handleSignInRequest();
        return;
      }

      try {
        const nextLikedState = await toggleStoredReviewLike({
          review,
          userId: auth.user.id,
        });

        setReviews((current) =>
          current.map((item) => {
            if ((item.docPath || item.id) !== (review.docPath || review.id)) {
              return item;
            }

            const currentLikes = Array.isArray(item.likes) ? item.likes : [];
            const nextLikes = nextLikedState
              ? Array.from(new Set([...currentLikes, auth.user.id]))
              : currentLikes.filter((likeUserId) => likeUserId !== auth.user.id);

            return {
              ...item,
              likes: nextLikes,
            };
          })
        );
      } catch (error) {
        toast.error(error?.message || 'Review could not be updated');
      }
    },
    [auth.isAuthenticated, auth.user?.id, handleSignInRequest, setReviews, toast]
  );

  return (
    <LikesView
      auth={auth}
      activeSegment={activeSegment}
      canShowLikesGrid={canViewProfileCollections}
      currentPage={resolvedPage}
      favoriteShowcase={favoriteShowcase}
      followerCount={followerCount}
      followingCount={followingCount}
      followState={followState}
      handleEditProfile={handleEditProfile}
      handleFollow={handleFollow}
      handleLike={handleLike}
      handleOpenFollowList={handleOpenFollowList}
      handleRequestRemoveLike={handleRequestRemoveLike}
      handleSegmentChange={handleSegmentChange}
      handleSignInRequest={handleSignInRequest}
      handleToggleShowcase={handleToggleShowcase}
      hasMoreReviews={hasMoreReviews}
      isBioSurfaceOpen={isBioSurfaceOpen}
      isFollowLoading={isFollowLoading}
      isLikedListsLoading={isLikedListsLoading}
      isOwner={isOwner}
      isPageLoading={isPageLoading}
      isReviewsLoading={isReviewsLoading}
      isResolvingProfile={isResolvingProfile}
      isShowcaseSaving={isShowcaseSaving}
      itemRemoveConfirmation={itemRemoveConfirmation}
      likedLists={likedLists}
      likedListsError={likedListsError}
      likeCount={likeCount}
      likes={likes}
      listCount={listCount}
      pendingFollowRequestCount={pendingFollowRequestCount}
      persistShowcase={persistShowcase}
      profile={profile}
      resolveError={resolveError}
      resolvedUserId={resolvedUserId}
      reviews={reviews}
      reviewsError={reviewsError}
      loadReviews={loadReviews}
      setIsBioSurfaceOpen={setIsBioSurfaceOpen}
      showcaseMap={showcaseMap}
      unfollowConfirmation={unfollowConfirmation}
      username={username}
      watchedItems={watchedItems}
      watchlistCount={watchlistCount}
    />
  );
}
