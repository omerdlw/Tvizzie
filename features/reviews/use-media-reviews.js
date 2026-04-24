'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { AUTH_ROUTES } from '@/features/auth/constants';
import { buildAuthHref, getCurrentPathWithSearch } from '@/features/auth/utils';
import { useAccountProfile } from '@/core/modules/account';
import { useAuth } from '@/core/modules/auth';
import { useNavHeight } from '@/core/modules/nav/hooks';
import { useToast } from '@/core/modules/notification/hooks';
import { deleteMediaReview, subscribeToMediaReviews, toggleReviewLike } from '@/core/services/media/reviews.service';

import { getRatingStats, sortReviews } from './utils';

function createReviewNavState({ confirmation = null, ownReview = null }) {
  return {
    canSubmit: true,
    confirmation,
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
  const [navConfirmation, setNavConfirmation] = useState(null);
  const pendingLikesRef = useRef(new Map());

  const currentUserId = auth.user?.id;
  const currentPath = useMemo(() => getCurrentPathWithSearch(pathname, searchParams), [pathname, searchParams]);
  const { profile: userProfile } = useAccountProfile({
    resolvedUserId: currentUserId,
  });

  const media = useMemo(
    () => ({
      backdropPath,
      entityId,
      entityType,
      posterPath,
      title,
    }),
    [backdropPath, entityId, entityType, posterPath, title]
  );

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

          // Merge pending optimistic likes
          const mergedReviews = nextReviews.map((review) => {
            const reviewId = review.docPath || review.id;
            const pendingLikes = pendingLikesRef.current.get(reviewId);

            if (pendingLikes) {
              return { ...review, likes: pendingLikes };
            }

            return review;
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
        }
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

  const ownReview = useMemo(() => {
    if (!currentUserId) {
      return null;
    }

    return reviews.find((review) => review.user?.id === currentUserId) || null;
  }, [reviews, currentUserId]);

  const ratingStats = useMemo(() => getRatingStats(reviews), [reviews]);
  const sortedReviews = useMemo(() => sortReviews(reviews, currentUserId), [reviews, currentUserId]);

  const handleSignInRequest = useCallback(() => {
    router.push(
      buildAuthHref(AUTH_ROUTES.SIGN_IN, {
        next: currentPath,
      })
    );
  }, [currentPath, router]);

  const handleDelete = useCallback(async () => {
    if (!auth.isAuthenticated || !ownReview) {
      return false;
    }

    try {
      await deleteMediaReview({ media, userId: currentUserId });
      setNavConfirmation(null);
      return true;
    } catch (error) {
      toast.error(error?.message || 'Failed to delete review');
      return false;
    }
  }, [auth.isAuthenticated, currentUserId, media, ownReview, toast]);

  const handleLike = useCallback(
    async (review) => {
      if (!auth.isAuthenticated || !currentUserId) {
        router.push(
          buildAuthHref(AUTH_ROUTES.SIGN_IN, {
            next: currentPath,
          })
        );
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

      // Track pending optimistic state to prevent polling revert
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
        await toggleReviewLike({
          media,
          review,
          reviewUserId: review?.reviewUserId || review?.user?.id,
          userId: currentUserId,
        });

        // Keep in pending for a few seconds to let polling catch up
        setTimeout(() => {
          pendingLikesRef.current.delete(reviewId);
        }, 3000);
      } catch (error) {
        // Rollback
        pendingLikesRef.current.delete(reviewId);
        setReviews(previousReviews);
        toast.error(error?.message || 'Failed to update like');
      }
    },
    [auth.isAuthenticated, currentPath, currentUserId, media, reviews, router, toast]
  );

  const applyOptimisticReviewUpdate = useCallback((review, updatedReview) => {
    if (!review || !updatedReview) {
      return;
    }

    const reviewIdentity = review.docPath || review.id;

    setReviews((current) =>
      current.map((item) => ((item.docPath || item.id) === reviewIdentity ? { ...item, ...updatedReview } : item))
    );
  }, []);

  useEffect(() => {
    if (!onReviewStateChange) {
      return;
    }

    onReviewStateChange(
      createReviewNavState({
        confirmation: navConfirmation,
        ownReview,
      })
    );
  }, [navConfirmation, onReviewStateChange, ownReview]);

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
    setNavConfirmation,
    sortedReviews,
    userProfile,
  };
}
