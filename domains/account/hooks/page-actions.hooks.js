'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useModal } from '@/modules/modal';
import { useToast } from '@/modules/notification';
import { deleteUserList } from '@/domains/media/client/collections/lists';
import {
  FOLLOW_STATUSES,
  cancelFollowRequest,
  followUser,
  unfollowUser,
} from '@/domains/social/client/follows';
import { getUserAvatarUrl } from '@/domains/account/utils';
import { AUTH_ROUTES, buildAuthHref, getCurrentPathWithSearch } from '@/domains/auth/utils';
import {
  useAccountCollectionRemoveActions,
  useAccountCollectionReorderActions,
} from './collections.hooks';

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
  setFollowRelationship,
  setFollowerCount,
  setFollowingCount,
  setLikes,
  setCollectionCounts,
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

  const decrementCollectionCount = useCallback(
    (key) => {
      if (typeof setCollectionCounts !== 'function') return;
      setCollectionCounts((current) => {
        const value = Number(current?.[key]);
        return {
          ...current,
          [key]: Number.isFinite(value) ? Math.max(0, value - 1) : (current?.[key] ?? null),
        };
      });
    },
    [setCollectionCounts],
  );

  const [itemRemoveConfirmation, setItemRemoveConfirmation] = useState(null);
  const [listDeleteConfirmation, setListDeleteConfirmation] = useState(null);
  const [unfollowConfirmation, setUnfollowConfirmation] = useState(null);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const currentPath = useMemo(
    () => getCurrentPathWithSearch(pathname, searchParams),
    [pathname, searchParams],
  );

  const handleEditList = useCallback(
    (list) => {
      const targetList = list || selectedList;
      if (!isOwner || !auth.user?.id || !targetList?.id) return;
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
        },
      );
    },
    [auth.user?.id, isOwner, listItems, openModal, selectedList, setListItems],
  );

  const handleDeleteList = useCallback(
    (list) => {
      const targetList = list || selectedList;
      if (!isOwner || !auth.user?.id || !targetList?.id) return;

      setListDeleteConfirmation({
        title: 'Delete List?',
        confirmText: 'Delete List',
        description: 'This removes the list and all items inside it from your profile',
        isDestructive: true,
        onCancel: () => setListDeleteConfirmation(null),
        onConfirm: async () => {
          let previousLists = null;
          if (typeof setLists === 'function') {
            setLists((cur) => {
              previousLists = cur;
              return cur.filter((c) => c?.id !== targetList.id);
            });
          }
          try {
            await deleteUserList({ listId: targetList.id, userId: auth.user.id });
            decrementCollectionCount('lists');
            setListDeleteConfirmation(null);
            if (activeListId === targetList.id) {
              if (pathname.includes('/lists/') && profileHandle) {
                router.push(`/account/${profileHandle}/lists`);
              } else {
                updateQuery({ list: null, tab: 'lists' });
              }
            }
          } catch (error) {
            if (previousLists && typeof setLists === 'function') setLists(previousLists);
            toast.error(error?.message || 'The list could not be deleted');
            throw error;
          }
        },
      });
    },
    [
      activeListId,
      auth.user?.id,
      decrementCollectionCount,
      isOwner,
      pathname,
      profileHandle,
      router,
      selectedList,
      setLists,
      toast,
      updateQuery,
    ],
  );

  const handleConfirmUnfollow = useCallback(async () => {
    if (!auth.user?.id || !profile?.id) return;
    const previousRelationship = followRelationship;

    if (typeof setFollowRelationship === 'function') {
      setFollowRelationship((prev) => ({
        ...prev,
        canViewPrivateContent: prev.isPrivateProfile ? false : prev.canViewPrivateContent,
        isInboundRelationshipLoaded: true,
        isOutboundRelationshipLoaded: true,
        isTargetProfileLoaded: true,
        outboundStatus: null,
        showFollowBack: prev.inboundStatus === FOLLOW_STATUSES.ACCEPTED,
      }));
    }
    if (typeof setFollowerCount === 'function') {
      setFollowerCount((count) => Math.max(0, count - 1));
    }

    setIsFollowLoading(true);
    try {
      await unfollowUser(auth.user.id, profile.id);
      setUnfollowConfirmation(null);
    } catch (error) {
      if (typeof setFollowRelationship === 'function') {
        setFollowRelationship(previousRelationship);
      }
      if (typeof setFollowerCount === 'function') {
        setFollowerCount((count) => Math.max(0, count + 1));
      }
      toast.error(error?.message || 'Follow state could not be updated');
      throw error;
    } finally {
      setIsFollowLoading(false);
    }
  }, [
    auth.user?.id,
    followRelationship,
    profile?.id,
    setFollowRelationship,
    setFollowerCount,
    toast,
  ]);

  const handleSignInRequest = useCallback(() => {
    router.push(buildAuthHref(AUTH_ROUTES.SIGN_IN, { next: currentPath }));
  }, [currentPath, router]);

  const handleFollow = useCallback(async () => {
    if (!auth.isAuthenticated) {
      handleSignInRequest();
      return;
    }
    if (!auth.user?.id || !profile?.id) return;

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

    const previousRelationship = followRelationship;
    const isCancelRequest = followRelationship.outboundStatus === FOLLOW_STATUSES.PENDING;
    const isTargetPrivate = Boolean(isPrivateProfile || profile?.isPrivate);
    const nextStatus = isCancelRequest
      ? null
      : isTargetPrivate
        ? FOLLOW_STATUSES.PENDING
        : FOLLOW_STATUSES.ACCEPTED;

    if (typeof setFollowRelationship === 'function') {
      setFollowRelationship((prev) => ({
        ...prev,
        canViewPrivateContent:
          prev.canViewPrivateContent || nextStatus === FOLLOW_STATUSES.ACCEPTED,
        isInboundRelationshipLoaded: true,
        isOutboundRelationshipLoaded: true,
        isPrivateProfile: isTargetPrivate,
        isTargetProfileLoaded: true,
        outboundStatus: nextStatus,
        showFollowBack: false,
      }));
    }
    if (
      !isCancelRequest &&
      nextStatus === FOLLOW_STATUSES.ACCEPTED &&
      typeof setFollowerCount === 'function'
    ) {
      setFollowerCount((count) => Math.max(0, count + 1));
    }

    setIsFollowLoading(true);
    try {
      if (isCancelRequest) {
        await cancelFollowRequest(auth.user.id, profile.id);
      } else {
        await followUser(auth.user.id, profile.id);
      }
    } catch (error) {
      if (typeof setFollowRelationship === 'function') {
        setFollowRelationship(previousRelationship);
      }
      if (
        !isCancelRequest &&
        nextStatus === FOLLOW_STATUSES.ACCEPTED &&
        typeof setFollowerCount === 'function'
      ) {
        setFollowerCount((count) => Math.max(0, count - 1));
      }
      toast.error(error?.message || 'Follow state could not be updated');
    } finally {
      setIsFollowLoading(false);
    }
  }, [
    auth.isAuthenticated,
    auth.user?.id,
    followRelationship,
    handleConfirmUnfollow,
    handleSignInRequest,
    isPrivateProfile,
    profile,
    setFollowRelationship,
    setFollowerCount,
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
      if (!resolvedUserId || !profile) return;
      if (isPrivateProfile && !isOwner && !canViewPrivateContent) return;
      openModal(
        'ACCOUNT_SOCIAL_MODAL',
        { desktop: 'center', mobile: 'bottom' },
        {
          data: {
            canManageRequests: isOwner && profile?.isPrivate === true,
            userId: resolvedUserId,
            tab: type,
          },
        },
      );
    },
    [canViewPrivateContent, isOwner, isPrivateProfile, openModal, profile, resolvedUserId],
  );

  const removeActions = useAccountCollectionRemoveActions({
    auth,
    decrementCollectionCount,
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
    ...removeActions,
    handleReorder,
    handleSignInRequest,
    isFollowLoading,
    itemRemoveConfirmation,
    listDeleteConfirmation,
    unfollowConfirmation,
  };
}
