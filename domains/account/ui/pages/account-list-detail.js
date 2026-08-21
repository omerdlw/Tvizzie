'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { mergeCollectionItemsWithExistingMetadata } from '@/domains/account/hooks/collections';
import { useAccountProfile } from '@/modules/account';
import { useAuth } from '@/modules/auth';
import { useToast } from '@/modules/notification';
import {
  buildPollingSubscriptionKey,
  primePollingSubscription,
} from '@/infrastructure/realtime/polling-subscription-service';
import { getMediaTitle, removeAccountCollectionItem } from '@/domains/account/utils/formatting';
import {
  subscribeToUserListBySlug,
  subscribeToUserListItems,
  toggleListLike,
} from '@/domains/account/client/lists';
import { deleteListReview, toggleStoredReviewLike } from '@/domains/reviews/client/mutations';
import { subscribeToListReviews } from '@/domains/reviews/client/subscriptions';
import { TMDB_IMG } from '@/shared/constants';
import { useNavigationActions } from '@/modules/nav';
import { createListEditorSurfaceEntry } from '@/domains/shell/navigation/surfaces/list-editor-surface';
import { createReviewEditorSurfaceEntry } from '@/domains/shell/navigation/surfaces/review-editor-surface';
import {
  AccountSectionStateProvider,
  useAccountSectionEngine,
} from '@/domains/account/hooks/account-section-state';
// ListView is defined in this route client.
import AccountListDetailFeed from '@/domains/account/ui/sections/lists/list-detail';
import { createAccountSectionRegistry } from '@/domains/account/ui/sections/account-section-factory';

export default function AccountListDetailView({ routeData = null }) {
  const {
    initialList = null,
    initialListFeed = null,
    initialListItems: rawInitialListItems = null,
    initialListReviews: rawInitialListReviews = null,
    slug,
  } = routeData || {};

  const initialListItems = useMemo(
    () =>
      Array.isArray(rawInitialListItems)
        ? rawInitialListItems
        : Array.isArray(initialListFeed?.items)
          ? initialListFeed.items
          : [],
    [rawInitialListItems, initialListFeed],
  );

  const initialListReviews = useMemo(
    () =>
      Array.isArray(rawInitialListReviews)
        ? rawInitialListReviews
        : Array.isArray(initialListFeed?.reviews)
          ? initialListFeed.reviews
          : [],
    [rawInitialListReviews, initialListFeed],
  );

  const auth = useAuth();
  const toast = useToast();
  const { openSurface } = useNavigationActions();
  const hasSeededList = Boolean(initialList?.id);
  const hasSeededListItems =
    hasSeededList && Array.isArray(initialListItems) && initialListItems.length > 0;
  const hasSeededListReviews =
    hasSeededList && Array.isArray(initialListReviews) && initialListReviews.length > 0;

  const [list, setList] = useState(initialList);
  const [listItems, setListItems] = useState(initialListItems);
  const [reviews, setReviews] = useState(initialListReviews);
  const [isListLoading, setIsListLoading] = useState(!hasSeededList);
  const [isListItemsLoading, setIsListItemsLoading] = useState(!hasSeededListItems);
  const [isReviewsLoading, setIsReviewsLoading] = useState(!hasSeededListReviews);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [listItemRemoveConfirmation, setListItemRemoveConfirmation] = useState(null);
  const [reviewDeleteConfirmation, setReviewDeleteConfirmation] = useState(null);
  const { profile: userProfile } = useAccountProfile({
    resolvedUserId: auth.user?.id || null,
  });

  const {
    routeData: resolvedRouteData,
    sectionProviderValue,
    sectionState,
  } = useAccountSectionEngine({
    activeListId: list?.id || '',
    activeTab: 'lists',
    auth,
    routeData,
    selectedList: list,
  });
  const {
    canViewProfileCollections,
    canViewPrivateContent,
    handleDeleteList,
    handleRemoveListItem,
    handleSignInRequest,
    isOwner,
    isPrivateProfile,
    itemRemoveConfirmation,
    likes,
    listDeleteConfirmation,
    profile,
    resolvedUserId,
    watched,
    watchlist,
  } = sectionState;

  const listId = initialList?.id || list?.id || null;

  useEffect(() => {
    if (hasSeededList && initialList) {
      setList(initialList);
      setIsListLoading(false);
    }
  }, [hasSeededList, slug, listId]);

  useEffect(() => {
    if (hasSeededListItems) {
      setListItems(initialListItems);
      setIsListItemsLoading(false);
    }
  }, [hasSeededListItems, slug, listId]);

  useEffect(() => {
    if (hasSeededListReviews) {
      setReviews(initialListReviews);
      setIsReviewsLoading(false);
    }
  }, [hasSeededListReviews, slug, listId]);

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
      { emit: false },
    );
  }, [hasSeededList, resolvedUserId, slug]);

  useEffect(() => {
    if (!resolvedUserId || !listId || !hasSeededListItems) {
      return;
    }

    primePollingSubscription(
      buildPollingSubscriptionKey('lists:items', {
        hiddenIntervalMs: null,
        intervalMs: null,
        listId,
        userId: resolvedUserId,
      }),
      initialListItems,
      { emit: false },
    );
  }, [hasSeededListItems, listId, resolvedUserId]);

  useEffect(() => {
    if (!resolvedUserId || !listId || !hasSeededListReviews) {
      return;
    }

    primePollingSubscription(
      buildPollingSubscriptionKey('reviews:list', {
        listId,
        ownerId: resolvedUserId,
      }),
      initialListReviews,
      { emit: false },
    );
  }, [hasSeededListReviews, listId, resolvedUserId]);

  useEffect(() => {
    if (!resolvedUserId || !canViewProfileCollections) {
      setIsListLoading(false);
      return undefined;
    }

    if (!hasSeededList) {
      setIsListLoading(true);
    }

    return subscribeToUserListBySlug(
      resolvedUserId,
      slug,
      (nextList) => {
        if (nextList) setList(nextList);
        setIsListLoading(false);
      },
      {
        fetchOnSubscribe: !hasSeededList,
        onError: () => {
          if (!hasSeededList) {
            setList(null);
          }
          setIsListLoading(false);
        },
      },
    );
  }, [canViewProfileCollections, hasSeededList, resolvedUserId, slug]);

  useEffect(() => {
    if (!resolvedUserId || !list?.id || !canViewProfileCollections) {
      if (!list?.id) {
        setIsListItemsLoading(false);
      }
      return undefined;
    }

    if (!hasSeededListItems) {
      setIsListItemsLoading(true);
    }

    return subscribeToUserListItems(
      resolvedUserId,
      list.id,
      (nextItems) => {
        setListItems((current) => mergeCollectionItemsWithExistingMetadata(current, nextItems));
        setIsListItemsLoading(false);
      },
      {
        fetchOnSubscribe: !hasSeededListItems,
        onError: () => {
          if (!hasSeededListItems) {
            setListItems([]);
          }
          setIsListItemsLoading(false);
        },
      },
    );
  }, [canViewProfileCollections, hasSeededListItems, list?.id, resolvedUserId]);

  useEffect(() => {
    if (!resolvedUserId || !list?.id || !canViewProfileCollections) {
      if (!list?.id) {
        setIsReviewsLoading(false);
      }
      return undefined;
    }

    if (!hasSeededListReviews) {
      setIsReviewsLoading(true);
    }

    return subscribeToListReviews(
      { list, ownerId: resolvedUserId, listId: list.id },
      (nextReviews) => {
        setReviews(nextReviews);
        setIsReviewsLoading(false);
      },
      {
        fetchOnSubscribe: !hasSeededListReviews,
        liveUserId: auth.user?.id || null,
        onError: () => {
          if (!hasSeededListReviews) {
            setReviews([]);
          }
          setIsReviewsLoading(false);
        },
      },
    );
  }, [auth.user?.id, canViewProfileCollections, hasSeededListReviews, list, resolvedUserId]);

  const ownReview = useMemo(() => {
    if (!auth.user?.id) {
      return null;
    }

    return reviews.find((review) => review.user?.id === auth.user.id) || null;
  }, [auth.user?.id, reviews]);

  const handleToggleLike = useCallback(async () => {
    if (!auth.isAuthenticated || !auth.user?.id) {
      handleSignInRequest();
      return;
    }
    if (!list?.id || !resolvedUserId) {
      return;
    }

    const currentUserId = auth.user.id;
    const previousList = list;
    const currentLikes = Array.isArray(list.likes) ? list.likes : [];
    const currentlyLiked = currentLikes.includes(currentUserId);
    const optimisticIsLiked = !currentlyLiked;

    setList((current) => {
      if (!current) return current;
      const likesList = Array.isArray(current.likes) ? current.likes : [];
      const nextLikes = optimisticIsLiked
        ? Array.from(new Set([...likesList, currentUserId]))
        : likesList.filter((likedUserId) => likedUserId !== currentUserId);
      const baseLikesCount = Number.isFinite(Number(current.likesCount))
        ? Number(current.likesCount)
        : likesList.length;
      const nextLikesCount = optimisticIsLiked
        ? currentlyLiked
          ? baseLikesCount
          : baseLikesCount + 1
        : currentlyLiked
          ? Math.max(0, baseLikesCount - 1)
          : baseLikesCount;

      return {
        ...current,
        likes: nextLikes,
        likesCount: nextLikesCount,
      };
    });

    setIsLikeLoading(true);

    try {
      await toggleListLike({
        listId: list.id,
        ownerId: resolvedUserId,
        userId: currentUserId,
      });
    } catch (error) {
      setList(previousList);
      toast.error(error?.message || 'List could not be updated');
    } finally {
      setIsLikeLoading(false);
    }
  }, [auth.isAuthenticated, auth.user?.id, handleSignInRequest, list, resolvedUserId, toast]);

  const primeListItemsCache = useCallback(
    (nextItems) => {
      if (!resolvedUserId || !list?.id) {
        return;
      }

      primePollingSubscription(
        buildPollingSubscriptionKey('lists:items', {
          hiddenIntervalMs: null,
          intervalMs: null,
          listId: list.id,
          userId: resolvedUserId,
        }),
        nextItems,
        { emit: false },
      );
    },
    [list?.id, resolvedUserId],
  );

  const handleConfirmRemoveListItem = useCallback(
    async (item) => {
      if (!isOwner || !list?.id || !auth.user?.id) {
        return;
      }

      let previousListItems = null;
      let nextListItems = null;

      setListItems((currentItems) => {
        previousListItems = currentItems;
        nextListItems = removeAccountCollectionItem(currentItems, item);
        return nextListItems;
      });

      try {
        await handleRemoveListItem(item);
        setListItemRemoveConfirmation(null);

        if (nextListItems) {
          primeListItemsCache(nextListItems);
        }
      } catch (error) {
        if (previousListItems) {
          setListItems(previousListItems);
          primeListItemsCache(previousListItems);
        }

        throw error;
      }
    },
    [auth.user?.id, handleRemoveListItem, isOwner, list?.id, primeListItemsCache],
  );

  const handleEditListWithItems = useCallback(
    (targetList = list) => {
      const resolvedList = targetList || list;
      const effectiveUserId = auth.user?.id || resolvedUserId;
      if (!resolvedList?.id || !effectiveUserId) return;

      openSurface(
        createListEditorSurfaceEntry({
          isOwner: true,
          userId: effectiveUserId,
          initialData: resolvedList,
          initialItems: listItems,
          onItemsChange: (nextItems) => {
            setListItems(nextItems);
            primeListItemsCache(nextItems);
          },
          onSuccess: (updatedList) => {
            setList((current) =>
              current?.id === updatedList?.id ? { ...current, ...updatedList } : updatedList,
            );
          },
        }),
      );
    },
    [auth.user?.id, list, listItems, openSurface, primeListItemsCache, resolvedUserId],
  );

  const handleRequestRemoveListItem = useCallback(
    (item) => {
      if (!isOwner) return;

      setListItemRemoveConfirmation({
        title: 'Remove List Item?',
        description: `${getMediaTitle(item)} will be removed from this list.`,
        confirmText: 'Remove',
        confirmLoadingText: 'Removing',
        isDestructive: true,
        onCancel: () => setListItemRemoveConfirmation(null),
        onConfirm: () => handleConfirmRemoveListItem(item),
      });
    },
    [handleConfirmRemoveListItem, isOwner],
  );

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
    [auth.user?.id, userProfile],
  );

  const openReviewModal = useCallback(
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
      const ownerUsername =
        list?.ownerSnapshot?.username ||
        profile?.username ||
        resolvedRouteData.username ||
        resolvedUserId;

      const previewItems =
        Array.isArray(list?.previewItems) && list.previewItems.length > 0
          ? list.previewItems.filter(Boolean)
          : Array.isArray(listItems) && listItems.length > 0
            ? listItems.slice(0, 5).filter(Boolean)
            : [];

      const coverUrl =
        list?.poster_path ||
        list?.posterPath ||
        list?.coverUrl ||
        previewItems[0]?.poster_path_full ||
        (previewItems[0]?.poster_path ? `${TMDB_IMG}/w342${previewItems[0].poster_path}` : null) ||
        null;

      openSurface(
        createReviewEditorSurfaceEntry({
          list: {
            coverUrl,
            id: list.id,
            ownerId: resolvedUserId,
            ownerSnapshot: {
              id: resolvedUserId,
              username: ownerUsername,
            },
            previewItems,
            slug: list.slug || list.id,
            title: list.title || 'Untitled List',
          },
          listId: list.id,
          onSuccess: (updatedReview) => {
            if (!updatedReview) return;
            setReviews((current) => {
              const reviewKey = updatedReview.docPath || updatedReview.id || reviewIdentity;
              const existingIndex = current.findIndex(
                (item) => (item.docPath || item.id) === reviewKey,
              );
              const mergedReview = {
                ...updatedReview,
                subjectPreviewItems:
                  Array.isArray(updatedReview.subjectPreviewItems) &&
                  updatedReview.subjectPreviewItems.length > 0
                    ? updatedReview.subjectPreviewItems
                    : (existingIndex >= 0 ? current[existingIndex].subjectPreviewItems : null) ||
                      previewItems,
                subjectPoster:
                  updatedReview.subjectPoster ||
                  (existingIndex >= 0 ? current[existingIndex].subjectPoster : null) ||
                  coverUrl,
              };

              if (existingIndex >= 0) {
                const nextList = [...current];
                nextList[existingIndex] = {
                  ...nextList[existingIndex],
                  ...mergedReview,
                };
                return nextList;
              }
              return [mergedReview, ...current];
            });
          },
          ownerId: resolvedUserId,
          review: targetReview,
          user: buildReviewModalUser(targetReview),
        }),
      );
    },
    [
      auth.isAuthenticated,
      auth.user?.id,
      buildReviewModalUser,
      handleSignInRequest,
      list,
      listItems,
      openSurface,
      ownReview,
      profile?.username,
      resolvedRouteData.username,
      resolvedUserId,
    ],
  );

  const handleOpenReviewComposer = useCallback(() => {
    openReviewModal();
  }, [openReviewModal]);

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
          }),
        );
      } catch (error) {
        toast.error(error?.message || 'Review could not be deleted');
        throw error;
      }
    },
    [auth.user?.id, list?.id, ownReview, resolvedUserId, toast],
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
          }),
        );
      } catch (error) {
        toast.error(error?.message || 'Review could not be updated');
      }
    },
    [auth.isAuthenticated, auth.user?.id, handleSignInRequest, toast],
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

      const previewItems =
        Array.isArray(list?.previewItems) && list.previewItems.length > 0
          ? list.previewItems.filter(Boolean)
          : Array.isArray(listItems) && listItems.length > 0
            ? listItems.slice(0, 5).filter(Boolean)
            : [];

      const firstItem = targetReview?.subjectPreviewItems?.[0] || previewItems[0];
      const poster =
        firstItem?.poster_path ||
        firstItem?.posterPath ||
        firstItem?.poster_path_full ||
        targetReview?.subjectPoster ||
        list?.poster_path ||
        list?.posterPath ||
        list?.coverUrl;

      setReviewDeleteConfirmation({
        title: 'Delete Comment?',
        description: 'This comment will be permanently removed.',
        confirmText: 'Delete',
        confirmLoadingText: 'Deleting',
        isDestructive: true,
        icon: poster ? (poster.startsWith('/') ? `${TMDB_IMG}/w342${poster}` : poster) : undefined,
        onCancel: () => setReviewDeleteConfirmation(null),
        onConfirm: async () => {
          await handleDeleteReview(targetReview);
          setReviewDeleteConfirmation(null);
        },
      });
    },
    [auth.user?.id, handleDeleteReview, ownReview, list, listItems],
  );

  const handleEditReview = useCallback(
    (review) => {
      openReviewModal(review);
    },
    [openReviewModal],
  );

  const isLiked = auth.user?.id ? list?.likes?.includes(auth.user.id) : false;
  const requiresFollowForProfileInteractions =
    !isOwner && isPrivateProfile && !canViewPrivateContent;

  const listDetailModel = {
    auth,
    canShowList: canViewProfileCollections,
    requiresFollowForProfileInteractions,
    ...sectionState,
    handleDeleteList,
    handleDeleteRequest,
    handleEditList: handleEditListWithItems,
    handleLikeReview,
    handleRemoveListItem: handleRequestRemoveListItem,
    handleSignInRequest,
    handleOpenReviewComposer,
    handleToggleLike,
    isLiked,
    isLikeLoading,
    isListLoading,
    isListItemsLoading,
    isReviewsLoading,
    itemRemoveConfirmation:
      reviewDeleteConfirmation || listItemRemoveConfirmation || itemRemoveConfirmation,
    list,
    listDeleteConfirmation,
    listItems,
    likes,
    ownReview,
    reviews,
    handleEditReview,
    userProfile,
    watchedItems: watched,
    watchlistItems: watchlist,
  };

  return (
    <AccountSectionStateProvider value={sectionProviderValue}>
      <ListView model={listDetailModel} />
    </AccountSectionStateProvider>
  );
}

function buildListNavDescription(props = {}) {
  const { list, listItems = [], reviews = [] } = props;
  if (!list) return 'Lists';
  const itemCount =
    Array.isArray(listItems) && listItems.length > 0
      ? listItems.length
      : Number(list?.itemCount ?? list?.itemsCount ?? list?.item_count) || 0;
  const likesCount = Number.isFinite(Number(list?.likesCount ?? list?.likes_count))
    ? Number(list.likesCount ?? list.likes_count)
    : Array.isArray(list?.likes)
      ? list.likes.length
      : 0;
  const reviewCount =
    Array.isArray(reviews) && reviews.length > 0
      ? reviews.length
      : Number(list?.reviewsCount ?? list?.commentsCount) || 0;

  const parts = [
    `${itemCount} ${itemCount === 1 ? 'title' : 'titles'}`,
    `${likesCount} ${likesCount === 1 ? 'like' : 'likes'}`,
  ];

  if (reviewCount > 0) {
    parts.push(`${reviewCount} ${reviewCount === 1 ? 'comment' : 'comments'}`);
  }

  return parts.join(' • ');
}

const ACCOUNT_LIST_DETAIL_REGISTRY_SOURCE = 'account-list-detail';

export const Registry = createAccountSectionRegistry({
  displayName: 'AccountListDetailRegistry',
  navDescription: (_, props) => buildListNavDescription(props),
  navRegistrySource: ACCOUNT_LIST_DETAIL_REGISTRY_SOURCE,
  resolveOverrides: (
    _sectionState,
    {
      handleDeleteList,
      handleEditList,
      handleOpenReviewComposer,
      handleToggleLike,
      isLiked = false,
      isLikeLoading = false,
      itemRemoveConfirmation = null,
      list,
      listDeleteConfirmation,
      ownReview,
      registrySource = ACCOUNT_LIST_DETAIL_REGISTRY_SOURCE,
      reviewState,
    },
  ) => {
    const canLikeList = Boolean(list);

    return {
      listDeleteConfirmation: itemRemoveConfirmation || listDeleteConfirmation,
      navRegistrySource: registrySource,
      isLiked: canLikeList ? isLiked : false,
      isLikeLoading: canLikeList ? isLikeLoading : false,
      onDeleteList: list ? () => handleDeleteList(list) : null,
      onEditList: list ? () => handleEditList(list) : null,
      onToggleLike: list ? handleToggleLike : null,
      onOpenReviewComposer: list ? handleOpenReviewComposer : null,
      ownReview,
      reviewState,
      showProfileFollowAction: false,
      showToolbarFollowActionWithOverride: Boolean(list),
    };
  },
});

function ListView({ model = null }) {
  return <AccountListDetailFeed model={model} RegistryComponent={Registry} />;
}
