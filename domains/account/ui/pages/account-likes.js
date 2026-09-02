'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  hasMatchingSeededFeed,
  shouldBlockAccountFeedLoad,
  useSeededFeedState,
} from '@/domains/account/hooks/feed-state';
import { isPermissionDeniedError, logDataError } from '@/domains/account/utils/validation';
import { useToast } from '@/modules/notification';
import { fetchAccountReviewFeed } from '@/domains/account/client/account-api';
import { fetchCollectionResource } from '@/domains/account/client/collections';
import { updateFavoriteShowcase } from '@/domains/media/client/likes';
import { subscribeToUserWatched } from '@/domains/media/client/watched';
import { toggleStoredReviewLike } from '@/domains/reviews/client/mutations';
import { PROFILE_REVIEW_FEED_MODE } from '@/domains/reviews/utils/constants';
import { createAccountSectionClient } from '@/domains/account/ui/sections/account-section-factory';
import AccountLikesFeed from '@/domains/account/ui/sections/collections/likes-collection';
import AccountAction from '@/domains/shell/navigation/actions/account-action';
import {
  createAccountSectionRegistry,
  createAccountSectionView,
} from '@/domains/account/ui/sections/account-section-factory';

const LIKE_SEGMENTS = new Set(['titles', 'reviews', 'lists']);
const LIKED_REVIEWS_PAGE_SIZE = 36;

function buildReviewDedupKey(item = {}, fallbackIndex = 0) {
  return String(
    item?.id ||
      item?.docPath ||
      `${item?.subjectType || 'subject'}-${item?.subjectId || 'id'}-${item?.reviewUserId || fallbackIndex}`,
  );
}

function mergeUniqueReviews(currentItems = [], nextItems = []) {
  const keys = new Set();
  return [...currentItems, ...nextItems].filter((item, index) => {
    const key = buildReviewDedupKey(item, index);
    if (keys.has(key)) return false;
    keys.add(key);
    return true;
  });
}

function useLikesClientState({ auth, routeData, sectionProviderValue, sectionState }) {
  const { initialLikedLists = null, initialReviewFeed = null } = routeData || {};
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [isShowcaseSaving, setIsShowcaseSaving] = useState(false);
  const [watchedItems, setWatchedItems] = useState([]);
  const latestLikedReviewsRequestRef = useRef(0);
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
    cursor: reviewCursor,
    feedError: reviewsError,
    hasMore: hasMoreReviews,
    isFeedLoading: isReviewsLoading,
    items: reviews,
    resetFeed: resetReviews,
    setFeedError: setReviewsError,
    setIsFeedLoading: setIsReviewsLoading,
    setItems: setReviews,
    syncFeed: syncReviewFeed,
    totalCount: totalReviewsCount,
  } = useSeededFeedState(initialReviewFeed);
  const [isReviewsLoadingMore, setIsReviewsLoadingMore] = useState(false);
  const reviewItemsRef = useRef(reviews);
  const reviewPaginationRef = useRef({
    cursor: reviewCursor,
    hasMore: hasMoreReviews,
  });
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
      expectedValue: PROFILE_REVIEW_FEED_MODE.LIKED,
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
    return () => {
      latestLikedReviewsRequestRef.current += 1;
    };
  }, [activeSegment, resolvedUserId]);

  useEffect(() => {
    reviewItemsRef.current = reviews;
  }, [reviews]);

  useEffect(() => {
    reviewPaginationRef.current = {
      cursor: reviewCursor,
      hasMore: hasMoreReviews,
    };
  }, [hasMoreReviews, reviewCursor]);

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

  const [localShowcase, setLocalShowcase] = useState(favoriteShowcase || []);
  const [savedShowcase, setSavedShowcase] = useState(favoriteShowcase || []);
  const lastPersistTimeRef = useRef(0);
  const isSavingRef = useRef(false);

  const getCanonicalMediaKey = useCallback((item = {}) => {
    if (!item) return '';
    const rawType = item?.entityType || item?.media_type || item?.type || '';
    const rawId = String(item?.entityId ?? item?.id ?? '').trim();

    if (item?.mediaKey) {
      const key = String(item.mediaKey).trim();
      if (key.includes('-')) return key.replace('-', '_');
      return key;
    }

    let entityId = rawId;
    let resolvedType = rawType;

    if (rawId.includes('-') || rawId.includes('_')) {
      const parts = rawId.split(/[-_]/);
      if (parts.length >= 2) {
        if (!resolvedType) resolvedType = parts[0];
        entityId = parts[parts.length - 1];
      }
    }

    const normalizedType =
      String(resolvedType).trim().toLowerCase() === 'tv' ||
      String(resolvedType).trim().toLowerCase() === 'show'
        ? 'tv'
        : 'movie';

    return `${normalizedType}_${entityId}`;
  }, []);

  const isShowcaseDirty = useMemo(() => {
    if (localShowcase.length !== savedShowcase.length) return false;
    return localShowcase.some((item, index) => {
      const currentKey = getCanonicalMediaKey(item);
      const savedKey = getCanonicalMediaKey(savedShowcase[index]);
      return currentKey !== savedKey;
    });
  }, [getCanonicalMediaKey, localShowcase, savedShowcase]);

  useEffect(() => {
    if (isSavingRef.current || isShowcaseDirty || Date.now() - lastPersistTimeRef.current < 3000) {
      return;
    }
    setLocalShowcase(favoriteShowcase || []);
    setSavedShowcase(favoriteShowcase || []);
  }, [favoriteShowcase, isShowcaseDirty]);

  const showcaseMap = useMemo(() => {
    return new Map((localShowcase || []).map((item) => [getCanonicalMediaKey(item), item]));
  }, [getCanonicalMediaKey, localShowcase]);

  const handleReorderShowcase = useCallback((nextItems) => {
    setLocalShowcase(nextItems);
  }, []);

  const handleSaveShowcaseReorder = useCallback(async () => {
    if (!auth.user?.id || !isShowcaseDirty) {
      return;
    }

    lastPersistTimeRef.current = Date.now();
    isSavingRef.current = true;
    setIsShowcaseSaving(true);

    try {
      await updateFavoriteShowcase({
        items: localShowcase,
        userId: auth.user.id,
      });
      setSavedShowcase(localShowcase);
      toast.success('Favorites order saved successfully');
    } catch (error) {
      toast.error(error?.message || 'Favorites showcase could not be updated');
    } finally {
      isSavingRef.current = false;
      setIsShowcaseSaving(false);
    }
  }, [auth.user?.id, isShowcaseDirty, localShowcase, toast]);

  const handleCancelShowcaseReorder = useCallback(() => {
    setLocalShowcase(savedShowcase);
  }, [savedShowcase]);

  const handleToggleShowcase = useCallback(
    async (item) => {
      if (!auth.user?.id) {
        return;
      }

      const canonicalKey = getCanonicalMediaKey(item);
      const isExisting = showcaseMap.has(canonicalKey);
      let nextItems;

      if (isExisting) {
        nextItems = localShowcase.filter(
          (currentItem) => getCanonicalMediaKey(currentItem) !== canonicalKey,
        );
      } else {
        if (localShowcase.length >= 5) {
          toast.error('Favorites showcase can contain up to 5 titles');
          return;
        }
        nextItems = [...localShowcase, item];
      }

      lastPersistTimeRef.current = Date.now();
      isSavingRef.current = true;
      const previousShowcase = localShowcase;
      setLocalShowcase(nextItems);
      setSavedShowcase(nextItems);
      setIsShowcaseSaving(true);

      try {
        await updateFavoriteShowcase({
          items: nextItems,
          userId: auth.user.id,
        });
        toast.success(
          isExisting ? 'Removed from favorites showcase' : 'Added to favorites showcase',
        );
      } catch (error) {
        setLocalShowcase(previousShowcase);
        setSavedShowcase(previousShowcase);
        toast.error(error?.message || 'Favorites showcase could not be updated');
      } finally {
        isSavingRef.current = false;
        setIsShowcaseSaving(false);
      }
    },
    [auth.user?.id, getCanonicalMediaKey, localShowcase, showcaseMap, toast],
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

  const loadReviews = useCallback(
    async ({ append = false } = {}) => {
      const requestId = latestLikedReviewsRequestRef.current + 1;
      latestLikedReviewsRequestRef.current = requestId;

      if (!resolvedUserId) {
        resetReviews();
        return;
      }

      if (!isViewerReady) return;

      if (shouldBlockReviewLoad) {
        resetReviews();
        return;
      }

      if (!append && hasSeededReviewFeed) {
        setIsReviewsLoading(false);
        return;
      }

      const pagination = reviewPaginationRef.current;
      if (append && (!pagination.hasMore || pagination.cursor === null)) {
        return;
      }

      const setLoading = append ? setIsReviewsLoadingMore : setIsReviewsLoading;
      setLoading(true);
      setReviewsError(null);

      try {
        const result = await fetchAccountReviewFeed({
          cursor: append ? pagination.cursor : null,
          mode: PROFILE_REVIEW_FEED_MODE.LIKED,
          pageSize: LIKED_REVIEWS_PAGE_SIZE,
          userId: resolvedUserId,
        });
        if (latestLikedReviewsRequestRef.current !== requestId) return;

        const incomingItems = Array.isArray(result?.items) ? result.items : [];
        syncReviewFeed({
          ...result,
          items: append ? mergeUniqueReviews(reviewItemsRef.current, incomingItems) : incomingItems,
          mode: PROFILE_REVIEW_FEED_MODE.LIKED,
          userId: resolvedUserId,
        });
      } catch (error) {
        if (latestLikedReviewsRequestRef.current !== requestId) return;

        if (!append) resetReviews();

        if (!isPermissionDeniedError(error)) {
          logDataError('[Account] Liked reviews could not be loaded:', error);
          setReviewsError('Liked reviews could not be loaded right now');
        }
      } finally {
        if (latestLikedReviewsRequestRef.current === requestId) {
          setLoading(false);
        }
      }
    },
    [
      hasSeededReviewFeed,
      isViewerReady,
      resetReviews,
      resolvedUserId,
      setIsReviewsLoading,
      setReviewsError,
      shouldBlockReviewLoad,
      syncReviewFeed,
    ],
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
        const items = await fetchCollectionResource({
          limitCount: 500,
          resource: 'liked-lists',
          userId: resolvedUserId,
        });

        if (!ignore) {
          setLikedLists(items);
        }
      } catch (error) {
        if (!ignore) {
          resetLikedLists();

          if (!isPermissionDeniedError(error)) {
            logDataError('[Account] Liked lists could not be loaded:', error);
            setLikedListsError('Liked lists could not be loaded right now');
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

      const reviewId = review.docPath || review.id;
      const currentUserId = auth.user.id;
      let previousReviews = [];

      setReviews((current) => {
        previousReviews = current;
        return current.map((item) => {
          if ((item.docPath || item.id) !== reviewId) {
            return item;
          }

          const currentLikes = Array.isArray(item.likes) ? item.likes : [];
          const currentlyLiked = currentLikes.includes(currentUserId);
          const nextLikes = currentlyLiked
            ? currentLikes.filter((likeUserId) => likeUserId !== currentUserId)
            : Array.from(new Set([...currentLikes, currentUserId]));

          return {
            ...item,
            likes: nextLikes,
          };
        });
      });

      try {
        await toggleStoredReviewLike({
          review,
          userId: currentUserId,
        });
      } catch (error) {
        setReviews(previousReviews);
        toast.error(error?.message || 'Review could not be updated');
      }
    },
    [auth.isAuthenticated, auth.user?.id, handleSignInRequest, setReviews, toast],
  );

  return {
    activeSegment,
    favoriteShowcase: localShowcase,
    handleCancelShowcaseReorder,
    handleLike,
    handleReorderShowcase,
    handleRequestRemoveLike,
    handleSaveShowcaseReorder,
    handleSegmentChange,
    handleToggleShowcase,
    isLikedListsLoading,
    isLikesLoading,
    hasMoreReviews,
    isReviewsLoading,
    isReviewsLoadingMore,
    isShowcaseDirty,
    isShowcaseSaving,
    likedLists,
    likedListsError,
    likes,
    providerValue: sectionProviderValue,
    loadReviews,
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
    {
      activeSegment = 'titles',
      canShowLikesGrid = false,
      handleCancelShowcaseReorder,
      handleSaveShowcaseReorder,
      handleSegmentChange = () => {},
      isShowcaseDirty = false,
      isShowcaseSaving = false,
    },
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
        showProfileFollowAction={false}
        showSaveAction={sectionState.isOwner && activeSegment === 'titles' && isShowcaseDirty}
        showCancelAction={sectionState.isOwner && activeSegment === 'titles' && isShowcaseDirty}
        onSave={handleSaveShowcaseReorder}
        onCancel={handleCancelShowcaseReorder}
        isSaveLoading={isShowcaseSaving}
        isCancelDisabled={isShowcaseSaving}
        saveLabel="Save"
        cancelLabel="Cancel"
      />
    ) : null,
  }),
});

const LikesView = createAccountSectionView({
  activeSection: 'likes',
  displayName: 'AccountLikesView',
  Registry,
  resolveRegistryProps: (
    sectionState,
    {
      activeSegment,
      handleCancelShowcaseReorder,
      handleSaveShowcaseReorder,
      handleSegmentChange,
      isShowcaseDirty,
      isShowcaseSaving,
    },
  ) => ({
    activeSegment,
    canShowLikesGrid: sectionState.canViewProfileCollections,
    handleCancelShowcaseReorder,
    handleSaveShowcaseReorder,
    handleSegmentChange,
    isShowcaseDirty,
    isShowcaseSaving,
  }),
  skeletonVariant: 'collection',
  renderContent: (
    sectionState,
    {
      activeSegment,
      favoriteShowcase,
      handleLike,
      handleReorderShowcase,
      handleRequestRemoveLike,
      handleToggleShowcase,
      isLikedListsLoading,
      isLikesLoading,
      hasMoreReviews,
      isReviewsLoading,
      isReviewsLoadingMore,
      isShowcaseSaving,
      likedLists,
      likedListsError,
      likes,
      loadReviews,
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
      hasMoreReviews={hasMoreReviews}
      isReviewsLoading={isReviewsLoading}
      isReviewsLoadingMore={isReviewsLoadingMore}
      isShowcaseSaving={isShowcaseSaving}
      likedLists={likedLists}
      likedListsError={likedListsError}
      likes={likes}
      onReorderShowcase={handleReorderShowcase}
      onRemoveShowcaseItem={handleToggleShowcase}
      loadReviews={loadReviews}
      reviews={reviews}
      reviewsError={reviewsError}
      reviewsTotalCount={reviewsTotalCount}
      showcaseMap={showcaseMap}
      watchedItems={watchedItems}
    />
  ),
});

const AccountLikesView = createAccountSectionClient({
  activeTab: 'likes',
  displayName: 'AccountLikesClient',
  View: LikesView,
  useSectionClientState: useLikesClientState,
});

export default AccountLikesView;
