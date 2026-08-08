'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  hasMatchingSeededFeed,
  shouldBlockAccountFeedLoad,
  useAccountSectionPage,
  useSeededFeedState,
} from '@/domains/account/hooks';
import { isPermissionDeniedError, logDataError } from '@/domains/account/utils';
import { useToast } from '@/modules/notification';
import { fetchProfileLikedLists } from '@/domains/media/server/lists';
import { updateFavoriteShowcase } from '@/domains/media/server/likes';
import { fetchProfileReviewFeed, toggleStoredReviewLike } from '@/domains/reviews/server';
import { subscribeToUserWatched } from '@/domains/media/server/watched-watchlist';
import { createAccountSectionClient } from '@/domains/account/ui/sections/account-section-factory';
// LikesView is defined in this route client.
import AccountLikesFeed from '@/domains/account/ui/sections/feeds/likes';
import AccountAction from '@/domains/account/ui/components/account-action-bar';
import {
  createAccountSectionRegistry,
  createAccountSectionView,
} from '@/domains/account/ui/sections/account-section-factory';

const LIKE_SEGMENTS = new Set(['titles', 'reviews', 'lists']);
const LIKED_REVIEWS_FETCH_PAGE_SIZE = 100;
const LIKED_REVIEWS_FETCH_MAX_PAGES = 80;

function buildReviewDedupKey(item = {}, fallbackIndex = 0) {
  return String(
    item?.id ||
      item?.docPath ||
      `${item?.subjectType || 'subject'}-${item?.subjectId || 'id'}-${item?.reviewUserId || fallbackIndex}`,
  );
}

function mergeUniqueReviews(currentItems = [], nextItems = []) {
  const dedupe = new Set();
  const output = [];

  [...currentItems, ...nextItems].forEach((item, index) => {
    const key = buildReviewDedupKey(item, index);

    if (dedupe.has(key)) {
      return;
    }

    dedupe.add(key);
    output.push(item);
  });

  return output;
}

function useLikesClientState({ auth, routeData, sectionProviderValue, sectionState }) {
  const { initialLikedLists = null, initialReviewFeed = null } = routeData || {};
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [isShowcaseSaving, setIsShowcaseSaving] = useState(false);
  const [watchedItems, setWatchedItems] = useState([]);
  const activeSegment = LIKE_SEGMENTS.has(searchParams.get('segment'))
    ? searchParams.get('segment')
    : 'titles';
  const {
    canViewPrivateContent,
    favoriteShowcase,
    handleRequestRemoveLike,
    handleSignInRequest,
    isLikesLoading,
    isOwner,
    isPrivateProfile,
    isViewerReady,
    likes,
    resolvedUserId,
  } = sectionState;
  const shouldForcePrivateRefresh = !isOwner && isPrivateProfile === true && canViewPrivateContent;
  const {
    feedError: reviewsError,
    isFeedLoading: isReviewsLoading,
    items: reviews,
    resetFeed: resetReviews,
    setFeedError: setReviewsError,
    setIsFeedLoading: setIsReviewsLoading,
    setItems: setReviews,
    syncFeed: syncReviewFeed,
    totalCount: totalReviewsCount,
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
    return new Map(
      favoriteShowcase.map((item) => [
        item.mediaKey || `${item.entityType}_${item.entityId}`,
        item,
      ]),
    );
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
    [auth.user?.id, toast],
  );

  const handleToggleShowcase = useCallback(
    async (item) => {
      const mediaKey =
        item?.mediaKey || `${item?.entityType || item?.media_type}_${item?.entityId || item?.id}`;

      if (showcaseMap.has(mediaKey)) {
        await persistShowcase(
          favoriteShowcase.filter((currentItem) => currentItem.mediaKey !== mediaKey),
        );
        return;
      }

      if (favoriteShowcase.length >= 5) {
        toast.error('Favorites showcase can contain up to 5 titles');
        return;
      }

      await persistShowcase([...favoriteShowcase, item]);
    },
    [favoriteShowcase, persistShowcase, showcaseMap, toast],
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
    [pathname, router, searchParams],
  );

  const handleSegmentChange = useCallback(
    (nextSegment) => {
      if (!LIKE_SEGMENTS.has(nextSegment) || nextSegment === activeSegment) {
        return;
      }

      updateLikesQuery({
        page: null,
        segment: nextSegment === 'titles' ? null : nextSegment,
      });
    },
    [activeSegment, updateLikesQuery],
  );

  const loadReviews = useCallback(async () => {
    if (!resolvedUserId) {
      resetReviews();
      return;
    }

    if (!isViewerReady) {
      return;
    }

    if (shouldBlockReviewLoad) {
      resetReviews();
      return;
    }

    setIsReviewsLoading(true);
    setReviewsError(null);

    try {
      const seededItems =
        hasSeededReviewFeed && Array.isArray(initialReviewFeed?.items)
          ? initialReviewFeed.items
          : [];
      let allItems = [...seededItems];
      let nextCursor = hasSeededReviewFeed ? (initialReviewFeed?.nextCursor ?? null) : null;
      let hasMorePages = hasSeededReviewFeed ? Boolean(initialReviewFeed?.hasMore) : true;
      let pagesFetched = 0;

      if (!hasSeededReviewFeed) {
        const firstPage = await fetchProfileReviewFeed({
          cursor: null,
          mode: 'liked',
          pageSize: LIKED_REVIEWS_FETCH_PAGE_SIZE,
          userId: resolvedUserId,
        });
        const firstItems = Array.isArray(firstPage?.items) ? firstPage.items : [];

        allItems = mergeUniqueReviews([], firstItems);
        nextCursor = firstPage?.nextCursor ?? null;
        hasMorePages = Boolean(firstPage?.hasMore);
        pagesFetched += 1;
      }

      while (hasMorePages && nextCursor !== null && pagesFetched < LIKED_REVIEWS_FETCH_MAX_PAGES) {
        const page = await fetchProfileReviewFeed({
          cursor: nextCursor,
          mode: 'liked',
          pageSize: LIKED_REVIEWS_FETCH_PAGE_SIZE,
          userId: resolvedUserId,
        });
        const pageItems = Array.isArray(page?.items) ? page.items : [];

        allItems = mergeUniqueReviews(allItems, pageItems);
        nextCursor = page?.nextCursor ?? null;
        hasMorePages = Boolean(page?.hasMore);
        pagesFetched += 1;
      }

      syncReviewFeed({
        error: null,
        hasMore: false,
        items: allItems,
        mode: 'liked',
        nextCursor: null,
        totalCount: allItems.length,
        userId: resolvedUserId,
      });
    } catch (error) {
      resetReviews();

      if (!isPermissionDeniedError(error)) {
        logDataError('[Account] Liked reviews could not be loaded:', error);
        setReviewsError('Liked reviews could not be loaded right now.');
      }
    } finally {
      setIsReviewsLoading(false);
    }
  }, [
    hasSeededReviewFeed,
    initialReviewFeed,
    isViewerReady,
    resolvedUserId,
    resetReviews,
    setReviewsError,
    setIsReviewsLoading,
    shouldBlockReviewLoad,
    syncReviewFeed,
  ]);

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
          }),
        );
      } catch (error) {
        toast.error(error?.message || 'Review could not be updated');
      }
    },
    [auth.isAuthenticated, auth.user?.id, handleSignInRequest, setReviews, toast],
  );

  return {
    activeSegment,
    favoriteShowcase,
    handleLike,
    handleRequestRemoveLike,
    handleSegmentChange,
    handleToggleShowcase,
    isLikedListsLoading,
    isLikesLoading,
    isReviewsLoading,
    isShowcaseSaving,
    likedLists,
    likedListsError,
    likes,
    persistShowcase,
    providerValue: sectionProviderValue,
    reviews,
    reviewsError,
    reviewsTotalCount: totalReviewsCount,
    showcaseMap,
    watchedItems,
  };
}

export const Registry = createAccountSectionRegistry({
  displayName: 'AccountLikesRegistry',
  navDescription: 'Likes',
  navRegistrySource: 'account-likes',
  resolveOverrides: (
    sectionState,
    { activeSegment = 'titles', canShowLikesGrid = false, handleSegmentChange = () => {} },
  ) => ({
    navActionOverride: canShowLikesGrid ? (
      <AccountAction
        mode="tab-switch"
        activeTab={activeSegment}
        tabs={[
          { key: 'titles', label: 'Titles' },
          { key: 'reviews', label: 'Reviews' },
          { key: 'lists', label: 'Lists' },
        ]}
        onTabChange={handleSegmentChange}
        followState={sectionState.followState}
        isFollowLoading={sectionState.isFollowLoading}
        isOwner={sectionState.isOwner}
        onFollow={sectionState.handleFollow}
        showProfileFollowAction
      />
    ) : null,
  }),
});

const LikesView = createAccountSectionView({
  activeSection: 'likes',
  displayName: 'AccountLikesView',
  Registry,
  resolveRegistryProps: (sectionState, { activeSegment, handleSegmentChange }) => ({
    activeSegment,
    canShowLikesGrid: sectionState.canViewProfileCollections,
    handleSegmentChange,
  }),
  skeletonVariant: 'collection',
  renderContent: (
    sectionState,
    {
      activeSegment,
      favoriteShowcase,
      handleLike,
      handleRequestRemoveLike,
      handleToggleShowcase,
      isLikedListsLoading,
      isLikesLoading,
      isReviewsLoading,
      isShowcaseSaving,
      likedLists,
      likedListsError,
      likes,
      persistShowcase,
      reviews,
      reviewsError,
      reviewsTotalCount,
      showcaseMap,
      watchedItems,
    },
  ) => (
    <AccountLikesFeed
      activeSegment={activeSegment}
      auth={sectionState.auth}
      canShowLikesGrid={sectionState.canViewProfileCollections}
      favoriteShowcase={favoriteShowcase}
      handleLike={handleLike}
      handleRequestRemoveLike={handleRequestRemoveLike}
      handleToggleShowcase={handleToggleShowcase}
      isLikedListsLoading={isLikedListsLoading}
      isLikesLoading={isLikesLoading}
      isOwner={sectionState.isOwner}
      isReviewsLoading={isReviewsLoading}
      isShowcaseSaving={isShowcaseSaving}
      likedLists={likedLists}
      likedListsError={likedListsError}
      likes={likes}
      persistShowcase={persistShowcase}
      reviews={reviews}
      reviewsError={reviewsError}
      reviewsTotalCount={reviewsTotalCount}
      showcaseMap={showcaseMap}
      watchedItems={watchedItems}
    />
  ),
});

export default createAccountSectionClient({
  activeTab: 'likes',
  displayName: 'AccountLikesClient',
  View: LikesView,
  useSectionClientState: useLikesClientState,
});
