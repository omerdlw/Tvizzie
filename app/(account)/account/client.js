'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { AUTH_ROUTES, buildAuthHref, getCurrentPathWithSearch } from '@/features/auth';
import {
  hasMatchingSeededFeed,
  useAccountSectionPage,
  useDeferredPreviewFeed,
} from '@/features/account/hooks/section-page';
import { isPermissionDeniedError, logDataError } from '@/core/utils/errors';
import { useAuth } from '@/core/modules/auth';
import { useModal } from '@/core/modules/modal/context';
import { useToast } from '@/core/modules/notification/hooks';
import { fetchUserActivityPage } from '@/core/services/activity/activity.service';
import {
  deleteStoredReview,
  fetchProfileReviewFeed,
  toggleStoredReviewLike,
} from '@/core/services/media/reviews.service';
import AccountView from './view';

const PREVIEW_MEDIA_LIMIT = 12;
const PREVIEW_REVIEW_LIMIT = 3;
const PREVIEW_ACTIVITY_LIMIT = 5;
const COLLECTION_PREVIEW_LIMITS = Object.freeze({
  likes: 1,
  lists: 1,
  watched: PREVIEW_MEDIA_LIMIT,
  watchlist: PREVIEW_MEDIA_LIMIT,
});

export default function Client({
  username = null,
  initialActivityFeed = null,
  initialCollections = null,
  initialProfile = null,
  initialResolvedUserId = null,
  initialResolveError = null,
  initialReviewFeed = null,
  RegistryComponent = undefined,
}) {
  const auth = useAuth();
  const { openModal } = useModal();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();
  const seededCurrentAccount = Boolean(!username && initialResolvedUserId);
  const currentPath = useMemo(() => getCurrentPathWithSearch(pathname, searchParams), [pathname, searchParams]);

  const {
    canViewPrivateContent,
    canViewProfileCollections,
    favoriteShowcase,
    followerCount,
    followingCount,
    followState,
    handleEditProfile,
    handleFollow,
    handleOpenFollowList,
    handleRequestRemoveWatchedItem,
    handleRequestRemoveWatchlistItem,
    handleSignInRequest,
    isBioSurfaceOpen,
    isFollowLoading,
    isOwner,
    isPageLoading,
    isPrivateProfile,
    isViewerReady,
    pendingFollowRequestCount,
    profile,
    resolveError,
    resolvedUserId,
    setIsBioSurfaceOpen,
    unfollowConfirmation,
    watched,
    watchedCount,
    watchlist,
    watchlistCount,
    likeCount,
    likes,
    listCount,
    isResolvingProfile,
    itemRemoveConfirmation,
  } = useAccountSectionPage({
    activeTab: 'likes',
    auth,
    collectionPreviewLimits: COLLECTION_PREVIEW_LIMITS,
    initialCollections,
    initialProfile,
    initialResolvedUserId,
    initialResolveError,
    username,
  });
  const shouldForcePrivateRefresh = !isOwner && isPrivateProfile === true && canViewPrivateContent;
  const profileHandle = profile?.username || username || null;
  const hasSeededReviewFeedForUser =
    !shouldForcePrivateRefresh &&
    hasMatchingSeededFeed({
      expectedValue: 'authored',
      initialFeed: initialReviewFeed,
      resolvedUserId,
    });
  const hasSeededActivityFeedForUser =
    !shouldForcePrivateRefresh &&
    hasMatchingSeededFeed({
      initialFeed: initialActivityFeed,
      resolvedUserId,
      valueKey: null,
    });
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
  const [reviewDeleteConfirmation, setReviewDeleteConfirmation] = useState(null);

  useEffect(() => {
    if (username || !isViewerReady || auth.isAuthenticated) {
      return;
    }

    router.replace(
      buildAuthHref(AUTH_ROUTES.SIGN_IN, {
        next: currentPath,
      })
    );
  }, [auth.isAuthenticated, currentPath, isViewerReady, router, username]);

  const reviewPreview = useDeferredPreviewFeed({
    canLoad:
      Boolean(isViewerReady && resolvedUserId && canViewProfileCollections) &&
      (Boolean(username) || auth.isAuthenticated),
    hasSeededFeed: hasSeededReviewFeedForUser,
    initialFeed: initialReviewFeed,
    loadFeed: useCallback(
      () =>
        fetchProfileReviewFeed({
          mode: 'authored',
          pageSize: PREVIEW_REVIEW_LIMIT,
          userId: resolvedUserId,
        }),
      [resolvedUserId]
    ),
    onLoadError: useCallback((error) => {
      if (isPermissionDeniedError(error)) {
        return null;
      }

      logDataError('[Account] Review previews could not be loaded:', error);
      return 'Reviews could not be loaded right now.';
    }, []),
  });
  const activityPreview = useDeferredPreviewFeed({
    canLoad:
      Boolean(isViewerReady && resolvedUserId && canViewProfileCollections) &&
      (Boolean(username) || auth.isAuthenticated),
    hasSeededFeed: hasSeededActivityFeedForUser,
    initialFeed: initialActivityFeed,
    loadFeed: useCallback(
      () =>
        fetchUserActivityPage({
          pageSize: PREVIEW_ACTIVITY_LIMIT,
          userId: resolvedUserId,
        }),
      [resolvedUserId]
    ),
    onLoadError: useCallback((error) => {
      if (isPermissionDeniedError(error)) {
        return null;
      }

      logDataError('[Account] Activity previews could not be loaded:', error);
      return 'Activity could not be loaded right now.';
    }, []),
  });
  const isCurrentAccountLoading = !username && !seededCurrentAccount && (!isViewerReady || auth.status === 'loading');
  const resolvedIsPageLoading = isPageLoading || isCurrentAccountLoading;

  const navDescription =
    !username && isViewerReady && !auth.isAuthenticated ? 'Sign in to see your account' : 'Profile Overview';

  const handleEditReview = useCallback(
    (review) => {
      if (!editableReviewUser) {
        return;
      }

      openModal('REVIEW_EDITOR_MODAL', 'center', {
        data: {
          onSuccess: (updatedReview) => {
            reviewPreview.setItems((current) =>
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
    [editableReviewUser, openModal, reviewPreview]
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

            reviewPreview.setItems((current) =>
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
    [auth.user?.id, isOwner, reviewPreview, toast]
  );

  const handleLikeReview = useCallback(
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

        reviewPreview.setItems((current) =>
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
    [auth.isAuthenticated, auth.user?.id, handleSignInRequest, reviewPreview, toast]
  );

  const overviewModel = {
    auth,
    authoredReviews: reviewPreview.items,
    authoredReviewsError: reviewPreview.feedError,
    authoredReviewsLoading: reviewPreview.isFeedLoading,
    canViewProfileCollections,
    activityError: activityPreview.feedError,
    activityItems: activityPreview.items,
    activityLoading: activityPreview.isFeedLoading,
    favoriteShowcase,
    followerCount,
    followingCount,
    followState,
    handleEditProfile,
    handleEditReview,
    handleFollow,
    handleDeleteReview,
    handleLikeReview,
    handleOpenFollowList,
    handleRequestRemoveWatchedItem,
    handleRequestRemoveWatchlistItem,
    handleSignInRequest,
    hasMoreAuthoredReviews: reviewPreview.hasMore,
    hasMoreActivityItems: activityPreview.hasMore,
    isBioSurfaceOpen,
    isFollowLoading,
    isOwner,
    isPageLoading: resolvedIsPageLoading,
    isResolvingProfile,
    itemRemoveConfirmation: reviewDeleteConfirmation || itemRemoveConfirmation,
    likeCount,
    likes,
    listCount,
    navDescription,
    pendingFollowRequestCount,
    profile,
    profileHandle,
    resolveError,
    resolvedUserId,
    setIsBioSurfaceOpen,
    unfollowConfirmation,
    username,
    watched,
    watchedCount,
    watchlistCount,
    watchlist,
  };

  return (
    <AccountView
      model={overviewModel}
      RegistryComponent={RegistryComponent}
    />
  );
}
