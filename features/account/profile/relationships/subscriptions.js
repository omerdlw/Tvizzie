import { FOLLOW_STATUSES, subscribeToFollowers, subscribeToFollowing } from '@/core/services/social/follows.service';

export function subscribeToAcceptedFollowCounts({
  followPollingOptions,
  publicFollowerCount,
  publicFollowingCount,
  resolvedUserId,
  setFollowerCount,
  setFollowingCount,
}) {
  setFollowerCount(publicFollowerCount);
  setFollowingCount(publicFollowingCount);

  const unsubFollowers = subscribeToFollowers(
    resolvedUserId,
    (followers) => {
      setFollowerCount(followers.length);
    },
    {
      ...followPollingOptions,
      onError: () => {
        setFollowerCount(publicFollowerCount);
      },
      status: FOLLOW_STATUSES.ACCEPTED,
    }
  );

  const unsubFollowing = subscribeToFollowing(
    resolvedUserId,
    (following) => {
      setFollowingCount(following.length);
    },
    {
      ...followPollingOptions,
      onError: () => {
        setFollowingCount(publicFollowingCount);
      },
      status: FOLLOW_STATUSES.ACCEPTED,
    }
  );

  return [unsubFollowers, unsubFollowing];
}

export function subscribeToPublicFollowCounts({
  followPollingOptions,
  publicFollowerCount,
  publicFollowingCount,
  resolvedUserId,
  setFollowerCount,
  setFollowingCount,
}) {
  const unsubFollowers = subscribeToFollowers(
    resolvedUserId,
    (followers) => {
      setFollowerCount(followers.length);
    },
    {
      ...followPollingOptions,
      onError: () => {
        setFollowerCount(publicFollowerCount);
      },
    }
  );

  const unsubFollowing = subscribeToFollowing(
    resolvedUserId,
    (following) => {
      setFollowingCount(following.length);
    },
    {
      ...followPollingOptions,
      onError: () => {
        setFollowingCount(publicFollowingCount);
      },
    }
  );

  return [unsubFollowers, unsubFollowing];
}

export function subscribeToPendingFollowers({
  canManageRequests,
  followPollingOptions,
  resolvedUserId,
  setPendingFollowRequestCount,
}) {
  if (!canManageRequests) {
    setPendingFollowRequestCount(0);
    return () => {};
  }

  return subscribeToFollowers(
    resolvedUserId,
    (requests) => {
      setPendingFollowRequestCount(requests.length);
    },
    {
      ...followPollingOptions,
      enablePendingFallback: false,
      onError: () => {
        setPendingFollowRequestCount(0);
      },
      status: FOLLOW_STATUSES.PENDING,
    }
  );
}
