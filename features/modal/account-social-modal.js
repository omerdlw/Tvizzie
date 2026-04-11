'use client';

import { useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import { EmptyState } from '@/features/shared/empty-state';
import { applyAvatarFallback, getUserAvatarFallbackUrl, getUserAvatarUrl } from '@/core/utils';
import { useAuth, useAuthSessionReady } from '@/core/modules/auth';
import Container from '@/core/modules/modal/container';
import SegmentedControl from '@/features/shared/segmented-control';
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
import { Button } from '@/ui/elements';

const TABS = Object.freeze({
  FOLLOWERS: 'followers',
  FOLLOWING: 'following',
  INBOX: 'inbox',
});

function normalizeTab(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();

  if (normalized === 'following') return TABS.FOLLOWING;
  if (normalized === 'requests') return TABS.INBOX;
  if (normalized === TABS.INBOX) return TABS.INBOX;
  return TABS.FOLLOWERS;
}

async function hydrateFollowUsers(list) {
  return (list || [])
    .map((item) => ({
      avatarUrl: item.avatarUrl || null,
      displayName: item.displayName || item.username || 'Anonymous User',
      id: item.userId || item.id,
      status: item.status || FOLLOW_STATUSES.ACCEPTED,
      username: item.username || null,
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
  return (Array.isArray(list) ? list : []).reduce((accumulator, item) => {
    const targetUserId = item?.userId || item?.id;

    if (!targetUserId) {
      return accumulator;
    }

    accumulator[targetUserId] = item?.status || fallbackStatus;
    return accumulator;
  }, {});
}

function SocialUserRow({ close, user, children }) {
  const avatarSrc = getUserAvatarUrl(user);
  const avatarFallbackSrc = getUserAvatarFallbackUrl(user);

  return (
    <div className="flex items-center justify-between gap-3 border-b border-black/10 p-3 transition-colors last:border-none hover:bg-black/5 lg:p-4">
      <Link
        className="flex min-w-0 flex-1 items-center gap-2.5"
        href={`/account/${user.username || user.id}`}
        onClick={close}
      >
        <img
          src={avatarSrc}
          alt={user.displayName}
          className="size-10 shrink-0 overflow-hidden rounded-[10px] object-cover"
          onError={(event) => applyAvatarFallback(event, avatarFallbackSrc)}
        />
        <div className="w-full">
          <p className={`truncate text-sm font-semibold`}>{user.displayName}</p>
          <p className="truncate text-[11px] text-black/70">@{user.username || 'user'}</p>
        </div>
      </Link>
      {children}
    </div>
  );
}

export default function AccountSocialModal({ close, data, header }) {
  const auth = useAuth();
  const isAuthSessionReady = useAuthSessionReady(auth.isAuthenticated ? auth.user?.id || null : null);
  const toast = useToast();
  const userId = String(data?.userId || '').trim() || null;
  const canManageRequests = Boolean(data?.canManageRequests);
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

  useEffect(() => {
    setActiveTab(normalizeTab(data?.tab || data?.type));
  }, [data?.tab, data?.type]);

  useEffect(() => {
    if (!userId) {
      setFollowers([]);
      setIsLoadingFollowers(false);
      setFollowersError(null);
      return undefined;
    }

    setFollowers([]);
    setIsLoadingFollowers(true);
    setFollowersError(null);
    return subscribeToFollowers(
      userId,
      async (list) => {
        const hydrated = await hydrateFollowUsers(list);
        setFollowers(hydrated);
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
      return undefined;
    }

    setFollowing([]);
    setIsLoadingFollowing(true);
    setFollowingError(null);
    return subscribeToFollowing(
      userId,
      async (list) => {
        const hydrated = await hydrateFollowUsers(list);
        setFollowing(hydrated);
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
    if (!canManageRequests || !auth.user?.id) {
      setRequests([]);
      setIsLoadingRequests(false);
      setRequestsError(null);
      return undefined;
    }

    if (!isAuthSessionReady) {
      setRequests([]);
      setIsLoadingRequests(true);
      setRequestsError(null);
      return undefined;
    }

    setRequests([]);
    setIsLoadingRequests(true);
    setRequestsError(null);
    return subscribeToFollowers(
      auth.user.id,
      async (list) => {
        const hydrated = await hydrateFollowUsers(list);
        setRequests(hydrated);
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
  }, [auth.user?.id, canManageRequests, isAuthSessionReady]);

  useEffect(() => {
    if (!auth.user?.id || !isAuthSessionReady) {
      setFollowingStatusMap({});
      return undefined;
    }

    let acceptedStatusMap = {};
    let pendingStatusMap = {};

    const syncStatusMap = () => {
      setFollowingStatusMap({
        ...acceptedStatusMap,
        ...pendingStatusMap,
      });
    };

    const unsubscribeAccepted = subscribeToFollowing(
      auth.user.id,
      (list) => {
        acceptedStatusMap = buildFollowingStatusMap(list, FOLLOW_STATUSES.ACCEPTED);
        syncStatusMap();
      },
      {
        emitCachedPayloadOnSubscribe: false,
        refreshOnSubscribe: true,
        status: FOLLOW_STATUSES.ACCEPTED,
      }
    );

    const unsubscribePending = subscribeToFollowing(
      auth.user.id,
      (list) => {
        pendingStatusMap = buildFollowingStatusMap(list, FOLLOW_STATUSES.PENDING);
        syncStatusMap();
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
  }, [auth.user?.id, isAuthSessionReady]);

  const shouldShowInboxTab = canManageRequests && (isLoadingRequests || requests.length > 0 || Boolean(requestsError));
  const isOwnProfile = Boolean(auth.user?.id) && auth.user.id === userId;

  useEffect(() => {
    if (activeTab === TABS.INBOX && !shouldShowInboxTab) {
      setActiveTab(TABS.FOLLOWERS);
    }
  }, [activeTab, shouldShowInboxTab]);

  const tabs = useMemo(() => {
    const baseTabs = [
      { key: TABS.FOLLOWING, label: 'Following' },
      { key: TABS.FOLLOWERS, label: 'Followers' },
    ];

    if (shouldShowInboxTab) {
      baseTabs.push({
        key: TABS.INBOX,
        label: requests.length > 0 ? `Inbox ${requests.length}` : 'Inbox',
      });
    }

    return baseTabs;
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

  const handleAccept = async (requesterId) => {
    if (!auth.user?.id || pendingActionByUserId[requesterId]) return;

    setPendingActionByUserId((current) => ({
      ...current,
      [requesterId]: 'accept',
    }));

    try {
      await acceptFollowRequest(auth.user.id, requesterId);
      toast.success('Follow request accepted');
    } catch (error) {
      toast.error(error?.message || 'Request could not be accepted');
    } finally {
      setPendingActionByUserId((current) => {
        if (!current[requesterId]) {
          return current;
        }

        const next = { ...current };
        delete next[requesterId];
        return next;
      });
    }
  };

  const handleReject = async (requesterId) => {
    if (!auth.user?.id || pendingActionByUserId[requesterId]) return;

    setPendingActionByUserId((current) => ({
      ...current,
      [requesterId]: 'reject',
    }));

    try {
      await rejectFollowRequest(auth.user.id, requesterId);
      toast.success('Follow request rejected');
    } catch (error) {
      toast.error(error?.message || 'Request could not be rejected');
    } finally {
      setPendingActionByUserId((current) => {
        if (!current[requesterId]) {
          return current;
        }

        const next = { ...current };
        delete next[requesterId];
        return next;
      });
    }
  };

  const handleUnfollow = async (targetUserId) => {
    if (!auth.user?.id || pendingActionByUserId[targetUserId]) return;

    setPendingActionByUserId((current) => ({
      ...current,
      [targetUserId]: 'unfollow',
    }));

    try {
      await unfollowUser(auth.user.id, targetUserId);
      toast.success('User unfollowed');
    } catch (error) {
      toast.error(error?.message || 'Could not unfollow this user');
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
  };

  const handleRemoveFollower = async (followerId) => {
    if (!auth.user?.id || pendingActionByUserId[followerId]) return;

    setPendingActionByUserId((current) => ({
      ...current,
      [followerId]: 'remove-follower',
    }));

    try {
      await removeFollower(auth.user.id, followerId);
      toast.success('Follower removed');
    } catch (error) {
      toast.error(error?.message || 'Could not remove follower');
    } finally {
      setPendingActionByUserId((current) => {
        if (!current[followerId]) {
          return current;
        }

        const next = { ...current };
        delete next[followerId];
        return next;
      });
    }
  };

  const handleFollow = async (targetUserId) => {
    if (!auth.user?.id || pendingActionByUserId[targetUserId]) return;

    setPendingActionByUserId((current) => ({
      ...current,
      [targetUserId]: 'follow',
    }));

    try {
      await followUser(auth.user.id, targetUserId);
      toast.success('Follow state updated');
    } catch (error) {
      toast.error(error?.message || 'Could not follow this user');
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
  };

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
          items={tabs}
          value={activeTab}
          onChange={setActiveTab}
          className="w-full"
          trackClassName="w-full h-11 m-1 p-1 border-none"
          buttonClassName="flex-1 h-full justify-center tracking-wide uppercase text-[11px]"
          activeClassName="text-white"
          activeIndicatorClassName="bg-black"
        />
        {isLoading ? (
          <div className="flex flex-col">
            {Array.from({ length: 10 }, (_, index) => index + 1).map((item) => (
              <div
                key={item}
                className="flex items-center justify-between gap-3 border-b border-black/10 p-3 last:border-none lg:p-4"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <div className="size-10 shrink-0 animate-pulse rounded-[10px] bg-black/5" />
                  <div className="flex w-full flex-col gap-1.5">
                    <div className="h-3 w-[60%] animate-pulse rounded-full bg-black/5" />
                    <div className="h-2 w-[40%] animate-pulse rounded-full bg-black/5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : activeErrorMessage ? (
          <EmptyState description={activeErrorMessage} className="h-full" />
        ) : list.length === 0 ? (
          <EmptyState title="Empty" description={emptyDescription} className="h-full min-h-96" />
        ) : (
          <div className="min-h-96 flex-1 overflow-y-auto rounded-t-[12px]">
            {list.map((user) => (
              <SocialUserRow key={user.id} close={close} user={user}>
                {(() => {
                  const pendingKind = pendingActionByUserId[user.id] || null;
                  const isActionPending = Boolean(pendingKind);
                  const followStatus = followingStatusMap[user.id] || null;
                  const canShowFollowAction =
                    activeTab !== TABS.INBOX &&
                    !isOwnProfile &&
                    Boolean(auth.user?.id) &&
                    auth.user.id !== user.id &&
                    followStatus !== FOLLOW_STATUSES.ACCEPTED;
                  const followLabel = followStatus === FOLLOW_STATUSES.PENDING ? 'Requested' : 'Follow';
                  const isFollowDisabled = followStatus === FOLLOW_STATUSES.PENDING || isActionPending;

                  if (activeTab === TABS.INBOX) {
                    return (
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleAccept(user.id)}
                          disabled={isActionPending}
                          className="border-success/15 bg-success/5 text-success hover:bg-success/15 h-8 w-auto shrink-0 rounded-[10px] border px-2.5 py-1 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:bg-black/5"
                        >
                          {pendingKind === 'accept' ? 'Accepting' : 'Accept'}
                        </Button>
                        <Button
                          onClick={() => handleReject(user.id)}
                          disabled={isActionPending}
                          className="border-error/15 bg-error/5 text-error hover:bg-error/15 h-8 w-auto shrink-0 rounded-[10px] border px-2.5 py-1 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:bg-black/5"
                        >
                          {pendingKind === 'reject' ? 'Rejecting' : 'Reject'}
                        </Button>
                      </div>
                    );
                  }

                  if (activeTab === TABS.FOLLOWING && isOwnProfile) {
                    return (
                      <Button
                        onClick={() => handleUnfollow(user.id)}
                        disabled={isActionPending}
                        className="border-error/15 bg-error/5 text-error hover:bg-error/15 h-8 w-auto shrink-0 rounded-[10px] border px-2.5 py-1 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:bg-black/5"
                      >
                        {pendingKind === 'unfollow' ? 'Unfollowing' : 'Unfollow'}
                      </Button>
                    );
                  }

                  if (activeTab === TABS.FOLLOWERS && isOwnProfile) {
                    return (
                      <Button
                        onClick={() => handleRemoveFollower(user.id)}
                        disabled={isActionPending}
                        className="border-error/15 bg-error/5 text-error hover:bg-error/15 h-8 w-auto shrink-0 rounded-[10px] border px-2.5 py-1 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:bg-black/5"
                      >
                        {pendingKind === 'remove-follower' ? 'Removing' : 'Remove'}
                      </Button>
                    );
                  }

                  if (canShowFollowAction) {
                    return (
                      <Button
                        onClick={() => handleFollow(user.id)}
                        disabled={isFollowDisabled}
                        className="border-info/15 bg-info/5 text-info hover:bg-info/15 h-8 w-auto shrink-0 rounded-[10px] border px-2.5 py-1 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:bg-black/5"
                      >
                        {pendingKind === 'follow' ? 'Updating' : followLabel}
                      </Button>
                    );
                  }

                  return null;
                })()}
              </SocialUserRow>
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}
