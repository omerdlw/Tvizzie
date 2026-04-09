'use client';

import { PROFILE_TABS, getMediaTitle } from '../utils';
import { AUTH_ROUTES, buildAuthHref, getCurrentPathWithSearch } from '@/features/auth';
import { getUserAvatarUrl } from '@/core/utils';
import { useModal } from '@/core/modules/modal/context';
import { useToast } from '@/core/modules/notification/hooks';
import {
  FOLLOW_STATUSES,
  cancelFollowRequest,
  followUser,
  unfollowUser,
} from '@/core/services/social/follows.service';
import {
  getLikeDocRef,
  removeUserLike,
} from '@/core/services/media/likes.service';
import {
  deleteUserList,
  toggleUserListItem,
} from '@/core/services/media/lists.service';
import { updateUserMediaPosition } from '@/core/services/media/user-media.service';
import {
  getWatchlistDocRef,
  removeUserWatchlistItem,
} from '@/core/services/media/watchlist.service';
import { removeUserWatchedItem } from '@/core/services/media/watched.service';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';

function removeCollectionItem(items, itemToRemove) {
  const removedItemId = String(itemToRemove?.entityId || itemToRemove?.id || '').trim();
  const removedMediaType = String(itemToRemove?.media_type || itemToRemove?.entityType || '')
    .trim()
    .toLowerCase();

  return items.filter((currentItem) => {
    if (itemToRemove?.mediaKey && currentItem?.mediaKey) {
      return currentItem.mediaKey !== itemToRemove.mediaKey;
    }

    const currentItemId = String(currentItem?.entityId || currentItem?.id || '').trim();
    const currentMediaType = String(currentItem?.media_type || currentItem?.entityType || '')
      .trim()
      .toLowerCase();

    return currentItemId !== removedItemId || currentMediaType !== removedMediaType;
  });
}

export function useAccountHeroHeight() {
  const heroRef = useRef(null);
  const [heroHeight, setHeroHeight] = useState(0);

  useEffect(() => {
    const element = heroRef.current;
    if (!element) return;

    const updateHeight = () => {
      const nextHeight = Math.round(element.getBoundingClientRect().height || 0);
      setHeroHeight(nextHeight);
    };

    updateHeight();

    if (typeof ResizeObserver !== 'function') return;

    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { heroHeight, heroRef };
}

export function useAccountPageQueryState({ activeTabProp }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState(() =>
    activeTabProp && PROFILE_TABS.includes(activeTabProp) ? activeTabProp : 'likes'
  );

  const activeListId = searchParams.get('list') || '';

  useEffect(() => {
    if (activeTabProp && PROFILE_TABS.includes(activeTabProp)) {
      setActiveTab((prev) => (prev === activeTabProp ? prev : activeTabProp));
      return;
    }

    const tabParam = searchParams.get('tab');
    const nextTab = tabParam && PROFILE_TABS.includes(tabParam) ? tabParam : 'likes';

    setActiveTab((prev) => (prev === nextTab ? prev : nextTab));
  }, [activeTabProp, searchParams]);

  const updateQuery = useCallback(
    (nextEntries = {}) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(nextEntries).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      const query = params.toString();

      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        });
      });
    },
    [pathname, router, searchParams]
  );

  const handleTabChange = useCallback(
    (tab) => {
      setActiveTab(tab);
      updateQuery({
        tab: tab === 'likes' ? null : tab,
        list: null,
      });
    },
    [updateQuery]
  );

  return {
    activeListId,
    activeTab,
    handleTabChange,
    updateQuery,
  };
}

export function useAccountPageActions({
  activeListId,
  auth,
  canViewPrivateContent = false,
  followRelationship,
  isOwner,
  isPrivateProfile = false,
  profile,
  resolvedUserId,
  selectedList,
  setLikes,
  setLists,
  setListItems,
  setWatched,
  setWatchlist,
  updateQuery,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { openModal } = useModal();

  const [itemRemoveConfirmation, setItemRemoveConfirmation] = useState(null);
  const [listDeleteConfirmation, setListDeleteConfirmation] = useState(null);
  const [unfollowConfirmation, setUnfollowConfirmation] = useState(null);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const currentPath = useMemo(() => getCurrentPathWithSearch(pathname, searchParams), [pathname, searchParams]);

  const handleEditList = useCallback(
    (list) => {
      const targetList = list || selectedList;

      if (!isOwner || !auth.user?.id) return;
      if (!targetList?.id) return;

      openModal(
        'LIST_EDITOR_MODAL',
        { desktop: 'center', mobile: 'bottom' },
        {
          data: {
            isOwner: true,
            userId: auth.user.id,
            initialData: targetList,
          },
        }
      );
    },
    [auth.user?.id, isOwner, openModal, selectedList]
  );

  const handleDeleteList = useCallback(
    (list) => {
      const targetList = list || selectedList;

      if (!isOwner || !auth.user?.id) return;
      if (!targetList?.id) return;

      setListDeleteConfirmation({
        title: 'Delete List?',
        confirmText: 'Delete List',
        description: 'This removes the list and all items inside it from your profile',
        isDestructive: true,
        onCancel: () => setListDeleteConfirmation(null),
        onConfirm: async () => {
          let previousLists = null;

          if (typeof setLists === 'function') {
            setLists((currentLists) => {
              previousLists = currentLists;
              return currentLists.filter((current) => current?.id !== targetList.id);
            });
          }

          try {
            await deleteUserList({
              listId: targetList.id,
              userId: auth.user.id,
            });
            setListDeleteConfirmation(null);
            toast.success(`"${targetList.title}" was deleted`);

            if (activeListId === targetList.id) {
              updateQuery({ list: null, tab: 'lists' });
            }
          } catch (error) {
            if (previousLists && typeof setLists === 'function') {
              setLists(previousLists);
            }
            toast.error(error?.message || 'The list could not be deleted');
            throw error;
          }
        },
      });
    },
    [activeListId, auth.user?.id, isOwner, selectedList, setLists, toast, updateQuery]
  );

  const handleConfirmUnfollow = useCallback(async () => {
    if (!auth.user?.id || !profile?.id) return;

    setIsFollowLoading(true);

    try {
      await unfollowUser(auth.user.id, profile.id);
      setUnfollowConfirmation(null);
    } catch (error) {
      toast.error(error?.message || 'Follow state could not be updated');
      throw error;
    } finally {
      setIsFollowLoading(false);
    }
  }, [auth.user?.id, profile?.id, toast]);

  const handleSignInRequest = useCallback(() => {
    router.push(
      buildAuthHref(AUTH_ROUTES.SIGN_IN, {
        next: currentPath,
      })
    );
  }, [currentPath, router]);

  const handleFollow = useCallback(async () => {
    if (!auth.isAuthenticated) {
      handleSignInRequest();
      return;
    }

    if (!auth.user?.id || !profile?.id) {
      return;
    }

    if (followRelationship.outboundStatus === FOLLOW_STATUSES.ACCEPTED) {
      const handle = profile?.username ? `@${profile.username}` : 'this user';
      const name = profile?.displayName || profile?.username || 'This user';

      setUnfollowConfirmation({
        title: `Unfollow ${handle}`,
        description:
          name === handle
            ? `${handle} will be removed from your following list until you follow again`
            : `${name} ${handle} will be removed from your following list until you follow again`,
        icon: getUserAvatarUrl(profile),
        confirmText: 'Unfollow',
        isDestructive: true,
        onCancel: () => setUnfollowConfirmation(null),
        onConfirm: handleConfirmUnfollow,
      });
      return;
    }

    setIsFollowLoading(true);

    try {
      if (followRelationship.outboundStatus === FOLLOW_STATUSES.PENDING) {
        await cancelFollowRequest(auth.user.id, profile.id);
      } else {
        await followUser(auth.user.id, profile.id);
      }
    } catch (error) {
      toast.error(error?.message || 'Follow state could not be updated');
    } finally {
      setIsFollowLoading(false);
    }
  }, [
    auth.isAuthenticated,
    auth.user?.id,
    followRelationship.outboundStatus,
    handleConfirmUnfollow,
    handleSignInRequest,
    profile,
    toast,
  ]);

  useEffect(() => {
    if (followRelationship.outboundStatus !== FOLLOW_STATUSES.ACCEPTED) {
      setUnfollowConfirmation(null);
    }
  }, [followRelationship.outboundStatus]);

  const handleEditProfile = useCallback(() => {
    if (!isOwner) return;
    router.push('/account/edit');
  }, [isOwner, router]);

  const handleOpenFollowList = useCallback(
    (type) => {
      if (!resolvedUserId || !profile) {
        return;
      }

      if (isPrivateProfile && !isOwner && !canViewPrivateContent) {
        return;
      }

      const canManageRequests = isOwner && profile?.isPrivate === true;

      openModal(
        'ACCOUNT_SOCIAL_MODAL',
        { desktop: 'center', mobile: 'bottom' },
        {
          data: {
            canManageRequests,
            userId: resolvedUserId,
            tab: type,
          },
        }
      );
    },
    [canViewPrivateContent, isOwner, isPrivateProfile, openModal, profile, resolvedUserId]
  );

  const handleRemoveListItem = useCallback(
    async (item) => {
      if (!isOwner || !selectedList || !auth.user?.id) return;

      try {
        await toggleUserListItem({
          listId: selectedList.id,
          media: item,
          userId: auth.user.id,
        });
        setItemRemoveConfirmation(null);
        toast.success(`${getMediaTitle(item)} was removed from the list`);
      } catch (error) {
        toast.error(error?.message || 'The item could not be removed');
        throw error;
      }
    },
    [auth.user?.id, isOwner, selectedList, toast]
  );

  const handleRequestRemoveListItem = useCallback(
    (item) => {
      if (!isOwner) return;

      setItemRemoveConfirmation({
        title: 'Remove List Item?',
        description: `${getMediaTitle(item)} will be removed from this list.`,
        confirmText: 'Remove',
        confirmLoadingText: 'Removing',
        isDestructive: true,
        onCancel: () => setItemRemoveConfirmation(null),
        onConfirm: () => handleRemoveListItem(item),
      });
    },
    [handleRemoveListItem, isOwner]
  );

  const handleRemoveLike = useCallback(
    async (item) => {
      if (!isOwner || !auth.user?.id) return;

      let previousLikes = null;

      setLikes((currentLikes) => {
        previousLikes = currentLikes;
        return removeCollectionItem(currentLikes, item);
      });

      try {
        await removeUserLike({
          media: item,
          mediaKey: item?.mediaKey || null,
          userId: auth.user.id,
        });
        setItemRemoveConfirmation(null);
        toast.success(`${getMediaTitle(item)} was removed from likes`);
      } catch (error) {
        if (previousLikes) {
          setLikes(previousLikes);
        }
        toast.error(error?.message || 'The item could not be removed');
        throw error;
      }
    },
    [auth.user?.id, isOwner, setLikes, toast]
  );

  const handleRemoveWatchlistItem = useCallback(
    async (item) => {
      if (!isOwner || !auth.user?.id) return;

      let previousWatchlist = null;

      setWatchlist((currentWatchlist) => {
        previousWatchlist = currentWatchlist;
        return removeCollectionItem(currentWatchlist, item);
      });

      try {
        await removeUserWatchlistItem({
          media: item,
          mediaKey: item?.mediaKey || null,
          userId: auth.user.id,
        });
        setItemRemoveConfirmation(null);
        toast.success(`${getMediaTitle(item)} was removed from watchlist`);
      } catch (error) {
        if (previousWatchlist) {
          setWatchlist(previousWatchlist);
        }
        toast.error(error?.message || 'The item could not be removed');
        throw error;
      }
    },
    [auth.user?.id, isOwner, setWatchlist, toast]
  );

  const handleRemoveWatchedItem = useCallback(
    async (item) => {
      if (!isOwner || !auth.user?.id) return;

      let previousWatched = null;

      setWatched((currentWatched) => {
        previousWatched = currentWatched;
        return removeCollectionItem(currentWatched, item);
      });

      try {
        await removeUserWatchedItem({
          media: item,
          mediaKey: item?.mediaKey || null,
          userId: auth.user.id,
        });
        setItemRemoveConfirmation(null);
        toast.success(`${getMediaTitle(item)} was removed from watched`);
      } catch (error) {
        if (previousWatched) {
          setWatched(previousWatched);
        }
        toast.error(error?.message || 'The item could not be removed');
        throw error;
      }
    },
    [auth.user?.id, isOwner, setWatched, toast]
  );

  const handleRequestRemoveLike = useCallback(
    (item) => {
      if (!isOwner) return;

      setItemRemoveConfirmation({
        title: 'Remove Like?',
        description: `${getMediaTitle(item)} will be removed from your likes.`,
        confirmText: 'Remove',
        confirmLoadingText: 'Removing',
        isDestructive: true,
        onCancel: () => setItemRemoveConfirmation(null),
        onConfirm: () => handleRemoveLike(item),
      });
    },
    [handleRemoveLike, isOwner]
  );

  const handleRequestRemoveWatchlistItem = useCallback(
    (item) => {
      if (!isOwner) return;

      setItemRemoveConfirmation({
        title: 'Remove Watchlist Item?',
        description: `${getMediaTitle(item)} will be removed from your watchlist.`,
        confirmText: 'Remove',
        confirmLoadingText: 'Removing',
        isDestructive: true,
        onCancel: () => setItemRemoveConfirmation(null),
        onConfirm: () => handleRemoveWatchlistItem(item),
      });
    },
    [handleRemoveWatchlistItem, isOwner]
  );

  const handleRequestRemoveWatchedItem = useCallback(
    (item) => {
      if (!isOwner) return;

      setItemRemoveConfirmation({
        title: 'Remove Watched Item?',
        description: `${getMediaTitle(item)} will be removed from your watched films.`,
        confirmText: 'Remove',
        confirmLoadingText: 'Removing',
        isDestructive: true,
        onCancel: () => setItemRemoveConfirmation(null),
        onConfirm: () => handleRemoveWatchedItem(item),
      });
    },
    [handleRemoveWatchedItem, isOwner]
  );

  const handleReorder = useCallback(
    async (nextItems, tab) => {
      if (!isOwner || !auth.user?.id) return;

      if (tab === 'likes') setLikes(nextItems);
      if (tab === 'watchlist') setWatchlist(nextItems);
      if (tab === 'lists') setListItems(nextItems);

      try {
        const now = Date.now();
        const updates = nextItems
          .map((item, index) => {
            const newPosition = now - index;
            let docRef;

            if (tab === 'likes') {
              docRef = getLikeDocRef(auth.user.id, item);
            }

            if (tab === 'watchlist') {
              docRef = getWatchlistDocRef(auth.user.id, item);
            }

            if (tab === 'lists' && selectedList) {
              docRef = {
                id: item.mediaKey,
                listId: selectedList.id,
                table: 'list_items',
                userId: auth.user.id,
              };
            }

            return docRef ? updateUserMediaPosition(docRef, newPosition) : null;
          })
          .filter(Boolean);

        await Promise.all(updates);
      } catch (error) {
        console.error(`[Profile] Failed to persist reorder for ${tab}:`, error);
        toast.error('Could not save custom order');
        throw error;
      }
    },
    [auth.user?.id, isOwner, selectedList, setLikes, setListItems, setWatchlist, toast]
  );

  return {
    handleDeleteList,
    handleEditList,
    handleEditProfile,
    handleFollow,
    handleOpenFollowList,
    handleRemoveLike,
    handleRemoveWatchedItem,
    handleRequestRemoveLike,
    handleRequestRemoveListItem,
    handleRequestRemoveWatchedItem,
    handleRequestRemoveWatchlistItem,
    handleRemoveListItem,
    handleRemoveWatchlistItem,
    handleReorder,
    handleSignInRequest,
    isFollowLoading,
    itemRemoveConfirmation,
    listDeleteConfirmation,
    unfollowConfirmation,
  };
}
