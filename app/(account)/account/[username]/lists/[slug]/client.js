'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAccountSectionPage } from '@/features/account/hooks/section-page';
import { isPermissionDeniedError } from '@/core/utils/errors';
import { getRatingStats } from '@/features/reviews/utils';
import { useAccountProfile } from '@/core/modules/account';
import { useAuth } from '@/core/modules/auth';
import { useModal } from '@/core/modules/modal/context';
import { useToast } from '@/core/modules/notification/hooks';
import {
  buildPollingSubscriptionKey,
  primePollingSubscription,
} from '@/core/services/shared/polling-subscription.service';
import {
  subscribeToUserListBySlug,
  subscribeToUserListItems,
  toggleListLike,
} from '@/core/services/media/lists.service';
import {
  deleteListReview,
  subscribeToListReviews,
  toggleStoredReviewLike,
} from '@/core/services/media/reviews.service';
import ListView from './view';

export default function Client({
  initialCollections = null,
  initialList = null,
  initialListItems = [],
  initialListReviews = [],
  initialProfile = null,
  initialResolvedUserId = null,
  initialResolveError = null,
  slug,
  username,
}) {
  const auth = useAuth();
  const { openModal } = useModal();
  const toast = useToast();
  const [list, setList] = useState(initialList);
  const [listItems, setListItems] = useState(Array.isArray(initialListItems) ? initialListItems : []);
  const [reviews, setReviews] = useState(Array.isArray(initialListReviews) ? initialListReviews : []);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [reviewDeleteConfirmation, setReviewDeleteConfirmation] = useState(null);
  const { profile: userProfile } = useAccountProfile({
    resolvedUserId: auth.user?.id || null,
  });

  const {
    canViewProfileCollections,
    canViewPrivateContent,
    followerCount,
    followingCount,
    followState,
    handleDeleteList,
    handleEditList,
    handleEditProfile,
    handleFollow,
    handleOpenFollowList,
    handleRequestRemoveListItem,
    handleSignInRequest,
    isBioSurfaceOpen,
    isFollowLoading,
    isOwner,
    isPageLoading,
    isPrivateProfile,
    isResolvingProfile,
    itemRemoveConfirmation,
    likeCount,
    listCount,
    listDeleteConfirmation,
    pendingFollowRequestCount,
    profile,
    resolveError,
    resolvedUserId,
    setIsBioSurfaceOpen,
    unfollowConfirmation,
    watchlistCount,
  } = useAccountSectionPage({
    activeListId: list?.id || '',
    activeTab: 'lists',
    auth,
    initialCollections,
    initialProfile,
    initialResolvedUserId,
    initialResolveError,
    selectedList: list,
    username,
  });
  const hasSeededList = Boolean(initialList?.id) && initialList.slug === slug;
  const hasSeededListItems = hasSeededList && Array.isArray(initialListItems);
  const hasSeededListReviews = hasSeededList && Array.isArray(initialListReviews);

  useEffect(() => {
    setList(hasSeededList ? initialList : null);
  }, [hasSeededList, initialList]);

  useEffect(() => {
    setListItems(hasSeededListItems ? initialListItems : []);
  }, [hasSeededListItems, initialListItems]);

  useEffect(() => {
    setReviews(hasSeededListReviews ? initialListReviews : []);
  }, [hasSeededListReviews, initialListReviews]);

  useEffect(() => {
    if (!resolvedUserId || !hasSeededList) {
      return;
    }

    primePollingSubscription(
      buildPollingSubscriptionKey('lists:slug', {
        hiddenIntervalMs: null,
        intervalMs: null,
        slug,
        userId: resolvedUserId,
      }),
      initialList,
      { emit: false }
    );
  }, [hasSeededList, initialList, resolvedUserId, slug]);

  useEffect(() => {
    if (!resolvedUserId || !initialList?.id || !hasSeededListItems) {
      return;
    }

    primePollingSubscription(
      buildPollingSubscriptionKey('lists:items', {
        hiddenIntervalMs: null,
        intervalMs: null,
        listId: initialList.id,
        userId: resolvedUserId,
      }),
      initialListItems,
      { emit: false }
    );
  }, [hasSeededListItems, initialList?.id, initialListItems, resolvedUserId]);

  useEffect(() => {
    if (!resolvedUserId || !initialList?.id || !hasSeededListReviews) {
      return;
    }

    primePollingSubscription(
      buildPollingSubscriptionKey('reviews:list', {
        listId: initialList.id,
        ownerId: resolvedUserId,
      }),
      initialListReviews,
      { emit: false }
    );
  }, [hasSeededListReviews, initialList?.id, initialListReviews, resolvedUserId]);

  useEffect(() => {
    if (!resolvedUserId || !canViewProfileCollections) {
      setList(null);
      return undefined;
    }

    return subscribeToUserListBySlug(
      resolvedUserId,
      slug,
      (nextList) => {
        setList(nextList);
      },
      {
        fetchOnSubscribe: !hasSeededList,
        onError: (error) => {
          if (!hasSeededList) {
            setList(null);
          }

          if (!isPermissionDeniedError(error)) {
            toast.error(error?.message || 'List could not be loaded');
          }
        },
      }
    );
  }, [canViewProfileCollections, hasSeededList, resolvedUserId, slug, toast]);

  useEffect(() => {
    if (!resolvedUserId || !list?.id || !canViewProfileCollections) {
      setListItems([]);
      return undefined;
    }

    return subscribeToUserListItems(resolvedUserId, list.id, setListItems, {
      fetchOnSubscribe: !hasSeededListItems,
      onError: (error) => {
        if (!hasSeededListItems) {
          setListItems([]);
        }

        if (!isPermissionDeniedError(error)) {
          toast.error(error?.message || 'List items could not be loaded');
        }
      },
    });
  }, [canViewProfileCollections, hasSeededListItems, list?.id, resolvedUserId, toast]);

  useEffect(() => {
    if (!resolvedUserId || !list?.id || !canViewProfileCollections) {
      setReviews([]);
      return undefined;
    }

    return subscribeToListReviews({ list, ownerId: resolvedUserId, listId: list.id }, setReviews, {
      fetchOnSubscribe: !hasSeededListReviews,
      liveUserId: auth.user?.id || null,
      onError: (error) => {
        if (!hasSeededListReviews) {
          setReviews([]);
        }

        if (!isPermissionDeniedError(error)) {
          toast.error(error?.message || 'List reviews could not be loaded');
        }
      },
    });
  }, [auth.user?.id, canViewProfileCollections, hasSeededListReviews, list, resolvedUserId, toast]);

  const ownReview = useMemo(() => {
    if (!auth.user?.id) {
      return null;
    }

    return reviews.find((review) => review.user?.id === auth.user.id) || null;
  }, [auth.user?.id, reviews]);

  const handleToggleLike = useCallback(async () => {
    if (!auth.isAuthenticated || !auth.user?.id || !list?.id || !resolvedUserId) {
      handleSignInRequest();
      return;
    }

    const currentUserId = auth.user.id;
    setIsLikeLoading(true);

    try {
      const isNowLiked = await toggleListLike({
        listId: list.id,
        ownerId: resolvedUserId,
        userId: currentUserId,
      });

      setList((current) => {
        if (!current) {
          return current;
        }

        const currentLikes = Array.isArray(current.likes) ? current.likes : [];
        const hasLike = currentLikes.includes(currentUserId);
        const nextLikes = isNowLiked
          ? Array.from(new Set([...currentLikes, currentUserId]))
          : currentLikes.filter((likedUserId) => likedUserId !== currentUserId);
        const baseLikesCount = Number.isFinite(Number(current.likesCount))
          ? Number(current.likesCount)
          : currentLikes.length;
        const nextLikesCount = isNowLiked
          ? hasLike
            ? baseLikesCount
            : baseLikesCount + 1
          : hasLike
            ? Math.max(0, baseLikesCount - 1)
            : baseLikesCount;

        return {
          ...current,
          likes: nextLikes,
          likesCount: nextLikesCount,
        };
      });
    } catch (error) {
      toast.error(error?.message || 'List could not be updated');
    } finally {
      setIsLikeLoading(false);
    }
  }, [auth.isAuthenticated, auth.user?.id, handleSignInRequest, list?.id, resolvedUserId, toast]);

  const buildReviewModalUser = useCallback(
    (review = null) => {
      if (!auth.user?.id) {
        return null;
      }

      return {
        ...(review?.user || {}),
        ...(userProfile || {}),
        id: auth.user.id,
      };
    },
    [auth.user?.id, userProfile]
  );

  const openReviewEditorModal = useCallback(
    (review = null) => {
      if (!auth.isAuthenticated || !auth.user?.id) {
        handleSignInRequest();
        return;
      }

      if (!list?.id || !resolvedUserId) {
        return;
      }

      const targetReview = review || ownReview || null;
      const reviewIdentity = targetReview?.docPath || targetReview?.id || null;
      const ownerUsername = list?.ownerSnapshot?.username || profile?.username || username || resolvedUserId;

      openModal('REVIEW_EDITOR_MODAL', 'center', {
        data: {
          list: {
            coverUrl: list?.poster_path || list?.posterPath || list?.coverUrl || listItems?.[0]?.poster_path || null,
            id: list.id,
            ownerId: resolvedUserId,
            ownerSnapshot: {
              id: resolvedUserId,
              username: ownerUsername,
            },
            previewItems: Array.isArray(list?.previewItems) ? list.previewItems : [],
            slug: list.slug || list.id,
            title: list.title || 'Untitled List',
          },
          listId: list.id,
          onSuccess: reviewIdentity
            ? (updatedReview) => {
                setReviews((current) =>
                  current.map((item) =>
                    (item.docPath || item.id) === reviewIdentity ? { ...item, ...updatedReview } : item
                  )
                );
              }
            : null,
          ownerId: resolvedUserId,
          review: targetReview,
          user: buildReviewModalUser(targetReview),
        },
      });
    },
    [
      auth.isAuthenticated,
      auth.user?.id,
      buildReviewModalUser,
      handleSignInRequest,
      list,
      listItems,
      openModal,
      ownReview,
      profile?.username,
      resolvedUserId,
      username,
    ]
  );

  const handleOpenReviewComposer = useCallback(() => {
    openReviewEditorModal();
  }, [openReviewEditorModal]);

  const handleDeleteReview = useCallback(
    async (review = null) => {
      const targetReview = review || ownReview;

      if (!targetReview || !resolvedUserId || !list?.id || !auth.user?.id) {
        return;
      }

      try {
        await deleteListReview({
          listId: list.id,
          ownerId: resolvedUserId,
          userId: auth.user.id,
        });

        const targetReviewId = targetReview.docPath || targetReview.id || null;

        setReviews((current) =>
          current.filter((item) => {
            if (targetReviewId) {
              return (item.docPath || item.id) !== targetReviewId;
            }

            return item?.user?.id !== auth.user.id;
          })
        );
        toast.success('Your review was deleted');
      } catch (error) {
        toast.error(error?.message || 'Review could not be deleted');
        throw error;
      }
    },
    [auth.user?.id, list?.id, ownReview, resolvedUserId, toast]
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
    [auth.isAuthenticated, auth.user?.id, handleSignInRequest, toast]
  );

  const handleDeleteRequest = useCallback(
    (review) => {
      const targetReview = review || ownReview;

      if (!targetReview || !auth.user?.id) {
        return;
      }

      if (targetReview?.user?.id && targetReview.user.id !== auth.user.id) {
        return;
      }

      setReviewDeleteConfirmation({
        title: 'Delete Review?',
        description: 'This review will be permanently removed from this list.',
        confirmText: 'Delete',
        confirmLoadingText: 'Deleting',
        isDestructive: true,
        onCancel: () => setReviewDeleteConfirmation(null),
        onConfirm: async () => {
          await handleDeleteReview(targetReview);
          setReviewDeleteConfirmation(null);
        },
      });
    },
    [auth.user?.id, handleDeleteReview, ownReview]
  );

  const handleEditReview = useCallback(
    (review) => {
      openReviewEditorModal(review);
    },
    [openReviewEditorModal]
  );

  const isLiked = auth.user?.id ? list?.likes?.includes(auth.user.id) : false;
  const requiresFollowForProfileInteractions = !isOwner && isPrivateProfile && !canViewPrivateContent;
  const ratingStats = getRatingStats(reviews);

  return (
    <ListView
      auth={auth}
      canShowList={canViewProfileCollections}
      requiresFollowForProfileInteractions={requiresFollowForProfileInteractions}
      followerCount={followerCount}
      followingCount={followingCount}
      followState={followState}
      handleDeleteList={handleDeleteList}
      handleDeleteRequest={handleDeleteRequest}
      handleEditList={handleEditList}
      handleEditProfile={handleEditProfile}
      handleFollow={handleFollow}
      handleLikeReview={handleLikeReview}
      handleOpenFollowList={handleOpenFollowList}
      handleRemoveListItem={handleRequestRemoveListItem}
      handleSignInRequest={handleSignInRequest}
      handleOpenReviewComposer={handleOpenReviewComposer}
      handleToggleLike={handleToggleLike}
      isBioSurfaceOpen={isBioSurfaceOpen}
      isFollowLoading={isFollowLoading}
      isLiked={isLiked}
      isLikeLoading={isLikeLoading}
      isOwner={isOwner}
      isPageLoading={isPageLoading}
      isResolvingProfile={isResolvingProfile}
      itemRemoveConfirmation={reviewDeleteConfirmation || itemRemoveConfirmation}
      likeCount={likeCount}
      list={list}
      listDeleteConfirmation={listDeleteConfirmation}
      listCount={listCount}
      listItems={listItems}
      ownReview={ownReview}
      pendingFollowRequestCount={pendingFollowRequestCount}
      profile={profile}
      ratingStats={ratingStats}
      resolveError={resolveError}
      resolvedUserId={resolvedUserId}
      reviews={reviews}
      handleEditReview={handleEditReview}
      setIsBioSurfaceOpen={setIsBioSurfaceOpen}
      unfollowConfirmation={unfollowConfirmation}
      username={username}
      userProfile={userProfile}
      watchlistCount={watchlistCount}
    />
  );
}
