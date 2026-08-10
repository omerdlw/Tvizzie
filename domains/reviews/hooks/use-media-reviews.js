'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useAccountProfile } from '@/modules/account';
import { useAuth } from '@/modules/auth';
import { useNavHeight } from '@/modules/nav';
import { useToast } from '@/modules/notification';
import {
  deleteMediaReview,
  subscribeToMediaReviews,
  toggleReviewLike,
} from '@/domains/reviews/client';
import { AUTH_ROUTES, buildAuthHref, getCurrentPathWithSearch } from '@/domains/auth/utils';
import { getRatingStats, sortReviews } from '../shared/review-data';

const PENDING_LIKE_TIMEOUT_MS = 3000;

function getReviewIdentity(review) {
  return review?.docPath || review?.id || null;
}

function createReviewNavState(ownReview = null) {
  return {
    canSubmit: true,
    isActive: false,
    isSubmitting: false,
    loadingLabel: null,
    ownReview: Boolean(ownReview),
    submitLabel: null,
    submitReview: null,
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();
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

  const clearPendingLike = useCallback((reviewId) => {
    const timeoutId = pendingLikeTimeoutsRef.current.get(reviewId);
    if (timeoutId) clearTimeout(timeoutId);
    pendingLikeTimeoutsRef.current.delete(reviewId);
    pendingLikesRef.current.delete(reviewId);
  }, []);

  const preservePendingLike = useCallback(
    (reviewId, likes) => {
      clearPendingLike(reviewId);
      pendingLikesRef.current.set(reviewId, likes);
      const timeoutId = setTimeout(() => clearPendingLike(reviewId), PENDING_LIKE_TIMEOUT_MS);
      pendingLikeTimeoutsRef.current.set(reviewId, timeoutId);
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
              const pendingLikes = pendingLikesRef.current.get(getReviewIdentity(review));
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

  const ownReview = useMemo(
    () => reviews.find((review) => review.user?.id === currentUserId) || null,
    [currentUserId, reviews],
  );
  const ratingStats = useMemo(() => getRatingStats(reviews), [reviews]);
  const sortedReviews = useMemo(() => sortReviews(reviews, currentUserId), [currentUserId, reviews]);

  const handleSignInRequest = useCallback(() => {
    router.push(buildAuthHref(AUTH_ROUTES.SIGN_IN, { next: currentPath }));
  }, [currentPath, router]);

  const handleDelete = useCallback(async () => {
    if (!auth.isAuthenticated || !ownReview) return false;

    try {
      await deleteMediaReview({ media, userId: currentUserId });
      const ownReviewId = getReviewIdentity(ownReview);
      setReviews((current) => current.filter((review) => getReviewIdentity(review) !== ownReviewId));
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

      const reviewId = getReviewIdentity(review);
      if (!reviewId) return;

      const previousLikes = Array.isArray(review.likes) ? review.likes : [];
      const optimisticLikes = previousLikes.includes(currentUserId)
        ? previousLikes.filter((userId) => userId !== currentUserId)
        : [...new Set([...previousLikes, currentUserId])];

      preservePendingLike(reviewId, optimisticLikes);
      setReviews((current) =>
        current.map((item) =>
          getReviewIdentity(item) === reviewId ? { ...item, likes: optimisticLikes } : item,
        ),
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
        preservePendingLike(reviewId, confirmedLikes);
        setReviews((current) =>
          current.map((item) =>
            getReviewIdentity(item) === reviewId ? { ...item, likes: confirmedLikes } : item,
          ),
        );
      } catch (error) {
        clearPendingLike(reviewId);
        setReviews((current) =>
          current.map((item) =>
            getReviewIdentity(item) === reviewId ? { ...item, likes: previousLikes } : item,
          ),
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
    onReviewStateChange?.(createReviewNavState(ownReview));
  }, [onReviewStateChange, ownReview]);

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
