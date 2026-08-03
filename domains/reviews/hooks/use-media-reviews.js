'use client';

/**
 * Media Reviews - Custom Hook
 * Path: features/media-reviews/use-media-reviews.js
 */

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
} from '@/domains/reviews/server';
import { AUTH_ROUTES, buildAuthHref, getCurrentPathWithSearch } from '@/domains/auth/utils';
import { getRatingStats, sortReviews } from '../ui/review-data';

// ==========================================
// 1. HELPER FUNCTIONS
// ==========================================

function createReviewNavState({ ownReview = null }) {
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

// ==========================================
// 2. MAIN HOOK
// ==========================================

export function useMediaReviews({
  entityId,
  entityType,
  title,
  posterPath = null,
  backdropPath = null,
  limitCount,
  onReviewStateChange,
}) {
  // ------------------------------------------
  // A. HOOKS & SERVICES
  // ------------------------------------------
  const { navHeight } = useNavHeight();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();

  // ------------------------------------------
  // B. LOCAL STATES & REFS
  // ------------------------------------------
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const pendingLikesRef = useRef(new Map());

  // ------------------------------------------
  // C. COMPUTED VALUES
  // ------------------------------------------
  const currentUserId = auth.user?.id;
  const currentPath = useMemo(
    () => getCurrentPathWithSearch(pathname, searchParams),
    [pathname, searchParams],
  );

  const { profile: userProfile } = useAccountProfile({
    resolvedUserId: currentUserId,
  });

  const media = useMemo(
    () => ({ backdropPath, entityId, entityType, posterPath, title }),
    [backdropPath, entityId, entityType, posterPath, title],
  );

  // ------------------------------------------
  // D. SUBSCRIPTION EFFECT
  // ------------------------------------------
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setLoadError(null);

    let unsubscribe = () => {};

    try {
      unsubscribe = subscribeToMediaReviews(
        media,
        (nextReviews) => {
          if (!isMounted) return;

          const mergedReviews = nextReviews.map((review) => {
            const reviewId = review.docPath || review.id;
            const pendingLikes = pendingLikesRef.current.get(reviewId);
            return pendingLikes ? { ...review, likes: pendingLikes } : review;
          });

          setReviews(mergedReviews);
          setIsLoading(false);
        },
        {
          limitCount,
          liveUserId: currentUserId,
          onError: (error) => {
            if (!isMounted) return;
            console.error('[Reviews] Could not load reviews:', error);
            setLoadError(error?.message || 'Reviews are temporarily unavailable');
            setIsLoading(false);
          },
        },
      );
    } catch (error) {
      console.error('[Reviews] Could not initialize reviews:', error);
      setLoadError(error?.message || 'Reviews are temporarily unavailable');
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [currentUserId, limitCount, media]);

  // ------------------------------------------
  // E. MEMOIZED STATS & DERIVED DATA
  // ------------------------------------------
  const ownReview = useMemo(() => {
    if (!currentUserId) return null;
    return reviews.find((review) => review.user?.id === currentUserId) || null;
  }, [reviews, currentUserId]);

  const ratingStats = useMemo(() => getRatingStats(reviews), [reviews]);
  const sortedReviews = useMemo(
    () => sortReviews(reviews, currentUserId),
    [reviews, currentUserId],
  );

  // ------------------------------------------
  // F. HANDLERS & CALLBACKS
  // ------------------------------------------
  const handleSignInRequest = useCallback(() => {
    router.push(buildAuthHref(AUTH_ROUTES.SIGN_IN, { next: currentPath }));
  }, [currentPath, router]);

  const handleDelete = useCallback(async () => {
    if (!auth.isAuthenticated || !ownReview) return false;

    try {
      await deleteMediaReview({ media, userId: currentUserId });
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

      const reviewId = review.docPath || review.id;
      const wasLiked = review.likes?.includes(currentUserId);
      const previousReviews = [...reviews];

      const currentItem = reviews.find((r) => (r.docPath || r.id) === reviewId);
      const currentLikes = Array.isArray(currentItem?.likes) ? currentItem.likes : [];
      const nextLikes = wasLiked
        ? currentLikes.filter((id) => id !== currentUserId)
        : [...new Set([...currentLikes, currentUserId])];

      pendingLikesRef.current.set(reviewId, nextLikes);

      setReviews((current) =>
        current.map((item) =>
          (item.docPath || item.id) === reviewId ? { ...item, likes: nextLikes } : item,
        ),
      );

      try {
        await toggleReviewLike({
          media,
          review,
          reviewUserId: review?.reviewUserId || review?.user?.id,
          userId: currentUserId,
        });

        setTimeout(() => pendingLikesRef.current.delete(reviewId), 3000);
      } catch (error) {
        pendingLikesRef.current.delete(reviewId);
        setReviews(previousReviews);
        toast.error(error?.message || 'Failed to update like');
      }
    },
    [auth.isAuthenticated, currentUserId, handleSignInRequest, media, reviews, toast],
  );

  const applyOptimisticReviewUpdate = useCallback((review, updatedReview) => {
    if (!review || !updatedReview) return;
    const reviewIdentity = review.docPath || review.id;

    setReviews((current) =>
      current.map((item) =>
        (item.docPath || item.id) === reviewIdentity ? { ...item, ...updatedReview } : item,
      ),
    );
  }, []);

  // Sync state changes with navigation parent listener
  useEffect(() => {
    if (onReviewStateChange) {
      onReviewStateChange(createReviewNavState({ ownReview }));
    }
  }, [onReviewStateChange, ownReview]);

  // ------------------------------------------
  // G. EXPORTS
  // ------------------------------------------
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
