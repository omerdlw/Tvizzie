'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { AUTH_ROUTES, buildAuthHref, getCurrentPathWithSearch } from '@/features/auth';
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
          setReviews(nextReviews);
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
      toast.success('Your review was deleted');
      setNavConfirmation(null);
      return true;
    } catch (error) {
      toast.error(error?.message || 'Failed to delete review');
      return false;
    }
  }, [auth.isAuthenticated, currentUserId, media, ownReview, toast]);

  const handleLike = useCallback(
    async (review) => {
      if (!auth.isAuthenticated) {
        router.push(
          buildAuthHref(AUTH_ROUTES.SIGN_IN, {
            next: currentPath,
          })
        );
        return;
      }

      try {
        await toggleReviewLike({
          media,
          reviewUserId: review?.reviewUserId || review?.user?.id,
          userId: currentUserId,
        });
      } catch (error) {
        toast.error(error?.message || 'Failed to like review');
      }
    },
    [auth.isAuthenticated, currentPath, currentUserId, media, router, toast]
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
