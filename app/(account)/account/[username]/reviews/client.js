'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  hasMatchingSeededFeed,
  shouldBlockAccountFeedLoad,
  useSeededFeedState,
} from '@/features/account/hooks/section-page';
import { isPermissionDeniedError, logDataError } from '@/core/utils/errors';
import { useAuth } from '@/core/modules/auth';
import { useModal } from '@/core/modules/modal/context';
import { useToast } from '@/core/modules/notification/hooks';
import {
  deleteStoredReview,
  fetchProfileReviewFeed,
  toggleStoredReviewLike,
} from '@/core/services/media/reviews.service';
import { subscribeToUserWatched } from '@/core/services/media/watched.service';
import { useAccountSectionEngine } from '../shared/section-engine';
import { AccountSectionStateProvider } from '../shared/section-context';
import ReviewsView from './view';

export default function Client({ routeData = null }) {
  const { initialReviewFeed = null } = routeData || {};
  const auth = useAuth();
  const { openModal } = useModal();
  const toast = useToast();
  const [watchedItems, setWatchedItems] = useState([]);
  const [reviewDeleteConfirmation, setReviewDeleteConfirmation] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const pendingLikesRef = useRef(new Map());

  const { sectionProviderValue, sectionState } = useAccountSectionEngine({
    activeTab: 'reviews',
    auth,
    routeData,
  });
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
    [originalApplyFeedResult]
  );

  const hasSeededReviewFeed =
    !shouldForcePrivateRefresh &&
    hasMatchingSeededFeed({
      expectedValue: 'authored',
      initialFeed: initialReviewFeed,
      resolvedUserId,
    });
  const shouldBlockFeedLoad = shouldBlockAccountFeedLoad({
    canViewPrivateContent,
    hasSeededFeed: hasSeededReviewFeed,
    isOwner,
    isPrivateProfile,
    isViewerReady,
    resolvedUserId,
  });

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
      if (shouldBlockFeedLoad) {
        resetFeed();
        setIsLoadingMore(false);
        return;
      }

      if (!append && hasSeededReviewFeed) {
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
        const result = await fetchProfileReviewFeed({
          cursor: append ? cursor : null,
          mode: 'authored',
          userId: resolvedUserId,
        });

        applyFeedResult(result, { append });
      } catch (error) {
        if (!append) {
          resetFeed();
        }

        if (!isPermissionDeniedError(error)) {
          logDataError('[Account] Reviews could not be loaded:', error);
          setFeedError('Reviews could not be loaded right now.');
        }
      } finally {
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
      hasSeededReviewFeed,
      resolvedUserId,
      resetFeed,
      setFeedError,
      setIsFeedLoading,
      shouldBlockFeedLoad,
    ]
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
      const nextLikes = wasLiked ? currentLikes.filter((id) => id !== userId) : [...new Set([...currentLikes, userId])];

      // Track pending optimistic state
      pendingLikesRef.current.set(reviewId, nextLikes);

      // Optimistic update
      setReviews((current) =>
        current.map((item) => {
          if ((item.docPath || item.id) !== reviewId) {
            return item;
          }

          return {
            ...item,
            likes: nextLikes,
          };
        })
      );

      try {
        await toggleStoredReviewLike({
          review,
          userId,
        });

        // Keep in pending list for a bit to avoid data re-fetch revert
        setTimeout(() => {
          pendingLikesRef.current.delete(reviewId);
        }, 3000);
      } catch (error) {
        // Rollback
        pendingLikesRef.current.delete(reviewId);
        setReviews(previousReviews);
        toast.error(error?.message || 'Review could not be updated');
      }
    },
    [auth.isAuthenticated, auth.user?.id, handleSignInRequest, reviews, setReviews, toast]
  );

  const handleEditReview = useCallback(
    (review) => {
      if (!editableReviewUser) {
        return;
      }

      openModal('REVIEW_EDITOR_MODAL', 'center', {
        data: {
          onSuccess: (updatedReview) => {
            setReviews((current) =>
              current.map((item) =>
                (item.docPath || item.id) === (review.docPath || review.id) ? { ...item, ...updatedReview } : item
              )
            );
          },
          review,
          user: editableReviewUser,
        },
      });
    },
    [editableReviewUser, openModal, setReviews]
  );

  const handleDeleteReview = useCallback(
    (review) => {
      if (!auth.user?.id || !isOwner) {
        return;
      }

      setReviewDeleteConfirmation({
        title: 'Delete Review?',
        description: 'This review will be permanently removed from your profile.',
        confirmText: 'Delete',
        confirmLoadingText: 'Deleting',
        isDestructive: true,
        onCancel: () => setReviewDeleteConfirmation(null),
        onConfirm: async () => {
          try {
            await deleteStoredReview({
              review,
              userId: auth.user.id,
            });

            setReviews((current) =>
              current.filter((item) => (item.docPath || item.id) !== (review.docPath || review.id))
            );
            setReviewDeleteConfirmation(null);
            toast.success('Your review was deleted');
          } catch (error) {
            toast.error(error?.message || 'Review could not be deleted');
            throw error;
          }
        },
      });
    },
    [auth.user?.id, isOwner, setReviews, toast]
  );

  return (
    <AccountSectionStateProvider
      value={{
        ...sectionProviderValue,
        itemRemoveConfirmation: reviewDeleteConfirmation || itemRemoveConfirmation,
      }}
    >
      <ReviewsView
        feedError={feedError}
        hasMore={hasMore}
        isFeedLoading={isFeedLoading}
        isLoadingMore={isLoadingMore}
        likes={likes}
        loadReviews={loadReviews}
        reviews={reviews}
        totalReviewCount={totalReviewCount}
        watchedItems={watchedItems}
        handleDeleteReview={handleDeleteReview}
        handleEditReview={handleEditReview}
        handleLike={handleLike}
      />
    </AccountSectionStateProvider>
  );
}
