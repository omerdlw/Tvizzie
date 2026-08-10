'use client';

import { useEffect, useState, useCallback, memo, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth, useAuthSessionReady } from '@/modules/auth';
import { Container } from '@/modules/modal';
import { useToast } from '@/modules/notification';
import {
  FOLLOW_STATUSES,
  acceptFollowRequest,
  followUser,
  removeFollower,
  rejectFollowRequest,
  subscribeToFollowers,
  subscribeToFollowing,
  unfollowUser,
} from '@/domains/social/client/follows';
import {
  applyAvatarFallback,
  getUserAvatarFallbackUrl,
  getUserAvatarUrl,
} from '@/domains/account/utils';
import { EmptyState } from '@/ui/feedback/empty-state';
import SegmentedControl from '@/ui/primitives/segmented-control';
import AdaptiveImage from '@/ui/primitives/adaptive-image';
import {
  DESTRUCTIVE_ACTION_TONE_CLASS,
  INFO_ACTION_TONE_CLASS,
  SUCCESS_ACTION_TONE_CLASS,
} from '@/shared/constants/index';

const TABS = Object.freeze({
  FOLLOWERS: 'followers',
  FOLLOWING: 'following',
  INBOX: 'inbox',
});

const ROW_BUTTON_CLASS =
  'h-8 w-auto shrink-0 transition-colors duration-150 ease-in-out rounded-xl border px-2.5 py-1 text-[11px] font-semibold disabled:cursor-not-allowed disabled:bg-black/5';

const ACTION_CLASSES = Object.freeze({
  ERROR: `${ROW_BUTTON_CLASS}${DESTRUCTIVE_ACTION_TONE_CLASS}`,
  SUCCESS: `${ROW_BUTTON_CLASS}${SUCCESS_ACTION_TONE_CLASS}`,
  INFO: `${ROW_BUTTON_CLASS}${INFO_ACTION_TONE_CLASS}`,
});

function createCollectionState(isLoading = true) {
  return { list: [], isLoading, error: null };
}

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
    return tab === TABS.INBOX
      ? 'You are not allowed to view pending follow requests.'
      : 'This profile is private.';
  }
  if (status === 401) {
    return 'Your session has expired. Please sign in again.';
  }
  return tab === TABS.INBOX
    ? 'Pending follow requests could not be loaded.'
    : `Could not load ${tab}.`;
}

function buildFollowingStatusMap(list = [], fallbackStatus = FOLLOW_STATUSES.ACCEPTED) {
  return (Array.isArray(list) ? list : []).reduce((acc, item) => {
    const id = item?.userId || item?.id;
    if (id) acc[id] = item?.status || fallbackStatus;
    return acc;
  }, {});
}

const UserAction = memo(function UserAction({
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
        <motion.button
          type="button"
          onClick={() => onAccept(user.id)}
          disabled={isPending}
          whileHover={{ scale: 1.012 }}
          whileTap={{ scale: 0.97 }}
          className={ACTION_CLASSES.SUCCESS}
          aria-label={`Accept follow request from ${user.displayName}`}
        >
          {pendingKind === 'accept' ? 'Accepting' : 'Accept'}
        </motion.button>
        <motion.button
          type="button"
          onClick={() => onReject(user.id)}
          disabled={isPending}
          whileHover={{ scale: 1.012 }}
          whileTap={{ scale: 0.97 }}
          className={ACTION_CLASSES.ERROR}
          aria-label={`Reject follow request from ${user.displayName}`}
        >
          {pendingKind === 'reject' ? 'Rejecting' : 'Reject'}
        </motion.button>
      </div>
    );
  }

  if (tab === TABS.FOLLOWING && isOwnProfile) {
    return (
      <motion.button
        type="button"
        onClick={() => onUnfollow(user.id)}
        disabled={isPending}
        whileHover={{ scale: 1.012 }}
        whileTap={{ scale: 0.97 }}
        className={ACTION_CLASSES.ERROR}
        aria-label={`Unfollow ${user.displayName}`}
      >
        {pendingKind === 'unfollow' ? 'Unfollowing' : 'Unfollow'}
      </motion.button>
    );
  }

  if (tab === TABS.FOLLOWERS && isOwnProfile) {
    return (
      <motion.button
        type="button"
        onClick={() => onRemoveFollower(user.id)}
        disabled={isPending}
        whileHover={{ scale: 1.012 }}
        whileTap={{ scale: 0.97 }}
        className={ACTION_CLASSES.ERROR}
        aria-label={`Remove ${user.displayName} from followers`}
      >
        {pendingKind === 'remove-follower' ? 'Removing' : 'Remove'}
      </motion.button>
    );
  }

  if (canShowFollowAction) {
    const isFollowPending = followStatus === FOLLOW_STATUSES.PENDING;
    const followLabel =
      pendingKind === 'follow' ? 'Updating' : isFollowPending ? 'Requested' : 'Follow';
    return (
      <motion.button
        type="button"
        onClick={() => onFollow(user.id)}
        disabled={isFollowPending || isPending}
        whileHover={{ scale: 1.012 }}
        whileTap={{ scale: 0.97 }}
        className={ACTION_CLASSES.INFO}
        aria-label={`Follow ${user.displayName}`}
      >
        {followLabel}
      </motion.button>
    );
  }

  return null;
});

const SocialUserRow = memo(function SocialUserRow({ close, user, action, index }) {
  const avatarSrc = getUserAvatarUrl(user);
  const avatarFallbackSrc = getUserAvatarFallbackUrl(user);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.24, 1], delay: Math.min(index * 0.02, 0.12) }}
      whileHover={{ x: 2 }}
      className="flex items-center justify-between gap-3 border-b border-black/5 p-3 transition-colors duration-150 ease-in-out last:border-none hover:bg-white lg:p-4"
    >
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
          className="size-10 shrink-0 rounded-xl object-cover"
          onError={(event) => applyAvatarFallback(event, avatarFallbackSrc)}
          wrapperClassName="size-10 shrink-0"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{user.displayName}</p>
          <p className="truncate text-[11px] text-black/50">@{user.username || 'username'}</p>
        </div>
      </Link>
      {action}
    </motion.div>
  );
});

export default function AccountSocialModal({ close, data }) {
  const auth = useAuth();
  const toast = useToast();
  const authUserId = auth.user?.id || null;
  const userId = String(data?.userId || '').trim() || null;
  const canManageRequests = Boolean(data?.canManageRequests);
  const isAuthSessionReady = useAuthSessionReady(auth.isAuthenticated ? authUserId : null);
  const isOwnProfile = Boolean(authUserId) && authUserId === userId;

  const [activeTab, setActiveTab] = useState(() => normalizeTab(data?.tab || data?.type));
  const [pendingActionByUserId, setPendingActionByUserId] = useState({});
  const [followingStatusMap, setFollowingStatusMap] = useState({});

  const [followersState, setFollowersState] = useState(() => createCollectionState());
  const [followingState, setFollowingState] = useState(() => createCollectionState());
  const [requestsState, setRequestsState] = useState(() =>
    createCollectionState(canManageRequests),
  );

  useEffect(() => {
    setActiveTab(normalizeTab(data?.tab || data?.type));
  }, [data?.tab, data?.type]);

  useEffect(() => {
    if (!userId) {
      setFollowersState({ list: [], isLoading: false, error: null });
      return;
    }
    setFollowersState(createCollectionState());
    return subscribeToFollowers(
      userId,
      (list) =>
        setFollowersState({ list: hydrateFollowUsers(list), isLoading: false, error: null }),
      {
        emitCachedPayloadOnSubscribe: false,
        refreshOnSubscribe: true,
        status: FOLLOW_STATUSES.ACCEPTED,
        onError: (error) => setFollowersState({ list: [], isLoading: false, error }),
      },
    );
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setFollowingState({ list: [], isLoading: false, error: null });
      return;
    }
    setFollowingState(createCollectionState());
    return subscribeToFollowing(
      userId,
      (list) =>
        setFollowingState({ list: hydrateFollowUsers(list), isLoading: false, error: null }),
      {
        emitCachedPayloadOnSubscribe: false,
        refreshOnSubscribe: true,
        status: FOLLOW_STATUSES.ACCEPTED,
        onError: (error) => setFollowingState({ list: [], isLoading: false, error }),
      },
    );
  }, [userId]);

  useEffect(() => {
    if (!canManageRequests || !authUserId || !isAuthSessionReady) {
      setRequestsState({
        list: [],
        isLoading: !isAuthSessionReady && canManageRequests,
        error: null,
      });
      return;
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
      },
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
      {
        emitCachedPayloadOnSubscribe: false,
        refreshOnSubscribe: true,
        status: FOLLOW_STATUSES.ACCEPTED,
      },
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
      },
    );

    return () => {
      unsubscribeAccepted();
      unsubscribePending();
    };
  }, [authUserId, isAuthSessionReady]);

  const runUserAction = useCallback(
    async (targetUserId, actionKey, actionFn, errorMessage) => {
      if (!authUserId || pendingActionByUserId[targetUserId]) return;
      setPendingActionByUserId((current) => ({ ...current, [targetUserId]: actionKey }));
      try {
        await actionFn();
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
    },
    [authUserId, pendingActionByUserId, toast],
  );

  const handleAccept = useCallback(
    (id) =>
      runUserAction(
        id,
        'accept',
        () => acceptFollowRequest(authUserId, id),
        'Request could not be accepted',
      ),
    [authUserId, runUserAction],
  );
  const handleReject = useCallback(
    (id) =>
      runUserAction(
        id,
        'reject',
        () => rejectFollowRequest(authUserId, id),
        'Request could not be rejected',
      ),
    [authUserId, runUserAction],
  );
  const handleUnfollow = useCallback(
    (id) =>
      runUserAction(
        id,
        'unfollow',
        () => unfollowUser(authUserId, id),
        'Could not unfollow this user',
      ),
    [authUserId, runUserAction],
  );
  const handleRemoveFollower = useCallback(
    (id) =>
      runUserAction(
        id,
        'remove-follower',
        () => removeFollower(authUserId, id),
        'Could not remove follower',
      ),
    [authUserId, runUserAction],
  );
  const handleFollow = useCallback(
    (id) =>
      runUserAction(id, 'follow', () => followUser(authUserId, id), 'Could not follow this user'),
    [authUserId, runUserAction],
  );

  const shouldShowInboxTab =
    canManageRequests &&
    (requestsState.isLoading || requestsState.list.length > 0 || Boolean(requestsState.error));

  const tabs = useMemo(() => {
    const list = [
      { key: TABS.FOLLOWING, label: 'Following' },
      { key: TABS.FOLLOWERS, label: 'Followers' },
    ];
    if (shouldShowInboxTab) {
      list.push({
        key: TABS.INBOX,
        label: requestsState.list.length > 0 ? `Inbox (${requestsState.list.length})` : 'Inbox',
      });
    }
    return list;
  }, [shouldShowInboxTab, requestsState.list.length]);

  const tabStateMap = useMemo(
    () => ({
      [TABS.FOLLOWERS]: followersState,
      [TABS.FOLLOWING]: followingState,
      [TABS.INBOX]: requestsState,
    }),
    [followersState, followingState, requestsState],
  );

  const activeDataState = tabStateMap[activeTab] || followersState;
  const { list, isLoading, error: activeError } = activeDataState;
  const activeErrorMessage = activeError
    ? resolveCollectionErrorMessage(activeError, activeTab)
    : null;
  const emptyDescription =
    activeTab === TABS.INBOX ? 'No pending follow requests' : `No ${activeTab} yet`;

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
            button: 'flex-1 justify-center px-4 py-2 text-[13px]',
            indicator: 'bg-black',
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
            {list.map((user, index) => (
              <SocialUserRow
                key={user.id}
                close={close}
                user={user}
                index={index}
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

function LoadingList() {
  return (
    <div>
      {Array.from({ length: 8 }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 border-b border-black/10 p-3 last:border-none lg:p-4"
        >
          <div className="size-10 shrink-0 animate-pulse rounded-xl bg-black/5" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-3 w-3/5 animate-pulse rounded bg-black/5" />
            <div className="h-2 w-2/5 animate-pulse rounded bg-black/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
