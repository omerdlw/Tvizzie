'use client';

import { useEffect, useState } from 'react';
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
import { EmptyState } from '@/ui/elements/empty-state';
import SegmentedControl from '@/ui/elements/segmented-control';
import AdaptiveImage from '@/ui/elements/adaptive-image';
import { Button } from '@/ui/elements';
import {
  DESTRUCTIVE_ACTION_TONE_CLASS,
  INFO_ACTION_TONE_CLASS,
  SUCCESS_ACTION_TONE_CLASS,
} from '@/core/constants/index';

// --------------------------------------------------
// CONSTANTS
// --------------------------------------------------

const TABS = Object.freeze({
  FOLLOWERS: 'followers',
  FOLLOWING: 'following',
  INBOX: 'inbox',
});

const ROW_BUTTON_CLASS =
  'h-8 w-auto shrink-0 rounded-[10px] border px-2.5 py-1 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:bg-black/5';

const ACTION_CLASSES = {
  ERROR: `${ROW_BUTTON_CLASS} ${DESTRUCTIVE_ACTION_TONE_CLASS}`,
  SUCCESS: `${ROW_BUTTON_CLASS} ${SUCCESS_ACTION_TONE_CLASS}`,
  INFO: `${ROW_BUTTON_CLASS} ${INFO_ACTION_TONE_CLASS}`,
};

function createCollectionState(isLoading = true) {
  return {
    list: [],
    isLoading,
    error: null,
  };
}

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

function normalizeTab(value) {
  const normalized = String(value || '').trim().toLowerCase();
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

// --------------------------------------------------
// COMPONENT LOGIC
// --------------------------------------------------

export default function AccountSocialModal({ close, data }) {
  const auth = useAuth();
  const toast = useToast();

  const authUserId = auth.user?.id || null;
  const userId = String(data?.userId || '').trim() || null;
  const canManageRequests = Boolean(data?.canManageRequests);
  const isAuthSessionReady = useAuthSessionReady(auth.isAuthenticated ? authUserId : null);
  const isOwnProfile = Boolean(authUserId) && authUserId === userId;

  // States
  const [activeTab, setActiveTab] = useState(() => normalizeTab(data?.tab || data?.type));
  const [pendingActionByUserId, setPendingActionByUserId] = useState({});
  const [followingStatusMap, setFollowingStatusMap] = useState({});

  // Collection States (list, isLoading, error birleştirildi)
  const [followersState, setFollowersState] = useState(() => createCollectionState());
  const [followingState, setFollowingState] = useState(() => createCollectionState());
  const [requestsState, setRequestsState] = useState(() =>
    createCollectionState(canManageRequests)
  );

  // Effects
  useEffect(() => {
    setActiveTab(normalizeTab(data?.tab || data?.type));
  }, [data?.tab, data?.type]);

  useEffect(() => {
    if (!userId) return setFollowersState({ list: [], isLoading: false, error: null });

    setFollowersState(createCollectionState());
    return subscribeToFollowers(
      userId,
      (list) => setFollowersState({ list: hydrateFollowUsers(list), isLoading: false, error: null }),
      {
        emitCachedPayloadOnSubscribe: false,
        refreshOnSubscribe: true,
        status: FOLLOW_STATUSES.ACCEPTED,
        onError: (error) => setFollowersState({ list: [], isLoading: false, error }),
      }
    );
  }, [userId]);

  useEffect(() => {
    if (!userId) return setFollowingState({ list: [], isLoading: false, error: null });

    setFollowingState(createCollectionState());
    return subscribeToFollowing(
      userId,
      (list) => setFollowingState({ list: hydrateFollowUsers(list), isLoading: false, error: null }),
      {
        emitCachedPayloadOnSubscribe: false,
        refreshOnSubscribe: true,
        status: FOLLOW_STATUSES.ACCEPTED,
        onError: (error) => setFollowingState({ list: [], isLoading: false, error }),
      }
    );
  }, [userId]);

  useEffect(() => {
    if (!canManageRequests || !authUserId || !isAuthSessionReady) {
      return setRequestsState({ list: [], isLoading: !isAuthSessionReady && canManageRequests, error: null });
    }

    setRequestsState({ list: [], isLoading: true, error: null });
    return subscribeToFollowers(
      authUserId,
      (list) => setRequestsState({ list: hydrateFollowUsers(list), isLoading: false, error: null }),
      {
        emitCachedPayloadOnSubscribe: false,
        refreshOnSubscribe: true,
        status: FOLLOW_STATUSES.PENDING,
        onError: (error) => setRequestsState({ list: [], isLoading: false, error }),
      }
    );
  }, [authUserId, canManageRequests, isAuthSessionReady]);

  useEffect(() => {
    if (!authUserId || !isAuthSessionReady) return setFollowingStatusMap({});

    let acceptedStatusMap = {};
    let pendingStatusMap = {};

    const sync = () => setFollowingStatusMap({ ...acceptedStatusMap, ...pendingStatusMap });

    const unsubscribeAccepted = subscribeToFollowing(
      authUserId,
      (list) => {
        acceptedStatusMap = buildFollowingStatusMap(list, FOLLOW_STATUSES.ACCEPTED);
        sync();
      },
      { emitCachedPayloadOnSubscribe: false, refreshOnSubscribe: true, status: FOLLOW_STATUSES.ACCEPTED }
    );

    const unsubscribePending = subscribeToFollowing(
      authUserId,
      (list) => {
        pendingStatusMap = buildFollowingStatusMap(list, FOLLOW_STATUSES.PENDING);
        sync();
      },
      { emitCachedPayloadOnSubscribe: false, refreshOnSubscribe: true, status: FOLLOW_STATUSES.PENDING }
    );

    return () => {
      unsubscribeAccepted();
      unsubscribePending();
    };
  }, [authUserId, isAuthSessionReady]);

  // Derived Values
  const shouldShowInboxTab = canManageRequests && (requestsState.isLoading || requestsState.list.length > 0 || Boolean(requestsState.error));

  useEffect(() => {
    if (activeTab === TABS.INBOX && !shouldShowInboxTab) setActiveTab(TABS.FOLLOWERS);
  }, [activeTab, shouldShowInboxTab]);

  const tabs = [
    { key: TABS.FOLLOWING, label: 'Following' },
    { key: TABS.FOLLOWERS, label: 'Followers' },
  ];

  if (shouldShowInboxTab) {
    tabs.push({
      key: TABS.INBOX,
      label: requestsState.list.length > 0 ? `Inbox ${requestsState.list.length}` : 'Inbox',
    });
  }

  const tabStateMap = {
    [TABS.FOLLOWERS]: followersState,
    [TABS.FOLLOWING]: followingState,
    [TABS.INBOX]: requestsState,
  };

  const activeDataState = tabStateMap[activeTab];

  const { list, isLoading, error: activeError } = activeDataState;
  const activeErrorMessage = activeError ? resolveCollectionErrorMessage(activeError, activeTab) : null;
  const emptyDescription = activeTab === TABS.INBOX ? 'No pending follow requests' : `No ${activeTab} yet`;

  // Handlers
  async function runUserAction(
    targetUserId,
    actionKey,
    actionFn,
    errorMessage
  ) {
    if (!authUserId || pendingActionByUserId[targetUserId]) {
      return;
    }

    setPendingActionByUserId((current) => ({
      ...current,
      [targetUserId]: actionKey,
    }));

    try {
      await actionFn();
    } catch (error) {
      toast.error(error?.message || errorMessage);
    } finally {
      setPendingActionByUserId((current) => {
        if (!current[targetUserId]) {
          return current;
        }

        const next = { ...current };
        delete next[targetUserId];

        return next;
      });
    }
  }

  const handleAccept = (id) =>
    runUserAction(
      id,
      'accept',
      () => acceptFollowRequest(authUserId, id),
      'Request could not be accepted'
    );

  const handleReject = (id) =>
    runUserAction(
      id,
      'reject',
      () => rejectFollowRequest(authUserId, id),
      'Request could not be rejected'
    );

  const handleUnfollow = (id) =>
    runUserAction(
      id,
      'unfollow',
      () => unfollowUser(authUserId, id),
      'Could not unfollow this user'
    );

  const handleRemoveFollower = (id) =>
    runUserAction(
      id,
      'remove-follower',
      () => removeFollower(authUserId, id),
      'Could not remove follower'
    );

  const handleFollow = (id) =>
    runUserAction(
      id,
      'follow',
      () => followUser(authUserId, id),
      'Could not follow this user'
    );

  return (
    <ModalView
      close={close}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      tabs={tabs}
      list={list}
      isLoading={isLoading}
      activeErrorMessage={activeErrorMessage}
      emptyDescription={emptyDescription}
      onAccept={handleAccept}
      onReject={handleReject}
      onUnfollow={handleUnfollow}
      onRemoveFollower={handleRemoveFollower}
      onFollow={handleFollow}
      authUserId={authUserId}
      isOwnProfile={isOwnProfile}
      pendingActionByUserId={pendingActionByUserId}
      followingStatusMap={followingStatusMap}
    />
  );
}

// --------------------------------------------------
// VIEW
// --------------------------------------------------

function ModalView({
  close,
  activeTab,
  setActiveTab,
  tabs,
  list,
  isLoading,
  activeErrorMessage,
  emptyDescription,
  actions,
  authUserId,
  isOwnProfile,
  pendingActionByUserId,
  followingStatusMap,
}) {
  return (
    <Container
      className="max-h-[74vh] min-h-96 w-full sm:w-[500px]"
      close={close}
      bodyClassName="p-0"
      header={
        <SegmentedControl
          value={activeTab}
          onChange={setActiveTab}
          items={tabs}
          classNames={{
            wrapper: 'bg-transparent border-none',
            button: 'flex-1 justify-center rounded-[16px] px-4 py-2 text-[13px]',
            indicator: 'rounded-[16px] bg-black',
            inactive: 'text-black/50 hover:text-black',
            active: 'text-white font-semibold',
          }}
        />
      }
    >
      <div className="flex h-full min-h-0 flex-col">
        {isLoading ? (
          <LoadingList />
        ) : activeErrorMessage ? (
          <EmptyState description={activeErrorMessage} className="h-full" />
        ) : list.length === 0 ? (
          <EmptyState description={emptyDescription} className="h-full min-h-96" />
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
                    actions={actions}
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
        <AdaptiveImage
          mode="img"
          src={avatarSrc}
          alt={user.displayName}
          loading="lazy"
          decoding="async"
          className="size-10 shrink-0 rounded-[10px] object-cover"
          onError={(event) => applyAvatarFallback(event, avatarFallbackSrc)}
          wrapperClassName="size-10 shrink-0 rounded-[10px]"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{user.displayName}</p>
          <p className="truncate text-[11px] text-black/50">@{user.username || 'username'}</p>
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
        <Button onClick={() => onAccept(user.id)} disabled={isPending} className={ACTION_CLASSES.SUCCESS}>
          {pendingKind === 'accept' ? 'Accepting' : 'Accept'}
        </Button>
        <Button onClick={() => onReject(user.id)} disabled={isPending} className={ACTION_CLASSES.ERROR}>
          {pendingKind === 'reject' ? 'Rejecting' : 'Reject'}
        </Button>
      </div>
    );
  }

  if (tab === TABS.FOLLOWING && isOwnProfile) {
    return (
      <Button onClick={() => onUnfollow(user.id)} disabled={isPending} className={ACTION_CLASSES.ERROR}>
        {pendingKind === 'unfollow' ? 'Unfollowing' : 'Unfollow'}
      </Button>
    );
  }

  if (tab === TABS.FOLLOWERS && isOwnProfile) {
    return (
      <Button onClick={() => onRemoveFollower(user.id)} disabled={isPending} className={ACTION_CLASSES.ERROR}>
        {pendingKind === 'remove-follower' ? 'Removing' : 'Remove'}
      </Button>
    );
  }

  if (canShowFollowAction) {
    const isFollowPending =
      followStatus === FOLLOW_STATUSES.PENDING;

    const followLabel =
      pendingKind === 'follow'
        ? 'Updating'
        : isFollowPending
          ? 'Requested'
          : 'Follow';

    return (
      <Button
        onClick={() => onFollow(user.id)}
        disabled={isFollowPending || isPending}
        className={ACTION_CLASSES.INFO}
      >
        {followLabel}
      </Button>
    );
  }

  return null;
}

function LoadingList() {
  return (
    <div>
      {Array.from({ length: 10 }, (_, index) => (
        <div key={index} className="flex items-center gap-3 border-b border-black/10 p-3 last:border-none lg:p-4">
          <div className="size-10 shrink-0 animate-pulse rounded-[10px] bg-black/5" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-3 w-3/5 animate-pulse rounded-[10px] bg-black/5" />
            <div className="h-2 w-2/5 animate-pulse rounded-[10px] bg-black/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
