'use client';

import { deleteUserList } from '@/core/services/media/lists';
import { useModal } from '@/core/modules/modal/context';
import { useToast } from '@/core/modules/notification/hooks';
import { FOLLOW_STATUSES, cancelFollowRequest, followUser, unfollowUser } from '@/core/services/social/follows.service';
import { getUserAvatarUrl } from '@/core/utils';
import { AUTH_ROUTES } from '@/features/auth/constants';
import { buildAuthHref, getCurrentPathWithSearch } from '@/features/auth/auth-flow';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAccountCollectionRemoveActions } from './collection-remove-actions';
import { useAccountCollectionReorderActions } from './collection-reorder-actions';

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
  listItems = [],
  setLikes,
  setLists,
  setListItems,
  setWatched,
  setWatchlist,
  updateQuery,
  profileHandle,
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
            initialItems: targetList?.id === selectedList?.id ? listItems : [],
            onItemsChange: targetList?.id === selectedList?.id ? setListItems : null,
          },
        }
      );
    },
    [auth.user?.id, isOwner, listItems, openModal, selectedList, setListItems]
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

            if (activeListId === targetList.id) {
              if (pathname.includes('/lists/') && profileHandle) {
                router.push(`/account/${profileHandle}/lists`);
              } else {
                updateQuery({ list: null, tab: 'lists' });
              }
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

  const {
    handleRemoveLike,
    handleRemoveListItem,
    handleRemoveWatchedItem,
    handleRemoveWatchlistItem,
    handleRequestRemoveLike,
    handleRequestRemoveListItem,
    handleRequestRemoveWatchedItem,
    handleRequestRemoveWatchlistItem,
  } = useAccountCollectionRemoveActions({
    auth,
    isOwner,
    selectedList,
    setItemRemoveConfirmation,
    setLikes,
    setListItems,
    setWatched,
    setWatchlist,
    toast,
  });

  const handleReorder = useAccountCollectionReorderActions({
    auth,
    isOwner,
    selectedList,
    setLikes,
    setListItems,
    setWatchlist,
    toast,
  });

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
