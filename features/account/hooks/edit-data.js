'use client';

import { useAccountClient } from '@/core/modules/account';
import { useAuthSessionReady } from '@/core/modules/auth';
import { isPermissionDeniedError } from '@/core/utils/errors';
import { useCallback, useEffect, useState } from 'react';

function showAccountLoadError(toast, error, fallbackMessage) {
  if (isPermissionDeniedError(error)) {
    return false;
  }

  toast.error(error?.message || fallbackMessage);
  return true;
}

function normalizeEditableCount(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function normalizeEditableAccountCounts(snapshot = null) {
  const counts = snapshot?.counts && typeof snapshot.counts === 'object' ? snapshot.counts : {};

  return {
    followers: normalizeEditableCount(counts.followers),
    following: normalizeEditableCount(counts.following),
    likes: normalizeEditableCount(counts.likes),
    lists: normalizeEditableCount(counts.lists),
    watchlist: normalizeEditableCount(counts.watchlist),
  };
}

function normalizeEditableProfile(profile = null) {
  const nextProfile = profile && typeof profile === 'object' ? profile : null;

  return {
    avatarUrl: nextProfile?.avatarUrl || '',
    bannerUrl: nextProfile?.bannerUrl || '',
    description: nextProfile?.description || '',
    displayName: nextProfile?.displayName || '',
    isPrivate: nextProfile?.isPrivate === true,
    username: nextProfile?.username || '',
  };
}

function normalizeEditableProfileCounts(profile = null) {
  return {
    followers: normalizeEditableCount(profile?.followerCount),
    following: normalizeEditableCount(profile?.followingCount),
    likes: normalizeEditableCount(profile?.likesCount),
    lists: normalizeEditableCount(profile?.listsCount),
    watchlist: normalizeEditableCount(profile?.watchlistCount),
    watched: normalizeEditableCount(profile?.watchedCount),
  };
}

export function useAccountEditData({ auth, initialSnapshot = null, toast }) {
  const accountClient = useAccountClient();
  const isAuthSessionReady = useAuthSessionReady(auth.isAuthenticated ? auth.user?.id || null : null);
  const initialProfile = initialSnapshot?.profile || null;
  const initialCounts = normalizeEditableAccountCounts(initialSnapshot);
  const [profile, setProfile] = useState(initialProfile);
  const [likesCount, setLikesCount] = useState(initialCounts.likes);
  const [watchedCount, setWatchedCount] = useState(Number(initialProfile?.watchedCount || 0));
  const [watchlistCount, setWatchlistCount] = useState(initialCounts.watchlist);
  const [listsCount, setListsCount] = useState(initialCounts.lists);
  const [followerCount, setFollowerCount] = useState(initialCounts.followers);
  const [followingCount, setFollowingCount] = useState(initialCounts.following);
  const [isLoading, setIsLoading] = useState(!initialProfile);
  const [form, setForm] = useState(() => normalizeEditableProfile(initialProfile));
  const [linkedProviderDescriptorsOverride, setLinkedProviderDescriptorsOverride] = useState(null);
  const [linkedProviderIdsOverride, setLinkedProviderIdsOverride] = useState(null);

  const applyProfile = useCallback((nextProfile) => {
    const nextCounts = normalizeEditableProfileCounts(nextProfile);

    setProfile(nextProfile);
    setLikesCount(nextCounts.likes);
    setWatchedCount(nextCounts.watched);
    setWatchlistCount(nextCounts.watchlist);
    setListsCount(nextCounts.lists);
    setFollowerCount(nextCounts.followers);
    setFollowingCount(nextCounts.following);
    setForm(normalizeEditableProfile(nextProfile));
    setIsLoading(false);
  }, []);

  const applySnapshot = useCallback((snapshot) => {
    const nextProfile = snapshot?.profile || null;
    const nextCounts = normalizeEditableAccountCounts(snapshot);

    setProfile(nextProfile);
    setLikesCount(nextCounts.likes);
    setWatchedCount(Number(nextProfile?.watchedCount || 0));
    setWatchlistCount(nextCounts.watchlist);
    setListsCount(nextCounts.lists);
    setFollowerCount(nextCounts.followers);
    setFollowingCount(nextCounts.following);
    setForm(normalizeEditableProfile(nextProfile));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!auth.isReady) {
      return undefined;
    }

    if (auth.isAuthenticated && auth.user?.id && !isAuthSessionReady) {
      setIsLoading(!initialProfile);
      return undefined;
    }

    if (!auth.isAuthenticated || !auth.user?.id) {
      setProfile(null);
      setLikesCount(0);
      setWatchedCount(0);
      setWatchlistCount(0);
      setListsCount(0);
      setFollowerCount(0);
      setFollowingCount(0);
      setIsLoading(false);
      setLinkedProviderDescriptorsOverride(null);
      setLinkedProviderIdsOverride(null);
      return undefined;
    }

    const canUseInitialSnapshot = initialSnapshot?.profile?.id && initialSnapshot.profile.id === auth.user.id;

    if (canUseInitialSnapshot) {
      applySnapshot(initialSnapshot);
      return undefined;
    }

    let ignore = false;

    async function load() {
      setIsLoading(true);

      try {
        const nextProfile = await accountClient.getAccount(auth.user.id);

        if (ignore) {
          return;
        }

        applyProfile(nextProfile);
      } catch (error) {
        if (!ignore) {
          setProfile(null);
          setWatchedCount(0);
          showAccountLoadError(toast, error, 'Profile could not be loaded');
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [
    accountClient,
    applyProfile,
    applySnapshot,
    auth.isAuthenticated,
    auth.isReady,
    auth.user?.id,
    initialProfile,
    initialSnapshot,
    isAuthSessionReady,
    toast,
  ]);

  useEffect(() => {
    setLinkedProviderIdsOverride(null);
  }, [auth.user?.id]);

  return {
    followerCount,
    followingCount,
    form,
    isLoading,
    likesCount,
    linkedProviderDescriptorsOverride,
    linkedProviderIdsOverride,
    listsCount,
    profile,
    setForm,
    applyProfile,
    setLinkedProviderDescriptorsOverride,
    setLinkedProviderIdsOverride,
    watchedCount,
    watchlistCount,
  };
}
