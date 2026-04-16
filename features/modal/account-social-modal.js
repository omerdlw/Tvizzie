'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { useAuth, useAuthSessionReady } from '@/core/modules/auth';
import Container from '@/core/modules/modal/container';
import { useToast } from '@/core/modules/notification/hooks';
import {
  FOLLOW_STATUSES,
  acceptFollowRequest,
  followUser,
  removeFollower,
  rejectFollowRequest,
  subscribeToFollowers,
  subscribeToFollowing,
  unfollowUser,
} from '@/core/services/social/follows.service';
import { applyAvatarFallback, getUserAvatarFallbackUrl, getUserAvatarUrl } from '@/core/utils';
import { EmptyState } from '@/features/shared/empty-state';
import SegmentedControl from '@/features/shared/segmented-control';
import { Button } from '@/ui/elements';

const TABS = Object.freeze({
  FOLLOWERS: 'followers',
  FOLLOWING: 'following',
  INBOX: 'inbox',
});

const ROW_BUTTON_CLASS =
  'h-8 w-auto shrink-0 border px-2.5 py-1 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:bg-black/5';
const ERROR_BUTTON_CLASS = `${ROW_BUTTON_CLASS} border-error/15 bg-error/5 text-error hover:bg-error/15`;
const SUCCESS_BUTTON_CLASS = `${ROW_BUTTON_CLASS} border-success/15 bg-success/5 text-success hover:bg-success/15`;
const INFO_BUTTON_CLASS = `${ROW_BUTTON_CLASS} border-info/15 bg-info/5 text-info hover:bg-info/15`;

function normalizeTab(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (normalized === 'following') return TABS.FOLLOWING;
  if (normalized === 'requests' || normalized === TABS.INBOX) return TABS.INBOX;
  return TABS.FOLLOWERS;
}

function hydrateFollowUsers(list) {
  return (Array.isArray(list) ? list : [])
    .map((item) => ({
      id: item.userId || item.id,
      username: item.username || null,
      avatarUrl: item.avatarUrl || null,
      displayName: item.displayName || item.username || 'Anonymous User',
      status: item.status || FOLLOW_STATUSES.ACCEPTED,
    }))
    .filter((item) => item.id);
}

function resolveCollectionErrorMessage(error, tab) {
  const status = Number(error?.status || 0);

  if (status === 403) {
    return tab === TABS.INBOX ? 'You are not allowed to view pending follow requests.' : 'This profile is private.';
  }

  if (status === 401) {
    return 'Your session has expired. Please sign in again.';
  }

  return tab === TABS.INBOX ? 'Pending follow requests could not be loaded.' : `Could not load ${tab}.`;
}

function buildFollowingStatusMap(list = [], fallbackStatus = FOLLOW_STATUSES.ACCEPTED) {
  return (Array.isArray(list) ? list : []).reduce((acc, item) => {
    const id = item?.userId || item?.id;
    if (!id) return acc;
    acc[id] = item?.status || fallbackStatus;
    return acc;
  }, {});
}

function LoadingList() {
  return (
    <div>
      {Array.from({ length: 10 }, (_, index) => (
        <div key={index} className="flex items-center gap-3 border-b border-black/10 p-3 last:border-none lg:p-4">
          <div className="size-10 shrink-0 animate-pulse bg-black/5" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-3 w-3/5 animate-pulse bg-black/5" />
            <div className="h-2 w-2/5 animate-pulse bg-black/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SocialUserRow({ close, user, action }) {
  const avatarSrc = getUserAvatarUrl(user);
  const avatarFallbackSrc = getUserAvatarFallbackUrl(user);

  return (
    <div className="flex items-center justify-between gap-3 border-b border-black/10 p-3 transition-colors last:border-none hover:bg-black/5 lg:p-4">
      <Link
        href={`/account/${user.username || user.id}`}
        onClick={close}
        className="flex min-w-0 flex-1 items-center gap-2.5"
      >
        <img
          src={avatarSrc}
          alt={user.displayName}
          className="size-10 shrink-0 object-cover"
          onError={(event) => applyAvatarFallback(event, avatarFallbackSrc)}
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{user.displayName}</p>
          <p className="truncate text-[11px] text-black/70">@{user.username || 'user'}</p>
        </div>
      </Link>
      {action}
    </div>
  );
}

function UserAction({
  tab,
  user,
  authUserId,
  isOwnProfile,
  pendingKind,
  followStatus,
  onAccept,
  onReject,
  onUnfollow,
  onRemoveFollower,
  onFollow,
}) {
  const isPending = Boolean(pendingKind);
  const canShowFollowAction =
    tab !== TABS.INBOX &&
    Boolean(authUserId) &&
    !isOwnProfile &&
    authUserId !== user.id &&
    followStatus !== FOLLOW_STATUSES.ACCEPTED;

  if (tab === TABS.INBOX) {
    return (
      <div className="flex items-center gap-2">
        <Button onClick={() => onAccept(user.id)} disabled={isPending} className={SUCCESS_BUTTON_CLASS}>
          {pendingKind === 'accept' ? 'Accepting' : 'Accept'}
        </Button>
        <Button onClick={() => onReject(user.id)} disabled={isPending} className={ERROR_BUTTON_CLASS}>
          {pendingKind === 'reject' ? 'Rejecting' : 'Reject'}
        </Button>
      </div>
    );
  }

  if (tab === TABS.FOLLOWING && isOwnProfile) {
    return (
      <Button onClick={() => onUnfollow(user.id)} disabled={isPending} className={ERROR_BUTTON_CLASS}>
        {pendingKind === 'unfollow' ? 'Unfollowing' : 'Unfollow'}
      </Button>
    );
  }

  if (tab === TABS.FOLLOWERS && isOwnProfile) {
    return (
      <Button onClick={() => onRemoveFollower(user.id)} disabled={isPending} className={ERROR_BUTTON_CLASS}>
        {pendingKind === 'remove-follower' ? 'Removing' : 'Remove'}
      </Button>
    );
  }

  if (canShowFollowAction) {
    const isFollowPending = followStatus === FOLLOW_STATUSES.PENDING;
    return (
      <Button onClick={() => onFollow(user.id)} disabled={isFollowPending || isPending} className={INFO_BUTTON_CLASS}>
        {pendingKind === 'follow' ? 'Updating' : isFollowPending ? 'Requested' : 'Follow'}
      </Button>
    );
  }

  return null;
}

export default function AccountSocialModal({ close, data }) {
  const auth = useAuth();
  const toast = useToast();

  const authUserId = auth.user?.id || null;
  const userId = String(data?.userId || '').trim() || null;
  const canManageRequests = Boolean(data?.canManageRequests);
  const isAuthSessionReady = useAuthSessionReady(auth.isAuthenticated ? authUserId : null);

  const [activeTab, setActiveTab] = useState(() => normalizeTab(data?.tab || data?.type));

  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [requests, setRequests] = useState([]);

  const [isLoadingFollowers, setIsLoadingFollowers] = useState(true);
  const [isLoadingFollowing, setIsLoadingFollowing] = useState(true);
  const [isLoadingRequests, setIsLoadingRequests] = useState(canManageRequests);

  const [followersError, setFollowersError] = useState(null);
  const [followingError, setFollowingError] = useState(null);
  const [requestsError, setRequestsError] = useState(null);

  const [pendingActionByUserId, setPendingActionByUserId] = useState({});
  const [followingStatusMap, setFollowingStatusMap] = useState({});

  const isOwnProfile = Boolean(authUserId) && authUserId === userId;

  useEffect(() => {
    setActiveTab(normalizeTab(data?.tab || data?.type));
  }, [data?.tab, data?.type]);

  useEffect(() => {
    if (!userId) {
      setFollowers([]);
      setIsLoadingFollowers(false);
      setFollowersError(null);
      return;
    }

    setFollowers([]);
    setIsLoadingFollowers(true);
    setFollowersError(null);

    return subscribeToFollowers(
      userId,
      (list) => {
        setFollowers(hydrateFollowUsers(list));
        setIsLoadingFollowers(false);
        setFollowersError(null);
      },
      {
        emitCachedPayloadOnSubscribe: false,
        refreshOnSubscribe: true,
        status: FOLLOW_STATUSES.ACCEPTED,
        onError: (error) => {
          setFollowers([]);
          setFollowersError(error);
          setIsLoadingFollowers(false);
        },
      }
    );
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setFollowing([]);
      setIsLoadingFollowing(false);
      setFollowingError(null);
      return;
    }

    setFollowing([]);
    setIsLoadingFollowing(true);
    setFollowingError(null);

    return subscribeToFollowing(
      userId,
      (list) => {
        setFollowing(hydrateFollowUsers(list));
        setIsLoadingFollowing(false);
        setFollowingError(null);
      },
      {
        emitCachedPayloadOnSubscribe: false,
        refreshOnSubscribe: true,
        status: FOLLOW_STATUSES.ACCEPTED,
        onError: (error) => {
          setFollowing([]);
          setFollowingError(error);
          setIsLoadingFollowing(false);
        },
      }
    );
  }, [userId]);

  useEffect(() => {
    if (!canManageRequests || !authUserId) {
      setRequests([]);
      setIsLoadingRequests(false);
      setRequestsError(null);
      return;
    }

    if (!isAuthSessionReady) {
      setRequests([]);
      setIsLoadingRequests(true);
      setRequestsError(null);
      return;
    }

    setRequests([]);
    setIsLoadingRequests(true);
    setRequestsError(null);

    return subscribeToFollowers(
      authUserId,
      (list) => {
        setRequests(hydrateFollowUsers(list));
        setIsLoadingRequests(false);
        setRequestsError(null);
      },
      {
        emitCachedPayloadOnSubscribe: false,
        refreshOnSubscribe: true,
        status: FOLLOW_STATUSES.PENDING,
        onError: (error) => {
          setRequests([]);
          setRequestsError(error);
          setIsLoadingRequests(false);
        },
      }
    );
  }, [authUserId, canManageRequests, isAuthSessionReady]);

  useEffect(() => {
    if (!authUserId || !isAuthSessionReady) {
      setFollowingStatusMap({});
      return;
    }

    let acceptedStatusMap = {};
    let pendingStatusMap = {};

    const sync = () => setFollowingStatusMap({ ...acceptedStatusMap, ...pendingStatusMap });

    const unsubscribeAccepted = subscribeToFollowing(
      authUserId,
      (list) => {
        acceptedStatusMap = buildFollowingStatusMap(list, FOLLOW_STATUSES.ACCEPTED);
        sync();
      },
      {
        emitCachedPayloadOnSubscribe: false,
        refreshOnSubscribe: true,
        status: FOLLOW_STATUSES.ACCEPTED,
      }
    );

    const unsubscribePending = subscribeToFollowing(
      authUserId,
      (list) => {
        pendingStatusMap = buildFollowingStatusMap(list, FOLLOW_STATUSES.PENDING);
        sync();
      },
      {
        emitCachedPayloadOnSubscribe: false,
        refreshOnSubscribe: true,
        status: FOLLOW_STATUSES.PENDING,
      }
    );

    return () => {
      unsubscribeAccepted();
      unsubscribePending();
    };
  }, [authUserId, isAuthSessionReady]);

  const shouldShowInboxTab = canManageRequests && (isLoadingRequests || requests.length > 0 || Boolean(requestsError));

  useEffect(() => {
    if (activeTab === TABS.INBOX && !shouldShowInboxTab) {
      setActiveTab(TABS.FOLLOWERS);
    }
  }, [activeTab, shouldShowInboxTab]);

  const tabs = useMemo(() => {
    const items = [
      { key: TABS.FOLLOWING, label: 'Following' },
      { key: TABS.FOLLOWERS, label: 'Followers' },
    ];

    if (shouldShowInboxTab) {
      items.push({
        key: TABS.INBOX,
        label: requests.length > 0 ? `Inbox ${requests.length}` : 'Inbox',
      });
    }

    return items;
  }, [requests.length, shouldShowInboxTab]);

  const list = activeTab === TABS.FOLLOWING ? following : activeTab === TABS.INBOX ? requests : followers;
  const isLoading =
    activeTab === TABS.FOLLOWING
      ? isLoadingFollowing
      : activeTab === TABS.INBOX
        ? isLoadingRequests
        : isLoadingFollowers;
  const activeError =
    activeTab === TABS.FOLLOWING ? followingError : activeTab === TABS.INBOX ? requestsError : followersError;

  const activeErrorMessage = activeError ? resolveCollectionErrorMessage(activeError, activeTab) : null;
  const emptyDescription = activeTab === TABS.INBOX ? 'No pending follow requests' : `No ${activeTab} yet`;

  async function runUserAction(targetUserId, actionKey, action, successMessage, errorMessage) {
    if (!authUserId || pendingActionByUserId[targetUserId]) return;

    setPendingActionByUserId((current) => ({ ...current, [targetUserId]: actionKey }));

    try {
      await action();
      toast.success(successMessage);
    } catch (error) {
      toast.error(error?.message || errorMessage);
    } finally {
      setPendingActionByUserId((current) => {
        if (!current[targetUserId]) return current;
        const next = { ...current };
        delete next[targetUserId];
        return next;
      });
    }
  }

  const handleAccept = (requesterId) =>
    runUserAction(
      requesterId,
      'accept',
      () => acceptFollowRequest(authUserId, requesterId),
      'Follow request accepted',
      'Request could not be accepted'
    );

  const handleReject = (requesterId) =>
    runUserAction(
      requesterId,
      'reject',
      () => rejectFollowRequest(authUserId, requesterId),
      'Follow request rejected',
      'Request could not be rejected'
    );

  const handleUnfollow = (targetUserId) =>
    runUserAction(
      targetUserId,
      'unfollow',
      () => unfollowUser(authUserId, targetUserId),
      'User unfollowed',
      'Could not unfollow this user'
    );

  const handleRemoveFollower = (followerId) =>
    runUserAction(
      followerId,
      'remove-follower',
      () => removeFollower(authUserId, followerId),
      'Follower removed',
      'Could not remove follower'
    );

  const handleFollow = (targetUserId) =>
    runUserAction(
      targetUserId,
      'follow',
      () => followUser(authUserId, targetUserId),
      'Follow state updated',
      'Could not follow this user'
    );

  return (
    <Container
      className="max-h-[74vh] min-h-96 w-full sm:w-[500px]"
      header={false}
      close={close}
      bodyClassName="p-0"
      footer={{
        left: (
          <span className="text-xs text-black/70">
            {list.length} {activeTab}
          </span>
        ),
      }}
    >
      <div className="flex h-full min-h-0 flex-col">
        <SegmentedControl
          value={activeTab}
          onChange={setActiveTab}
          items={tabs}
          classNames={{
            track: 'w-full gap-0 p-0! pt-3',
            wrapper: 'border-0 bg-transparent',
            button: 'flex-1 justify-center py-2 text-center text-[13px] font-semibold',
            indicator: 'bg-black',
            inactive: 'text-black/60 hover:text-black',
            active: 'text-white',
          }}
        />

        {isLoading ? (
          <LoadingList />
        ) : activeErrorMessage ? (
          <EmptyState description={activeErrorMessage} className="h-full" />
        ) : list.length === 0 ? (
          <EmptyState title="Empty" description={emptyDescription} className="h-full min-h-96" />
        ) : (
          <div className="min-h-96 flex-1 overflow-y-auto">
            {list.map((user) => (
              <SocialUserRow
                key={user.id}
                close={close}
                user={user}
                action={
                  <UserAction
                    tab={activeTab}
                    user={user}
                    authUserId={authUserId}
                    isOwnProfile={isOwnProfile}
                    pendingKind={pendingActionByUserId[user.id] || null}
                    followStatus={followingStatusMap[user.id] || null}
                    onAccept={handleAccept}
                    onReject={handleReject}
                    onUnfollow={handleUnfollow}
                    onRemoveFollower={handleRemoveFollower}
                    onFollow={handleFollow}
                  />
                }
              />
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}
