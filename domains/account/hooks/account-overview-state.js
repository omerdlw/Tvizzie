'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  AUTH_ROUTES,
  buildAuthHref,
  getCurrentPathWithSearch,
} from '@/domains/auth/utils/routes';
import {
  deleteStoredReview,
  toggleStoredReviewLike,
} from '@/domains/reviews/client/mutations';
import { createReviewEditorSurfaceEntry } from '@/domains/shell/navigation/surfaces/review-editor-surface';
import { TMDB_IMG } from '@/domains/shell/shared/constants';
import {
  isPermissionDeniedError,
  logDataError,
} from '@/domains/account/utils/validation';
import { fetchAccountReviewFeed } from '@/domains/account/client/account-api.client';
import { useAuth } from '@/modules/auth';
import { useNavigationActions } from '@/modules/nav/context';
import { useToast } from '@/modules/notification';
import { hasMatchingSeededFeed, useDeferredPreviewFeed } from './page.hooks';
import { useAccountSectionEngine } from './account-section-state';

const COLLECTION_PREVIEW_LIMITS = Object.freeze({
  likes: 12,
  lists: 6,
  watched: 12,
  watchlist: 12,
});
const PREVIEW_REVIEW_LIMIT = 6;

function useOverviewPreviewFeed({
  canLoad,
  errorMessage,
  hasSeededFeed,
  initialFeed = null,
  loadFeed,
  logLabel,
}) {
  return useDeferredPreviewFeed({
    canLoad,
    hasSeededFeed,
    initialFeed,
    loadFeed,
    onLoadError: useCallback(
      (error) => {
        if (isPermissionDeniedError(error)) return null;

        logDataError(`[Account] ${logLabel} could not be loaded:`, error);
        return errorMessage;
      },
      [errorMessage, logLabel],
    ),
  });
}

function updateReviewLikes(review, userId, isLiked) {
  const currentLikes = Array.isArray(review.likes) ? review.likes : [];
  const likes = isLiked
    ? Array.from(new Set([...currentLikes, userId]))
    : currentLikes.filter((likeUserId) => likeUserId !== userId);

  return { ...review, likes };
}

export function useAccountOverviewState(routeData = null) {
  const { initialActivityFeed = null, initialReviewFeed = null } = routeData || {};
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { openSurface } = useNavigationActions();
  const handledMissingAccountRef = useRef(false);
  const {
    routeData: resolvedRouteData,
    sectionProviderValue,
    sectionState,
  } = useAccountSectionEngine({
    activeTab: 'overview',
    auth,
    collectionPreviewLimits: COLLECTION_PREVIEW_LIMITS,
    routeData,
  });
  const { username = null, initialResolvedUserId = null } = resolvedRouteData;
  const {
    canViewPrivateContent,
    canViewProfileCollections,
    handleSignInRequest,
    isCurrentAccountMissing,
    isOwner,
    isPageLoading,
    isPrivateProfile,
    isViewerReady,
    itemRemoveConfirmation,
    profile,
    resolvedUserId,
  } = sectionState;
  const currentPath = useMemo(
    () => getCurrentPathWithSearch(pathname, searchParams),
    [pathname, searchParams],
  );
  const effectiveResolvedUserId = resolvedUserId || initialResolvedUserId || null;
  const profileHandle = profile?.username || username || null;
  const seededCurrentAccount = Boolean(!username && initialResolvedUserId);
  const shouldForcePrivateRefresh = !isOwner && isPrivateProfile === true && canViewPrivateContent;
  const canLoadPreviews =
    Boolean(isViewerReady && effectiveResolvedUserId && canViewProfileCollections) &&
    (Boolean(username) || auth.isAuthenticated);
  const hasSeededReviewFeed =
    !shouldForcePrivateRefresh &&
    hasMatchingSeededFeed({
      expectedValue: 'authored',
      initialFeed: initialReviewFeed,
      resolvedUserId: effectiveResolvedUserId,
    });
  const editableReviewUser = useMemo(() => {
    if (!isOwner || !auth.user?.id) return null;

    return { ...(profile || {}), ...(auth.user || {}), id: auth.user.id };
  }, [auth.user, isOwner, profile]);
  const [reviewDeleteConfirmation, setReviewDeleteConfirmation] = useState(null);

  useEffect(() => {
    if (username || !profileHandle) return;

    router.replace(`/account/${encodeURIComponent(profileHandle)}`);
  }, [profileHandle, router, username]);

  useEffect(() => {
    if (username || !isViewerReady || auth.isAuthenticated) return;

    router.replace(buildAuthHref(AUTH_ROUTES.SIGN_IN, { next: currentPath }));
  }, [auth.isAuthenticated, currentPath, isViewerReady, router, username]);

  useEffect(() => {
    if (!isCurrentAccountMissing || handledMissingAccountRef.current) return;

    handledMissingAccountRef.current = true;
    toast.error('Your account profile could not be initialized. Refresh the page and try again.', {
      dedupeKey: 'current-account-missing',
      duration: 6000,
    });
  }, [isCurrentAccountMissing, toast]);

  const reviewPreview = useOverviewPreviewFeed({
    canLoad: canLoadPreviews,
    errorMessage: 'Reviews could not be loaded right now.',
    hasSeededFeed: hasSeededReviewFeed,
    initialFeed: initialReviewFeed,
    loadFeed: useCallback(
      () =>
        fetchAccountReviewFeed({
          mode: 'authored',
          pageSize: PREVIEW_REVIEW_LIMIT,
          userId: effectiveResolvedUserId,
        }),
      [effectiveResolvedUserId],
    ),
    logLabel: 'Review previews',
  });
  const { setItems: setReviewItems } = reviewPreview;

  const handleEditReview = useCallback(
    (review) => {
      if (!editableReviewUser) return;

      openSurface(
        createReviewEditorSurfaceEntry({
          onSuccess: (updatedReview) => {
            setReviewItems((items) =>
              items.map((item) =>
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
    [editableReviewUser, openSurface, setReviewItems],
  );

  const handleDeleteReview = useCallback(
    (review) => {
      if (!auth.user?.id || !isOwner) return;

      const poster = review?.subjectPoster;
      setReviewDeleteConfirmation({
        confirmLoadingText: 'Deleting',
        confirmText: 'Delete',
        description: 'This review will be permanently removed from your profile.',
        icon: poster ? (poster.startsWith('/') ? `${TMDB_IMG}/w342${poster}` : poster) : undefined,
        isDestructive: true,
        onCancel: () => setReviewDeleteConfirmation(null),
        onConfirm: async () => {
          try {
            await deleteStoredReview({ review, userId: auth.user.id });
            setReviewItems((items) =>
              items.filter((item) => (item.docPath || item.id) !== (review.docPath || review.id)),
            );
            setReviewDeleteConfirmation(null);
          } catch (error) {
            toast.error(error?.message || 'Review could not be deleted');
            throw error;
          }
        },
        title: 'Delete Review?',
      });
    },
    [auth.user?.id, isOwner, setReviewItems, toast],
  );

  const handleLikeReview = useCallback(
    async (review) => {
      if (!auth.isAuthenticated || !auth.user?.id) {
        handleSignInRequest();
        return;
      }

      const reviewId = review.docPath || review.id;
      const currentUserId = auth.user.id;
      let previousItems = [];

      setReviewItems((items) => {
        previousItems = items;
        return items.map((item) => {
          if ((item.docPath || item.id) !== reviewId) {
            return item;
          }
          const currentLikes = Array.isArray(item.likes) ? item.likes : [];
          const currentlyLiked = currentLikes.includes(currentUserId);
          return updateReviewLikes(item, currentUserId, !currentlyLiked);
        });
      });

      try {
        await toggleStoredReviewLike({ review, userId: currentUserId });
      } catch (error) {
        setReviewItems(previousItems);
        toast.error(error?.message || 'Review could not be updated');
      }
    },
    [auth.isAuthenticated, auth.user?.id, handleSignInRequest, setReviewItems, toast],
  );

  const providerValue = useMemo(
    () => ({
      ...sectionProviderValue,
      isPageLoading:
        isPageLoading ||
        (!username && !seededCurrentAccount && (!isViewerReady || auth.status === 'loading')),
      itemRemoveConfirmation: reviewDeleteConfirmation || itemRemoveConfirmation,
      navDescription:
        !username && isViewerReady && !auth.isAuthenticated
          ? 'Sign in to see your account'
          : 'Profile Overview',
      profileHandle,
    }),
    [
      auth.isAuthenticated,
      auth.status,
      isPageLoading,
      isViewerReady,
      itemRemoveConfirmation,
      profileHandle,
      reviewDeleteConfirmation,
      sectionProviderValue,
      seededCurrentAccount,
      username,
    ],
  );

  return {
    isCurrentAccountMissing,
    overviewData: {
      authoredReviews: reviewPreview.items,
      authoredReviewsError: reviewPreview.feedError,
      authoredReviewsLoading: reviewPreview.isFeedLoading,
      handleDeleteReview,
      handleEditReview,
      handleLikeReview,
      hasMoreAuthoredReviews: reviewPreview.hasMore,
      initialActivityFeed,
    },
    providerValue,
  };
}
