'use client';

import { notifyAccountLoadError } from '@/features/account/utils';
import { logDataError } from '@/core/utils/errors';
import { useToast } from '@/core/modules/notification/hooks';
import {
  FOLLOW_STATUSES,
  subscribeToFollowRelationship,
  subscribeToFollowers,
  subscribeToFollowing,
} from '@/core/services/social/follows.service';
import { getAccountSocialProof } from '@/core/services/media/social-proof.service';
import { subscribeToUserListItems } from '@/core/services/media/lists.service';
import { useEffect, useMemo, useState } from 'react';

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
  const [followRelationship, setFollowRelationship] = useState({
    canViewPrivateContent: false,
    inboundStatus: null,
    isInboundRelationshipLoaded: false,
    isOutboundRelationshipLoaded: false,
    isPrivateProfile: false,
    isTargetProfileLoaded: false,
    outboundStatus: null,
    showFollowBack: false,
  });
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
      setFollowRelationship({
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
      });
      return undefined;
    }

    if (isOwner) {
      setFollowRelationship({
        canViewPrivateContent: true,
        inboundRelationship: null,
        inboundStatus: null,
        isInboundRelationshipLoaded: true,
        isOutboundRelationshipLoaded: true,
        isPrivateProfile: Boolean(isPrivateProfile),
        isTargetProfileLoaded: true,
        outboundRelationship: null,
        outboundStatus: null,
        showFollowBack: false,
      });
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

    if (isOwner) {
      setFollowerCount(publicFollowerCount);
      setFollowingCount(publicFollowingCount);

      const unsubPendingFollowers = canManageRequests
        ? subscribeToFollowers(
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
          )
        : (() => {
            setPendingFollowRequestCount(0);
            return () => {};
          })();

      return () => {
        unsubPendingFollowers();
      };
    }

    if (!canManageRequests) {
      setPendingFollowRequestCount(0);
    }

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

    const unsubPendingFollowers = canManageRequests
      ? subscribeToFollowers(
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
        )
      : () => {};

    return () => {
      unsubFollowers();
      unsubFollowing();
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

    if (!isSocialFollowsEnabled || !authUserId || !resolvedUserId || isOwner || !canViewPrivateContent) {
      setProfileSocialProof(null);
      return undefined;
    }

    getAccountSocialProof({
      canViewPrivateContent,
      targetUserId: resolvedUserId,
      viewerId: authUserId,
    })
      .then((proof) => {
        if (!ignore) {
          setProfileSocialProof(proof);
        }
      })
      .catch((error) => {
        if (!ignore) {
          logDataError('[Profile] Social proof could not be loaded:', error);
          setProfileSocialProof(null);
        }
      });

    return () => {
      ignore = true;
    };
  }, [authUserId, canViewPrivateContent, isOwner, isSocialFollowsEnabled, resolvedUserId]);

  return { profileSocialProof };
}

export function useAccountListItems({
  activeListId,
  activeTab,
  canViewPrivateContent,
  isOwner,
  isPrivateProfile,
  resolvedUserId,
}) {
  const toast = useToast();
  const [listItems, setListItems] = useState([]);
  const [isLoadingListItems, setIsLoadingListItems] = useState(false);

  useEffect(() => {
    if (activeTab !== 'lists' || !resolvedUserId || !activeListId) {
      setListItems([]);
      setIsLoadingListItems(false);
      return undefined;
    }

    if (!isOwner && isPrivateProfile && !canViewPrivateContent) {
      setListItems([]);
      setIsLoadingListItems(false);
      return undefined;
    }

    setIsLoadingListItems(true);

    return subscribeToUserListItems(
      resolvedUserId,
      activeListId,
      (nextItems) => {
        setListItems(nextItems);
        setIsLoadingListItems(false);
      },
      {
        activeTab,
        onError: (error) => {
          setListItems([]);
          notifyAccountLoadError(toast, error, 'List items could not be loaded');
          setIsLoadingListItems(false);
        },
      }
    );
  }, [activeListId, activeTab, canViewPrivateContent, isOwner, isPrivateProfile, resolvedUserId, toast]);

  return {
    isLoadingListItems,
    listItems,
    setListItems,
  };
}
