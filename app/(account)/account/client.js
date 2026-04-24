'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { AUTH_ROUTES } from '@/features/auth/constants';
import { buildAuthHref, getCurrentPathWithSearch } from '@/features/auth/utils';
import { hasMatchingSeededFeed, useDeferredPreviewFeed } from '@/features/account/hooks/section-page';
import { isPermissionDeniedError, logDataError } from '@/core/utils';
import { useAuth } from '@/core/modules/auth';
import { useModal } from '@/core/modules/modal/context';
import { useToast } from '@/core/modules/notification/hooks';
import {
  deleteStoredReview,
  fetchProfileReviewFeed,
  toggleStoredReviewLike,
} from '@/core/services/media/reviews.service';
import { AccountSectionStateProvider, useAccountSectionEngine } from './shared/section-state';
import AccountView from './view';

const PREVIEW_MEDIA_LIMIT = 12;
const PREVIEW_REVIEW_LIMIT = 3;
const PREVIEW_LIST_LIMIT = 3;
const COLLECTION_PREVIEW_LIMITS = Object.freeze({
  likes: 1,
  lists: PREVIEW_LIST_LIMIT,
  watched: PREVIEW_MEDIA_LIMIT,
  watchlist: PREVIEW_MEDIA_LIMIT,
});

function useAccountOverviewPreviewFeed({
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
        if (isPermissionDeniedError(error)) {
          return null;
        }

        logDataError(`[Account] ${logLabel} could not be loaded:`, error);
        return errorMessage;
      },
      [errorMessage, logLabel]
    ),
  });
}

export default function Client({ routeData = null, RegistryComponent = undefined }) {
  const { initialActivityFeed = null, initialReviewFeed = null } = routeData || {};
  const auth = useAuth();
  const { openModal } = useModal();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();
  const {
    routeData: resolvedRouteData,
    sectionProviderValue,
    sectionState,
  } = useAccountSectionEngine({
    activeTab: 'likes',
    auth,
    collectionPreviewLimits: COLLECTION_PREVIEW_LIMITS,
    routeData,
  });
  const { username = null, initialResolvedUserId = null } = resolvedRouteData;
  const seededCurrentAccount = Boolean(!username && initialResolvedUserId);
  const currentPath = useMemo(() => getCurrentPathWithSearch(pathname, searchParams), [pathname, searchParams]);

  const {
    canViewPrivateContent,
    canViewProfileCollections,
    handleSignInRequest,
    isOwner,
    isPageLoading,
    isPrivateProfile,
    isViewerReady,
    profile,
    resolvedUserId,
    itemRemoveConfirmation,
  } = sectionState;
  const effectiveResolvedUserId = resolvedUserId || initialResolvedUserId || null;
  const shouldForcePrivateRefresh = !isOwner && isPrivateProfile === true && canViewPrivateContent;
  const profileHandle = profile?.username || username || null;
  const canLoadPreviews =
    Boolean(isViewerReady && effectiveResolvedUserId && canViewProfileCollections) &&
    (Boolean(username) || auth.isAuthenticated);
  const hasSeededReviewFeedForUser =
    !shouldForcePrivateRefresh &&
    hasMatchingSeededFeed({
      expectedValue: 'authored',
      initialFeed: initialReviewFeed,
      resolvedUserId: effectiveResolvedUserId,
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

  const reviewPreview = useAccountOverviewPreviewFeed({
    canLoad: canLoadPreviews,
    errorMessage: 'Reviews could not be loaded right now.',
    hasSeededFeed: hasSeededReviewFeedForUser,
    initialFeed: initialReviewFeed,
    loadFeed: useCallback(
      () =>
        fetchProfileReviewFeed({
          mode: 'authored',
          pageSize: PREVIEW_REVIEW_LIMIT,
          userId: effectiveResolvedUserId,
        }),
      [effectiveResolvedUserId]
    ),
    logLabel: 'Review previews',
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

  const overviewData = {
    authoredReviews: reviewPreview.items,
    authoredReviewsError: reviewPreview.feedError,
    authoredReviewsLoading: reviewPreview.isFeedLoading,
    initialActivityFeed,
    handleEditReview,
    handleDeleteReview,
    handleLikeReview,
    hasMoreAuthoredReviews: reviewPreview.hasMore,
  };

  return (
    <AccountSectionStateProvider
      value={{
        ...sectionProviderValue,
        isPageLoading: resolvedIsPageLoading,
        itemRemoveConfirmation: reviewDeleteConfirmation || itemRemoveConfirmation,
        navDescription,
        profileHandle,
      }}
    >
      <AccountView overviewData={overviewData} RegistryComponent={RegistryComponent} />
    </AccountSectionStateProvider>
  );
}
