'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import { useAccountProfile } from '@/modules/account';
import { useAuth } from '@/modules/auth';
import { useNavHeight, useNavigationActions } from '@/modules/nav';
import { useToast } from '@/modules/notification';
import { deleteMediaReview, toggleReviewLike } from '@/domains/reviews/client/mutations';
import { subscribeToMediaReviews } from '@/domains/reviews/client/subscriptions';
import { getRatingStats, sortReviews } from '@/domains/reviews/utils/formatting';
import { getCurrentPathWithSearch } from '@/domains/auth/utils/routes';
import { createSignInSurfaceEntry } from '@/domains/shell/navigation/surfaces/sign-in-surface';

const PENDING_LIKE_TIMEOUT_MS = 3000;

function getReviewIdentity(review) {
  return (
    review?.docPath ||
    review?.id ||
    (review?.reviewUserId ? `user:${review.reviewUserId}` : null) ||
    (review?.user?.id ? `user:${review.user.id}` : null) ||
    null
  );
}

function getReviewKeys(review) {
  const keys = [];
  if (review?.docPath) keys.push(review.docPath);
  if (review?.id) keys.push(review.id);
  const userId = review?.reviewUserId || review?.user?.id;
  if (userId) keys.push(`user:${userId}`);
  return keys;
}

function createReviewNavState({
  canSubmit = true,
  isActive = false,
  isSubmitting = false,
  loadingLabel = null,
  ownReview = null,
  submitLabel = null,
  submitReview = null,
  applyOptimisticReviewUpdate = null,
} = {}) {
  return {
    canSubmit,
    isActive,
    isSubmitting,
    loadingLabel,
    ownReview: ownReview || null,
    submitLabel,
    submitReview,
    applyOptimisticReviewUpdate,
  };
}

export function useMediaReviews({
  entityId,
  entityType,
  title,
  posterPath = null,
  backdropPath = null,
  limitCount,
  onReviewStateChange,
}) {
  const { navHeight } = useNavHeight();
  const auth = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { openSurface } = useNavigationActions();
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const pendingLikesRef = useRef(new Map());
  const pendingLikeTimeoutsRef = useRef(new Map());
  const currentUserId = auth.user?.id || null;
  const currentPath = useMemo(
    () => getCurrentPathWithSearch(pathname, searchParams),
    [pathname, searchParams],
  );
  const { profile: userProfile } = useAccountProfile({ resolvedUserId: currentUserId });
  const media = useMemo(
    () => ({ backdropPath, entityId, entityType, posterPath, title }),
    [backdropPath, entityId, entityType, posterPath, title],
  );

  const clearPendingLike = useCallback((review) => {
    const keys = typeof review === 'string' ? [review] : getReviewKeys(review);
    keys.forEach((key) => {
      const timeoutId = pendingLikeTimeoutsRef.current.get(key);
      if (timeoutId) clearTimeout(timeoutId);
      pendingLikeTimeoutsRef.current.delete(key);
      pendingLikesRef.current.delete(key);
    });
  }, []);

  const preservePendingLike = useCallback(
    (review, likes) => {
      clearPendingLike(review);
      const keys = typeof review === 'string' ? [review] : getReviewKeys(review);
      keys.forEach((key) => {
        pendingLikesRef.current.set(key, likes);
        const timeoutId = setTimeout(() => clearPendingLike(key), PENDING_LIKE_TIMEOUT_MS);
        pendingLikeTimeoutsRef.current.set(key, timeoutId);
      });
    },
    [clearPendingLike],
  );

  useEffect(
    () => () => {
      pendingLikeTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      pendingLikeTimeoutsRef.current.clear();
      pendingLikesRef.current.clear();
    },
    [],
  );

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);
    setLoadError(null);

    let unsubscribe = () => {};
    try {
      unsubscribe = subscribeToMediaReviews(
        media,
        (nextReviews) => {
          if (!isCurrent) return;

          setReviews(
            nextReviews.map((review) => {
              const keys = getReviewKeys(review);
              let pendingLikes = null;
              for (const key of keys) {
                if (pendingLikesRef.current.has(key)) {
                  pendingLikes = pendingLikesRef.current.get(key);
                  break;
                }
              }
              return pendingLikes ? { ...review, likes: pendingLikes } : review;
            }),
          );
          setIsLoading(false);
        },
        {
          limitCount,
          liveUserId: currentUserId,
          onError: (error) => {
            if (!isCurrent) return;
            setLoadError(error?.message || 'Reviews are temporarily unavailable');
            setIsLoading(false);
          },
        },
      );
    } catch (error) {
      setLoadError(error?.message || 'Reviews are temporarily unavailable');
      setIsLoading(false);
    }

    return () => {
      isCurrent = false;
      unsubscribe();
    };
  }, [currentUserId, limitCount, media]);

  const matchedOwnReview = useMemo(
    () => reviews.find((review) => review.user?.id === currentUserId) || null,
    [currentUserId, reviews],
  );
  const ownReviewRef = useRef(matchedOwnReview);

  const ownReview = useMemo(() => {
    const prev = ownReviewRef.current;
    if (!matchedOwnReview && !prev) return null;
    if (!matchedOwnReview || !prev) {
      ownReviewRef.current = matchedOwnReview;
      return matchedOwnReview;
    }
    const isSame =
      prev.id === matchedOwnReview.id &&
      prev.content === matchedOwnReview.content &&
      prev.rating === matchedOwnReview.rating &&
      prev.updatedAt === matchedOwnReview.updatedAt &&
      prev.isSpoiler === matchedOwnReview.isSpoiler;
    if (!isSame) {
      ownReviewRef.current = matchedOwnReview;
      return matchedOwnReview;
    }
    return prev;
  }, [matchedOwnReview]);
  const ratingStats = useMemo(() => getRatingStats(reviews), [reviews]);
  const sortedReviews = useMemo(
    () => sortReviews(reviews, currentUserId),
    [currentUserId, reviews],
  );

  const handleSignInRequest = useCallback(() => {
    void openSurface(createSignInSurfaceEntry({ next: currentPath }));
  }, [currentPath, openSurface]);

  const handleDelete = useCallback(async () => {
    if (!auth.isAuthenticated || !ownReview) return false;

    try {
      await deleteMediaReview({ media, userId: currentUserId });
      const ownReviewId = getReviewIdentity(ownReview);
      setReviews((current) =>
        current.filter((review) => getReviewIdentity(review) !== ownReviewId),
      );
      return true;
    } catch (error) {
      toast.error(error?.message || 'Failed to delete review');
      return false;
    }
  }, [auth.isAuthenticated, currentUserId, media, ownReview, toast]);

  const handleLike = useCallback(
    async (review) => {
      if (!auth.isAuthenticated || !currentUserId) {
        handleSignInRequest();
        return;
      }

      const reviewKeys = getReviewKeys(review);
      if (reviewKeys.length === 0) return;

      const previousLikes = Array.isArray(review.likes) ? review.likes : [];
      const optimisticLikes = previousLikes.includes(currentUserId)
        ? previousLikes.filter((userId) => userId !== currentUserId)
        : [...new Set([...previousLikes, currentUserId])];

      preservePendingLike(review, optimisticLikes);
      setReviews((current) =>
        current.map((item) => {
          const isTarget = getReviewKeys(item).some((k) => reviewKeys.includes(k));
          return isTarget ? { ...item, likes: optimisticLikes } : item;
        }),
      );

      try {
        const isNowLiked = await toggleReviewLike({
          media,
          review,
          reviewUserId: review.reviewUserId || review.user?.id,
          userId: currentUserId,
        });
        const confirmedLikes = isNowLiked
          ? [...new Set([...previousLikes, currentUserId])]
          : previousLikes.filter((userId) => userId !== currentUserId);
        preservePendingLike(review, confirmedLikes);
        setReviews((current) =>
          current.map((item) => {
            const isTarget = getReviewKeys(item).some((k) => reviewKeys.includes(k));
            return isTarget ? { ...item, likes: confirmedLikes } : item;
          }),
        );
      } catch (error) {
        clearPendingLike(review);
        setReviews((current) =>
          current.map((item) => {
            const isTarget = getReviewKeys(item).some((k) => reviewKeys.includes(k));
            return isTarget ? { ...item, likes: previousLikes } : item;
          }),
        );
        toast.error(error?.message || 'Failed to update like');
      }
    },
    [
      auth.isAuthenticated,
      clearPendingLike,
      currentUserId,
      handleSignInRequest,
      media,
      preservePendingLike,
      toast,
    ],
  );

  const applyOptimisticReviewUpdate = useCallback((updatedReview) => {
    const reviewId = getReviewIdentity(updatedReview);
    if (!reviewId) return;

    setReviews((current) => {
      const exists = current.some((review) => getReviewIdentity(review) === reviewId);
      return exists
        ? current.map((review) =>
            getReviewIdentity(review) === reviewId ? { ...review, ...updatedReview } : review,
          )
        : [updatedReview, ...current];
    });
  }, []);

  useEffect(() => {
    onReviewStateChange?.(
      createReviewNavState({
        ownReview,
        applyOptimisticReviewUpdate,
      }),
    );
  }, [applyOptimisticReviewUpdate, onReviewStateChange, ownReview]);

  return {
    applyOptimisticReviewUpdate,
    currentUserId,
    handleDelete,
    handleLike,
    handleSignInRequest,
    isLoading,
    loadError,
    navHeight,
    ownReview,
    ratingStats,
    reviews,
    sortedReviews,
    userProfile,
  };
}
