'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  getAccountSocialProof,
} from '@/domains/media/client/social-proof';
import {
  FOLLOW_STATUSES,
  primeFollowRelationshipState,
  subscribeToFollowRelationship,
  subscribeToFollowers,
  subscribeToFollowing,
} from '@/domains/social/client/follows';
import {
  logDataError,
} from '@/domains/account/utils/validation';

export function useAccountRelationshipData({
  authIsReady,
  authUserId,
  canManageRequests,
  initialFollowRelationship = null,
  isOwner,
  isPrivateProfile,
  isProfileLoaded,
  publicFollowerCount = 0,
  publicFollowingCount = 0,
  resolvedUserId,
}) {
  const [followRelationship, setFollowRelationship] = useState(() => ({
    canViewPrivateContent: initialFollowRelationship?.canViewPrivateContent ?? false,
    inboundStatus: initialFollowRelationship?.inboundStatus ?? null,
    isInboundRelationshipLoaded: Boolean(
      initialFollowRelationship?.isInboundRelationshipLoaded ?? initialFollowRelationship,
    ),
    isOutboundRelationshipLoaded: Boolean(
      initialFollowRelationship?.isOutboundRelationshipLoaded ?? initialFollowRelationship,
    ),
    isPrivateProfile: initialFollowRelationship?.isPrivateProfile ?? Boolean(isPrivateProfile),
    isTargetProfileLoaded: Boolean(
      initialFollowRelationship?.isTargetProfileLoaded ?? isProfileLoaded,
    ),
    outboundStatus: initialFollowRelationship?.outboundStatus ?? null,
    showFollowBack: initialFollowRelationship?.showFollowBack ?? false,
  }));
  const [followerCount, setFollowerCount] = useState(publicFollowerCount);
  const [followingCount, setFollowingCount] = useState(publicFollowingCount);
  const [pendingFollowRequestCount, setPendingFollowRequestCount] = useState(0);

  const followPollingOptions = useMemo(() => ({ hiddenIntervalMs: 60000, intervalMs: 15000 }), []);

  useEffect(() => {
    if (initialFollowRelationship && authUserId && resolvedUserId) {
      primeFollowRelationshipState(authUserId, resolvedUserId, initialFollowRelationship);
    }
  }, [authUserId, initialFollowRelationship, resolvedUserId]);

  useEffect(() => {
    if (!resolvedUserId || !authIsReady) {
      setFollowRelationship({
        canViewPrivateContent: false,
        inboundStatus: null,
        isInboundRelationshipLoaded: false,
        isOutboundRelationshipLoaded: false,
        isPrivateProfile: false,
        isTargetProfileLoaded: false,
        outboundStatus: null,
        showFollowBack: false,
      });
      return undefined;
    }

    if (isOwner) {
      setFollowRelationship({
        canViewPrivateContent: true,
        inboundStatus: null,
        isInboundRelationshipLoaded: true,
        isOutboundRelationshipLoaded: true,
        isPrivateProfile: Boolean(isPrivateProfile),
        isTargetProfileLoaded: true,
        outboundStatus: null,
        showFollowBack: false,
      });
      return undefined;
    }

    return subscribeToFollowRelationship(
      authUserId || null,
      resolvedUserId,
      (rel) => setFollowRelationship(rel),
      followPollingOptions,
    );
  }, [authIsReady, authUserId, followPollingOptions, isOwner, isPrivateProfile, resolvedUserId]);

  useEffect(() => {
    if (!resolvedUserId || !authIsReady) {
      setFollowerCount(0);
      setFollowingCount(0);
      setPendingFollowRequestCount(0);
      return undefined;
    }

    const hasKnownPrivacyState =
      isOwner || isProfileLoaded || followRelationship.isTargetProfileLoaded;
    const resolvedIsPrivateProfile = isProfileLoaded
      ? isPrivateProfile
      : followRelationship.isPrivateProfile;

    if (
      !hasKnownPrivacyState ||
      (!isOwner && resolvedIsPrivateProfile && !followRelationship.canViewPrivateContent)
    ) {
      setFollowerCount(publicFollowerCount);
      setFollowingCount(publicFollowingCount);
      setPendingFollowRequestCount(0);
      return undefined;
    }

    if (isOwner) {
      setFollowerCount(publicFollowerCount);
      setFollowingCount(publicFollowingCount);

      const unsubFollowers = subscribeToFollowers(
        resolvedUserId,
        (f) => setFollowerCount(f.length),
        {
          ...followPollingOptions,
          onError: () => setFollowerCount(publicFollowerCount),
          status: FOLLOW_STATUSES.ACCEPTED,
        },
      );
      const unsubFollowing = subscribeToFollowing(
        resolvedUserId,
        (f) => setFollowingCount(f.length),
        {
          ...followPollingOptions,
          onError: () => setFollowingCount(publicFollowingCount),
          status: FOLLOW_STATUSES.ACCEPTED,
        },
      );
      const unsubPending = canManageRequests
        ? subscribeToFollowers(
            resolvedUserId,
            (reqs) => setPendingFollowRequestCount(reqs.length),
            {
              ...followPollingOptions,
              enablePendingFallback: false,
              onError: () => setPendingFollowRequestCount(0),
              status: FOLLOW_STATUSES.PENDING,
            },
          )
        : () => {};

      return () => {
        unsubFollowers();
        unsubFollowing();
        unsubPending();
      };
    }

    const unsubFollowers = subscribeToFollowers(resolvedUserId, (f) => setFollowerCount(f.length), {
      ...followPollingOptions,
      onError: () => setFollowerCount(publicFollowerCount),
    });
    const unsubFollowing = subscribeToFollowing(
      resolvedUserId,
      (f) => setFollowingCount(f.length),
      { ...followPollingOptions, onError: () => setFollowingCount(publicFollowingCount) },
    );
    const unsubPending = canManageRequests
      ? subscribeToFollowers(resolvedUserId, (reqs) => setPendingFollowRequestCount(reqs.length), {
          ...followPollingOptions,
          enablePendingFallback: false,
          onError: () => setPendingFollowRequestCount(0),
          status: FOLLOW_STATUSES.PENDING,
        })
      : () => {};

    return () => {
      unsubFollowers();
      unsubFollowing();
      unsubPending();
    };
  }, [
    authIsReady,
    canManageRequests,
    followRelationship.canViewPrivateContent,
    followRelationship.isPrivateProfile,
    followRelationship.isTargetProfileLoaded,
    followPollingOptions,
    isOwner,
    isPrivateProfile,
    isProfileLoaded,
    publicFollowerCount,
    publicFollowingCount,
    resolvedUserId,
  ]);

  return {
    followerCount,
    setFollowerCount,
    followingCount,
    setFollowingCount,
    followRelationship,
    setFollowRelationship,
    pendingFollowRequestCount,
  };
}

export function useAccountSocialProof({
  authUserId,
  canViewPrivateContent,
  isOwner,
  isSocialFollowsEnabled,
  resolvedUserId,
}) {
  const [profileSocialProof, setProfileSocialProof] = useState(null);

  useEffect(() => {
    let ignore = false;
    if (
      !isSocialFollowsEnabled ||
      !authUserId ||
      !resolvedUserId ||
      isOwner ||
      !canViewPrivateContent
    ) {
      setProfileSocialProof(null);
      return undefined;
    }

    getAccountSocialProof({
      canViewPrivateContent,
      targetUserId: resolvedUserId,
      viewerId: authUserId,
    })
      .then((proof) => {
        if (!ignore) setProfileSocialProof(proof);
      })
      .catch((err) => {
        if (!ignore) {
          logDataError('[Profile] Social proof warning:', err);
          setProfileSocialProof(null);
        }
      });

    return () => {
      ignore = true;
    };
  }, [authUserId, canViewPrivateContent, isOwner, isSocialFollowsEnabled, resolvedUserId]);

  return { profileSocialProof };
}
