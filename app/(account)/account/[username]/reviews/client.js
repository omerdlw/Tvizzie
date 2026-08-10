'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  hasMatchingSeededFeed,
  shouldBlockAccountFeedLoad,
  useSeededFeedState,
} from '@/domains/account/hooks';
import { isPermissionDeniedError, logDataError } from '@/domains/account/utils';
import { fetchAccountReviewFeed } from '@/domains/account/client/account-api.client';
import { useModal } from '@/modules/modal';
import { useToast } from '@/modules/notification';
import { TMDB_IMG } from '@/shared/constants';
import { deleteStoredReview, toggleStoredReviewLike } from '@/domains/reviews/server';
import { subscribeToUserWatched } from '@/domains/media/server/watched-watchlist';
import { useNavigationActions } from '@/modules/nav';
import { createReviewEditorSurfaceEntry } from '@/domains/reviews/ui/surfaces/review-editor-surface';
import { createAccountSectionClient } from '@/domains/account/ui/sections/account-section-factory';
import AccountReviewFeed from '@/domains/account/ui/sections/feeds/reviews';
import { AccountSectionState } from '@/domains/account/ui/sections/account-section';
import {
  createAccountSectionRegistry,
  createAccountSectionView,
} from '@/domains/account/ui/sections/account-section-factory';

function useReviewsClientState({ auth, routeData, sectionProviderValue, sectionState }) {
  const { initialReviewFeed = null } = routeData || {};
  const { openModal } = useModal();
  const toast = useToast();
  const [watchedItems, setWatchedItems] = useState([]);
  const [reviewDeleteConfirmation, setReviewDeleteConfirmation] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const pendingLikesRef = useRef(new Map());
  const latestReviewRequestRef = useRef(0);
  const {
    canViewProfileCollections,
    canViewPrivateContent,
    handleSignInRequest,
    isOwner,
    isPrivateProfile,
    isViewerReady,
    itemRemoveConfirmation,
    likes,
    profile,
    resolvedUserId,
  } = sectionState;
  const shouldForcePrivateRefresh = !isOwner && isPrivateProfile === true && canViewPrivateContent;
  const {
    applyFeedResult: originalApplyFeedResult,
    cursor,
    feedError,
    hasMore,
    isFeedLoading,
    items: reviews,
    resetFeed,
    setFeedError,
    setIsFeedLoading,
    setItems: setReviews,
    syncFeed,
    totalCount: totalReviewCount,
  } = useSeededFeedState(initialReviewFeed);

  const applyFeedResult = useCallback(
    (result, options) => {
      const mergedItems = (result?.items || []).map((review) => {
        const reviewId = review.docPath || review.id;
        const pendingLikes = pendingLikesRef.current.get(reviewId);

        if (pendingLikes) {
          return { ...review, likes: pendingLikes };
        }

        return review;
      });

      originalApplyFeedResult({ ...result, items: mergedItems }, options);
    },
    [originalApplyFeedResult],
  );

  const hasSeededReviewFeed =
    !shouldForcePrivateRefresh &&
    hasMatchingSeededFeed({
      expectedValue: 'authored',
      initialFeed: initialReviewFeed,
      resolvedUserId,
    });
  const hasUsableSeededReviewFeed =
    hasSeededReviewFeed &&
    (Array.isArray(initialReviewFeed?.items) && initialReviewFeed.items.length > 0
      ? true
      : Boolean(initialReviewFeed?.hasMore) || Number(initialReviewFeed?.totalCount || 0) > 0);
  const shouldBlockFeedLoad = shouldBlockAccountFeedLoad({
    canViewPrivateContent,
    hasSeededFeed: hasUsableSeededReviewFeed,
    isOwner,
    isPrivateProfile,
    isViewerReady,
    resolvedUserId,
  });

  useEffect(() => {
    return () => {
      latestReviewRequestRef.current += 1;
    };
  }, [resolvedUserId]);

  useEffect(() => {
    if (!hasSeededReviewFeed) {
      return;
    }

    syncFeed(initialReviewFeed);
  }, [hasSeededReviewFeed, initialReviewFeed, syncFeed]);
  const editableReviewUser = useMemo(() => {
    if (!isOwner || !auth.user?.id) {
      return null;
    }

    return {
      ...(profile || {}),
      ...(auth.user || {}),
      id: auth.user.id,
    };
  }, [auth.user, isOwner, profile]);

  const loadReviews = useCallback(
    async ({ append = false } = {}) => {
      const requestId = latestReviewRequestRef.current + 1;
      latestReviewRequestRef.current = requestId;

      if (!isViewerReady || !resolvedUserId) {
        return;
      }

      if (shouldBlockFeedLoad) {
        resetFeed();
        setIsLoadingMore(false);
        return;
      }

      if (!append && hasUsableSeededReviewFeed) {
        setIsFeedLoading(false);
        setIsLoadingMore(false);
        return;
      }

      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsFeedLoading(true);
      }
      setFeedError(null);

      try {
        const result = await fetchAccountReviewFeed({
          cursor: append ? cursor : null,
          mode: 'authored',
          userId: resolvedUserId,
        });

        if (latestReviewRequestRef.current !== requestId) return;

        applyFeedResult(result, { append });
      } catch (error) {
        if (latestReviewRequestRef.current !== requestId) return;

        if (!append) {
          resetFeed();
        }

        if (!isPermissionDeniedError(error)) {
          logDataError('[Account] Reviews could not be loaded:', error);
          setFeedError('Reviews could not be loaded right now.');
        }
      } finally {
        if (latestReviewRequestRef.current !== requestId) return;

        if (append) {
          setIsLoadingMore(false);
        } else {
          setIsFeedLoading(false);
        }
      }
    },
    [
      applyFeedResult,
      cursor,
      hasUsableSeededReviewFeed,
      resolvedUserId,
      resetFeed,
      setFeedError,
      setIsFeedLoading,
      shouldBlockFeedLoad,
    ],
  );

  useEffect(() => {
    loadReviews();
  }, [auth.user?.id, isViewerReady, loadReviews]);

  useEffect(() => {
    if (!canViewProfileCollections) {
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
    canViewProfileCollections,
    canViewPrivateContent,
    isOwner,
    isPrivateProfile,
    isViewerReady,
    resolvedUserId,
    shouldForcePrivateRefresh,
  ]);

  const handleLike = useCallback(
    async (review) => {
      if (!auth.isAuthenticated || !auth.user?.id) {
        handleSignInRequest();
        return;
      }

      const userId = auth.user.id;
      const reviewId = review.docPath || review.id;
      const wasLiked = Array.isArray(review.likes) ? review.likes.includes(userId) : false;
      const previousReviews = [...reviews];

      const currentItem = reviews.find((item) => (item.docPath || item.id) === reviewId);
      const currentLikes = Array.isArray(currentItem?.likes) ? currentItem.likes : [];
      const nextLikes = wasLiked
        ? currentLikes.filter((id) => id !== userId)
        : [...new Set([...currentLikes, userId])];

      pendingLikesRef.current.set(reviewId, nextLikes);
      setReviews((current) =>
        current.map((item) => {
          if ((item.docPath || item.id) !== reviewId) {
            return item;
          }

          return {
            ...item,
            likes: nextLikes,
          };
        }),
      );

      try {
        await toggleStoredReviewLike({
          review,
          userId,
        });

        setTimeout(() => {
          pendingLikesRef.current.delete(reviewId);
        }, 3000);
      } catch (error) {
        pendingLikesRef.current.delete(reviewId);
        setReviews(previousReviews);
        toast.error(error?.message || 'Review could not be updated');
      }
    },
    [auth.isAuthenticated, auth.user?.id, handleSignInRequest, reviews, setReviews, toast],
  );

  const { openSurface } = useNavigationActions();

  const handleEditReview = useCallback(
    (review) => {
      if (!editableReviewUser) {
        return;
      }

      openSurface(
        createReviewEditorSurfaceEntry({
          onSuccess: (updatedReview) => {
            setReviews((current) =>
              current.map((item) =>
                (item.docPath || item.id) === (review.docPath || review.id)
                  ? { ...item, ...updatedReview }
                  : item,
              ),
            );
          },
          review,
          user: editableReviewUser,
        }),
      );
    },
    [editableReviewUser, openSurface, setReviews],
  );

  const handleDeleteReview = useCallback(
    (review) => {
      if (!auth.user?.id || !isOwner) {
        return;
      }

      const poster = review?.subjectPoster;
      setReviewDeleteConfirmation({
        title: 'Delete Review?',
        description: 'This review will be permanently removed from your profile.',
        confirmText: 'Delete',
        confirmLoadingText: 'Deleting',
        isDestructive: true,
        icon: poster ? (poster.startsWith('/') ? `${TMDB_IMG}/w342${poster}` : poster) : undefined,
        onCancel: () => setReviewDeleteConfirmation(null),
        onConfirm: async () => {
          try {
            await deleteStoredReview({
              review,
              userId: auth.user.id,
            });

            setReviews((current) =>
              current.filter((item) => (item.docPath || item.id) !== (review.docPath || review.id)),
            );
            setReviewDeleteConfirmation(null);
          } catch (error) {
            toast.error(error?.message || 'Review could not be deleted');
            throw error;
          }
        },
      });
    },
    [auth.user?.id, isOwner, setReviews, toast],
  );

  return {
    feedError,
    handleDeleteReview,
    handleEditReview,
    handleLike,
    hasMore,
    isFeedLoading,
    isLoadingMore,
    likes,
    loadReviews,
    providerValue: {
      ...sectionProviderValue,
      itemRemoveConfirmation: reviewDeleteConfirmation || itemRemoveConfirmation,
    },
    reviews,
    totalReviewCount,
    watchedItems,
  };
}

export const Registry = createAccountSectionRegistry({
  displayName: 'AccountReviewsRegistry',
  navDescription: 'Reviews',
  navRegistrySource: 'account-reviews',
});

const ReviewsView = createAccountSectionView({
  activeSection: 'reviews',
  displayName: 'AccountReviewsView',
  Registry,
  skeletonVariant: 'reviews',
  renderContent: (
    sectionState,
    {
      feedError,
      hasMore,
      handleDeleteReview,
      handleEditReview,
      handleLike,
      isFeedLoading,
      isLoadingMore,
      likes,
      loadReviews,
      reviews,
      totalReviewCount,
      watchedItems,
    },
  ) =>
    sectionState.canViewProfileCollections ? (
      <AccountReviewFeed
        isInitialSection={true}
        currentUserId={sectionState.auth.user?.id || null}
        emptyMessage="No reviews yet"
        hasMore={hasMore}
        icon="solar:chat-round-bold"
        isLoading={isFeedLoading}
        isLoadingMore={isLoadingMore}
        items={reviews}
        likes={likes}
        loadError={feedError}
        onDeleteRequest={handleDeleteReview}
        onEdit={handleEditReview}
        onLike={handleLike}
        onLoadMore={() => loadReviews({ append: true })}
        showHeader={false}
        showOwnActions={sectionState.isOwner}
        summaryLabel={
          Number.isFinite(Number(totalReviewCount)) ? `${Number(totalReviewCount)} Reviews` : null
        }
        title="Reviews"
        watchedItems={watchedItems}
      />
    ) : (
      <AccountSectionState message="This profile is private." />
    ),
});

export default createAccountSectionClient({
  activeTab: 'reviews',
  displayName: 'AccountReviewsClient',
  View: ReviewsView,
  useSectionClientState: useReviewsClientState,
});
