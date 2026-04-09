'use client';

import { useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import { EmptyState } from '@/features/shared/empty-state';
import { applyAvatarFallback, getUserAvatarFallbackUrl, getUserAvatarUrl } from '@/core/utils';
import { useAuth, useAuthSessionReady } from '@/core/modules/auth';
import Container from '@/core/modules/modal/container';
import { useToast } from '@/core/modules/notification/hooks';
import {
  FOLLOW_STATUSES,
  acceptFollowRequest,
  followUser,
  rejectFollowRequest,
  removeFollower,
  subscribeToFollowers,
  subscribeToFollowing,
} from '@/core/services/social/follows.service';
import { Button } from '@/ui/elements';
import Icon from '@/ui/icon';

async function hydrateFollowUsers(list) {
  return list
    .map((item) => ({
      avatarUrl: item.avatarUrl || null,
      displayName: item.displayName,
      id: item.userId || item.id,
      status: item.status || FOLLOW_STATUSES.ACCEPTED,
      username: item.username,
    }))
    .filter((item) => item.id && item.displayName && item.username);
}

function resolveFollowCollectionError(error, activeTab) {
  const status = Number(error?.status || 0);

  if (status === 403) {
    return activeTab === 'requests'
      ? 'You are not allowed to view pending follow requests.'
      : 'This profile is private.';
  }

  if (status === 401) {
    return 'Your session has expired. Please sign in again.';
  }

  return activeTab === 'requests'
    ? 'Pending follow requests could not be loaded.'
    : 'This follow list could not be loaded.';
}

function FollowRow({
  close,
  followLabel = null,
  isAcceptLoading = false,
  isActionDisabled = false,
  isActionLoading = false,
  isFollowDisabled = false,
  isFollowLoading = false,
  isRequest = false,
  isRejectLoading = false,
  onAccept,
  onFollow,
  onRemove,
  onReject,
  showFollowAction = false,
  showRemoveAction = false,
  user,
}) {
  const avatarSrc = getUserAvatarUrl(user);
  const avatarFallbackSrc = getUserAvatarFallbackUrl(user);

  return (
    <div className="group flex items-center gap-3 bg-transparent p-3 transition-all">
      <Link
        href={`/account/${user.username || user.id}`}
        onClick={close}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <div className="size-10 shrink-0 overflow-hidden">
          <img
            src={avatarSrc}
            alt={user.displayName}
            className="h-full w-full object-cover"
            onError={(event) => applyAvatarFallback(event, avatarFallbackSrc)}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className={`truncate text-sm font-bold transition-colors`}>{user.displayName}</h4>
            {showFollowAction ? (
              <Button
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onFollow?.();
                }}
                disabled={isFollowLoading || isFollowDisabled}
                className="border-info/15 bg-info/5 text-info hover:bg-info/15 h-8 rounded-[10px] border px-3 text-[10px] font-semibold tracking-wide uppercase transition disabled:cursor-not-allowed disabled:bg-black/5"
              >
                {isFollowLoading ? 'Updating' : followLabel}
              </Button>
            ) : null}
          </div>
          <p className="truncate text-[10px] tracking-wide text-black/70 uppercase">@{user.username || 'user'}</p>
        </div>
      </Link>

      {isRequest ? (
        <div className="flex items-center gap-2">
          <Button
            onClick={onAccept}
            disabled={isActionDisabled}
            className="border-success/15 bg-success/5 text-success hover:bg-success/15 h-8 rounded-[10px] border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:bg-black/5"
          >
            {isAcceptLoading ? 'Accepting' : 'Accept'}
          </Button>
          <Button
            onClick={onReject}
            disabled={isActionDisabled}
            className="border-error/15 bg-error/5 text-error hover:bg-error/15 h-8 rounded-[10px] border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:bg-black/5"
          >
            {isRejectLoading ? 'Rejecting' : 'Reject'}
          </Button>
        </div>
      ) : showRemoveAction ? (
        <Button
          type="button"
          onClick={onRemove}
          disabled={isActionLoading}
          className="border-error/15 bg-error/5 text-error hover:bg-error/15 h-8 rounded-[10px] border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:bg-black/5"
        >
          {isActionLoading ? 'Removing' : 'Remove'}
        </Button>
      ) : (
        <Icon icon="solar:alt-arrow-right-linear" size={16} className="text-black/70" />
      )}
    </div>
  );
}

export default function FollowListModal({ close, data, header }) {
  const auth = useAuth();
  const isAuthSessionReady = useAuthSessionReady(auth.isAuthenticated ? auth.user?.id || null : null);
  const toast = useToast();
  const { canManageRequests = true, type = 'followers', userId } = data || {};
  const activeTab = useMemo(() => {
    if (type === 'following' || type === 'requests') return type;
    return 'followers';
  }, [type]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [actionState, setActionState] = useState({
    kind: null,
    userId: null,
  });
  const [followingStatusMap, setFollowingStatusMap] = useState({});
  const isOwnFollowersList = activeTab === 'followers' && Boolean(auth.user?.id) && auth.user.id === userId;

  useEffect(() => {
    if (!userId || !activeTab) {
      setUsers([]);
      setLoading(false);
      setLoadError(null);
      return undefined;
    }

    if (activeTab === 'requests' && !canManageRequests) {
      setUsers([]);
      setLoading(false);
      setLoadError(null);
      return undefined;
    }

    if (((activeTab === 'requests' && auth.isAuthenticated) || auth.user?.id === userId) && !isAuthSessionReady) {
      setUsers([]);
      setLoading(true);
      setLoadError(null);
      return undefined;
    }

    setUsers([]);
    setLoading(true);
    setLoadError(null);
    const subscribe = activeTab === 'following' ? subscribeToFollowing : subscribeToFollowers;
    const status = activeTab === 'requests' ? FOLLOW_STATUSES.PENDING : FOLLOW_STATUSES.ACCEPTED;

    const unsubscribe = subscribe(
      userId,
      async (list) => {
        const hydrated = await hydrateFollowUsers(list);
        setUsers(hydrated);
        setLoading(false);
        setLoadError(null);
      },
      {
        emitCachedPayloadOnSubscribe: false,
        refreshOnSubscribe: true,
        status,
        onError: (error) => {
          setUsers([]);
          setLoadError(error);
          setLoading(false);
        },
      }
    );

    return () => unsubscribe();
  }, [activeTab, auth.isAuthenticated, auth.user?.id, canManageRequests, isAuthSessionReady, userId]);

  useEffect(() => {
    if (!isOwnFollowersList || !auth.user?.id || !isAuthSessionReady) {
      setFollowingStatusMap({});
      return undefined;
    }

    return subscribeToFollowing(
      auth.user.id,
      (following) => {
        const nextStatusMap = following.reduce((accumulator, item) => {
          const nextUserId = item?.userId || item?.id;
          if (nextUserId) {
            accumulator[nextUserId] = item.status || FOLLOW_STATUSES.ACCEPTED;
          }
          return accumulator;
        }, {});

        setFollowingStatusMap(nextStatusMap);
      },
      {
        emitCachedPayloadOnSubscribe: false,
        refreshOnSubscribe: true,
        status: null,
      }
    );
  }, [auth.user?.id, isAuthSessionReady, isOwnFollowersList]);

  const handleAccept = async (requesterId) => {
    if (!auth.user?.id || actionState.userId) return;

    const targetUser = users.find((user) => user.id === requesterId);

    if (!targetUser || targetUser.status !== FOLLOW_STATUSES.PENDING) {
      setUsers((current) => current.filter((user) => user.id !== requesterId));
      toast.info('This request has already been resolved');
      return;
    }

    setActionState({ kind: 'accept', userId: requesterId });

    try {
      await acceptFollowRequest(auth.user.id, requesterId);
      setUsers((current) => current.filter((user) => user.id !== requesterId));
      toast.success('Follow request accepted');
    } catch (error) {
      const message = String(error?.message || '');
      if (message.includes('already been resolved')) {
        setUsers((current) => current.filter((user) => user.id !== requesterId));
        toast.info('This request has already been resolved');
      } else {
        toast.error(error?.message || 'Request could not be accepted');
      }
    } finally {
      setActionState({ kind: null, userId: null });
    }
  };

  const handleReject = async (requesterId) => {
    if (!auth.user?.id || actionState.userId) return;

    const targetUser = users.find((user) => user.id === requesterId);

    if (!targetUser || targetUser.status !== FOLLOW_STATUSES.PENDING) {
      setUsers((current) => current.filter((user) => user.id !== requesterId));
      toast.info('This request has already been resolved');
      return;
    }

    setActionState({ kind: 'reject', userId: requesterId });

    try {
      await rejectFollowRequest(auth.user.id, requesterId);
      setUsers((current) => current.filter((user) => user.id !== requesterId));
      toast.success('Follow request rejected');
    } catch (error) {
      const message = String(error?.message || '');
      if (message.includes('already been resolved')) {
        setUsers((current) => current.filter((user) => user.id !== requesterId));
        toast.info('This request has already been resolved');
      } else {
        toast.error(error?.message || 'Request could not be rejected');
      }
    } finally {
      setActionState({ kind: null, userId: null });
    }
  };

  const handleFollowBack = async (targetUserId) => {
    if (!auth.user?.id || actionState.userId) return;

    setActionState({ kind: 'follow', userId: targetUserId });

    try {
      await followUser(auth.user.id, targetUserId);
      toast.success('Follow state updated');
    } catch (error) {
      toast.error(error?.message || 'Follow state could not be updated');
    } finally {
      setActionState({ kind: null, userId: null });
    }
  };

  const handleRemoveFollower = async (followerId) => {
    if (!auth.user?.id || actionState.userId) return;

    setActionState({ kind: 'remove', userId: followerId });

    try {
      await removeFollower(auth.user.id, followerId);
      toast.success('Follower removed');
    } catch (error) {
      toast.error(error?.message || 'Follower could not be removed');
    } finally {
      setActionState({ kind: null, userId: null });
    }
  };

  const emptyDescription = activeTab === 'requests' ? 'No pending requests right now' : 'This list is currently empty';
  const loadErrorMessage = loadError ? resolveFollowCollectionError(loadError, activeTab) : null;

  return (
    <Container
      className="max-h-[76vh] w-full sm:w-[460px]"
      header={header}
      close={close}
      bodyClassName="p-3"
      footer={{
        left: `${users.length} users`,
      }}
    >
      <div className="flex h-full min-h-0 flex-col gap-2">
        {loading ? (
          <div className="flex flex-1 flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-[10px] border border-black/10 bg-black/5" />
            ))}
          </div>
        ) : loadErrorMessage ? (
          <EmptyState
            className="min-h-[220px] rounded-[10px] border border-black/10 bg-black/5"
            title="Unavailable"
            description={loadErrorMessage}
          />
        ) : users.length === 0 ? (
          <EmptyState
            className="min-h-[220px] rounded-[10px] border border-black/10 bg-black/5"
            title="No users found"
            description={emptyDescription}
          />
        ) : (
          <div
            data-lenis-prevent
            data-lenis-prevent-wheel
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          >
            <div className="flex flex-col gap-2">
              {users.map((user) => {
                const followingStatus = followingStatusMap[user.id] || null;
                const canFollowBack =
                  isOwnFollowersList && auth.user?.id !== user.id && followingStatus !== FOLLOW_STATUSES.ACCEPTED;
                const followLabel = followingStatus === FOLLOW_STATUSES.PENDING ? 'Requested' : 'Follow';

                return (
                  <FollowRow
                    key={user.id}
                    close={close}
                    followLabel={followLabel}
                    isFollowDisabled={followingStatus === FOLLOW_STATUSES.PENDING}
                    isActionLoading={actionState.userId === user.id && actionState.kind === 'remove'}
                    isActionDisabled={
                      actionState.userId === user.id && (actionState.kind === 'accept' || actionState.kind === 'reject')
                    }
                    isAcceptLoading={actionState.userId === user.id && actionState.kind === 'accept'}
                    isFollowLoading={actionState.userId === user.id && actionState.kind === 'follow'}
                    isRequest={activeTab === 'requests'}
                    isRejectLoading={actionState.userId === user.id && actionState.kind === 'reject'}
                    onAccept={() => handleAccept(user.id)}
                    onFollow={() => handleFollowBack(user.id)}
                    onRemove={() => handleRemoveFollower(user.id)}
                    onReject={() => handleReject(user.id)}
                    showFollowAction={canFollowBack}
                    showRemoveAction={isOwnFollowersList && auth.user?.id !== user.id}
                    user={user}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Container>
  );
}
