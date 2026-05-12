'use client';

import {
  subscribeToFollowRelationship,
} from '@/core/services/social/follows.service';
import { useEffect, useMemo, useState } from 'react';
import {
  subscribeToAcceptedFollowCounts,
  subscribeToPendingFollowers,
  subscribeToPublicFollowCounts,
} from './subscriptions';

const DEFAULT_FOLLOW_RELATIONSHIP = {
  canViewPrivateContent: false,
  inboundRelationship: null,
  inboundStatus: null,
  isInboundRelationshipLoaded: false,
  isOutboundRelationshipLoaded: false,
  isPrivateProfile: false,
  isTargetProfileLoaded: false,
  outboundRelationship: null,
  outboundStatus: null,
  showFollowBack: false,
};

function buildOwnerRelationship(isPrivateProfile) {
  return {
    ...DEFAULT_FOLLOW_RELATIONSHIP,
    canViewPrivateContent: true,
    isInboundRelationshipLoaded: true,
    isOutboundRelationshipLoaded: true,
    isPrivateProfile: Boolean(isPrivateProfile),
    isTargetProfileLoaded: true,
  };
}

export function useAccountRelationshipData({
  authIsReady,
  authUserId,
  canManageRequests,
  isOwner,
  isPrivateProfile,
  isProfileLoaded,
  publicFollowerCount = 0,
  publicFollowingCount = 0,
  resolvedUserId,
}) {
  const [followRelationship, setFollowRelationship] = useState(DEFAULT_FOLLOW_RELATIONSHIP);
  const [followerCount, setFollowerCount] = useState(publicFollowerCount);
  const [followingCount, setFollowingCount] = useState(publicFollowingCount);
  const [pendingFollowRequestCount, setPendingFollowRequestCount] = useState(0);
  const followPollingOptions = useMemo(
    () => ({
      hiddenIntervalMs: 60000,
      intervalMs: 15000,
    }),
    []
  );

  useEffect(() => {
    if (!resolvedUserId || !authIsReady) {
      setFollowRelationship(DEFAULT_FOLLOW_RELATIONSHIP);
      return undefined;
    }

    if (isOwner) {
      setFollowRelationship(buildOwnerRelationship(isPrivateProfile));
      return undefined;
    }

    const unsubRelationship = subscribeToFollowRelationship(
      authUserId || null,
      resolvedUserId,
      (relationship) => {
        setFollowRelationship(relationship);
      },
      {
        ...followPollingOptions,
      }
    );

    return () => {
      unsubRelationship();
    };
  }, [authIsReady, authUserId, followPollingOptions, isOwner, isPrivateProfile, resolvedUserId]);

  useEffect(() => {
    if (!resolvedUserId) {
      setFollowerCount(0);
      setFollowingCount(0);
      setPendingFollowRequestCount(0);
      return undefined;
    }

    if (!authIsReady) {
      setFollowerCount(publicFollowerCount);
      setFollowingCount(publicFollowingCount);
      setPendingFollowRequestCount(0);
      return undefined;
    }

    const hasKnownPrivacyState = isOwner || isProfileLoaded || followRelationship.isTargetProfileLoaded;
    const resolvedIsPrivateProfile = isProfileLoaded ? isPrivateProfile : followRelationship.isPrivateProfile;

    if (!hasKnownPrivacyState) {
      setFollowerCount(publicFollowerCount);
      setFollowingCount(publicFollowingCount);
      setPendingFollowRequestCount(0);
      return undefined;
    }

    const canReadFollowCollections = isOwner || !resolvedIsPrivateProfile || followRelationship.canViewPrivateContent;

    if (!canReadFollowCollections) {
      setFollowerCount(publicFollowerCount);
      setFollowingCount(publicFollowingCount);
      setPendingFollowRequestCount(0);
      return undefined;
    }

    const countSubscriptionArgs = {
      followPollingOptions,
      publicFollowerCount,
      publicFollowingCount,
      resolvedUserId,
      setFollowerCount,
      setFollowingCount,
    };
    const countSubscriptions = isOwner
      ? subscribeToAcceptedFollowCounts(countSubscriptionArgs)
      : subscribeToPublicFollowCounts(countSubscriptionArgs);
    const unsubPendingFollowers = subscribeToPendingFollowers({
      canManageRequests,
      followPollingOptions,
      resolvedUserId,
      setPendingFollowRequestCount,
    });

    return () => {
      countSubscriptions.forEach((unsubscribe) => unsubscribe());
      unsubPendingFollowers();
    };
  }, [
    authIsReady,
    canManageRequests,
    followRelationship.canViewPrivateContent,
    followRelationship.isPrivateProfile,
    followRelationship.isTargetProfileLoaded,
    followPollingOptions,
    isPrivateProfile,
    isProfileLoaded,
    isOwner,
    publicFollowerCount,
    publicFollowingCount,
    resolvedUserId,
  ]);

  return {
    followerCount,
    followingCount,
    followRelationship,
    pendingFollowRequestCount,
  };
}
