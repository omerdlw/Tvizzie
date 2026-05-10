'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { getUserAvatarUrl } from '@/core/utils';
import { useModal } from '@/core/modules/modal/context';
import { useToast } from '@/core/modules/notification/hooks';
import { FOLLOW_STATUSES, cancelFollowRequest, followUser, unfollowUser } from '@/core/services/social/follows.service';
import { AUTH_ROUTES } from '@/features/auth/constants';
import { buildAuthHref, getCurrentPathWithSearch } from '@/features/auth/utils';

export function useAccountFollowActions({
  auth,
  canViewPrivateContent = false,
  followRelationship,
  isOwner,
  isPrivateProfile = false,
  profile,
  resolvedUserId,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { openModal } = useModal();

  const [unfollowConfirmation, setUnfollowConfirmation] = useState(null);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const currentPath = useMemo(() => getCurrentPathWithSearch(pathname, searchParams), [pathname, searchParams]);

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

  return {
    handleEditProfile,
    handleFollow,
    handleOpenFollowList,
    handleSignInRequest,
    isFollowLoading,
    unfollowConfirmation,
  };
}
