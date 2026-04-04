'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  hasMatchingSeededFeed,
  shouldBlockAccountFeedLoad,
  useAccountSectionPage,
  useSeededFeedState,
} from '@/features/account/section-client-hooks';
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
import ReviewsView from './view';

export default function Client({
  initialCollections = null,
  initialProfile = null,
  initialResolvedUserId = null,
  initialResolveError = null,
  initialReviewFeed = null,
  username,
}) {
  const auth = useAuth();
  const { openModal } = useModal();
  const toast = useToast();
  const [watchedItems, setWatchedItems] = useState([]);
  const [reviewDeleteConfirmation, setReviewDeleteConfirmation] = useState(null);
  const {
    canViewProfileCollections,
    canViewPrivateContent,
    followerCount,
    followingCount,
    followState,
    handleEditProfile,
    handleFollow,
    handleOpenFollowList,
    handleSignInRequest,
    isBioSurfaceOpen,
    isFollowLoading,
    isOwner,
    isPageLoading,
    isPrivateProfile,
    isResolvingProfile,
    isViewerReady,
    itemRemoveConfirmation,
    likeCount,
    likes,
    listCount,
    pendingFollowRequestCount,
    profile,
    resolveError,
    resolvedUserId,
    setIsBioSurfaceOpen,
    unfollowConfirmation,
    watchlistCount,
  } = useAccountSectionPage({
    activeTab: 'reviews',
    auth,
    initialCollections,
    initialProfile,
    initialResolvedUserId,
    initialResolveError,
    username,
  });
  const shouldForcePrivateRefresh = !isOwner && isPrivateProfile === true && canViewPrivateContent;
  const {
    applyFeedResult,
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
  } = useSeededFeedState(initialReviewFeed);
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
        return;
      }

      if (!append && hasSeededReviewFeed) {
        setIsFeedLoading(false);
        return;
      }

      setIsFeedLoading(true);
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
        setIsFeedLoading(false);
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

      try {
        const nextLikedState = await toggleStoredReviewLike({
          review,
          userId: auth.user.id,
        });

        setReviews((current) =>
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
    [auth.isAuthenticated, auth.user?.id, handleSignInRequest, setReviews, toast]
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
    <ReviewsView
      auth={auth}
      canShowReviews={canViewProfileCollections}
      feedError={feedError}
      followerCount={followerCount}
      followingCount={followingCount}
      followState={followState}
      handleEditProfile={handleEditProfile}
      handleEditReview={handleEditReview}
      handleFollow={handleFollow}
      handleDeleteReview={handleDeleteReview}
      handleLike={handleLike}
      handleOpenFollowList={handleOpenFollowList}
      handleSignInRequest={handleSignInRequest}
      hasMore={hasMore}
      isBioSurfaceOpen={isBioSurfaceOpen}
      isFeedLoading={isFeedLoading}
      isFollowLoading={isFollowLoading}
      isOwner={isOwner}
      isPageLoading={isPageLoading}
      isResolvingProfile={isResolvingProfile}
      itemRemoveConfirmation={reviewDeleteConfirmation || itemRemoveConfirmation}
      likeCount={likeCount}
      likes={likes}
      listCount={listCount}
      loadReviews={loadReviews}
      pendingFollowRequestCount={pendingFollowRequestCount}
      profile={profile}
      resolveError={resolveError}
      resolvedUserId={resolvedUserId}
      reviews={reviews}
      setIsBioSurfaceOpen={setIsBioSurfaceOpen}
      unfollowConfirmation={unfollowConfirmation}
      username={username}
      watchedItems={watchedItems}
      watchlistCount={watchlistCount}
    />
  );
}
