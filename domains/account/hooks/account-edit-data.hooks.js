'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAccountProfile } from '@/modules/account';
import { notifyAccountLoadError } from '@/domains/account/utils';

export function useAccountEditData({ auth, initialSnapshot = null, toast = null }) {
  const resolvedUserId = auth?.user?.id || null;
  const handleProfileError = useCallback(
    (err) => notifyAccountLoadError(toast, err, 'Profile details could not be loaded'),
    [toast],
  );
  const { hasLoadedProfile, profile, setProfile } = useAccountProfile({
    initialProfile: initialSnapshot?.profile || null,
    onError: handleProfileError,
    resolvedUserId,
  });

  const resolvedProfile = profile || initialSnapshot?.profile || null;

  const [form, setForm] = useState(() => ({
    avatarUrl: resolvedProfile?.avatarUrl || '',
    bannerUrl: resolvedProfile?.bannerUrl || '',
    description: resolvedProfile?.description || '',
    displayName: resolvedProfile?.displayName || '',
    isPrivate: resolvedProfile?.isPrivate === true,
    username: resolvedProfile?.username || '',
  }));

  const [linkedProviderIdsOverride, setLinkedProviderIdsOverride] = useState(null);
  const [linkedProviderDescriptorsOverride, setLinkedProviderDescriptorsOverride] = useState(null);

  useEffect(() => {
    if (resolvedProfile) {
      setForm({
        avatarUrl: resolvedProfile.avatarUrl || '',
        bannerUrl: resolvedProfile.bannerUrl || '',
        description: resolvedProfile.description || '',
        displayName: resolvedProfile.displayName || '',
        isPrivate: resolvedProfile.isPrivate === true,
        username: resolvedProfile.username || '',
      });
    }
  }, [resolvedProfile]);

  const applyProfile = useCallback(
    (nextProfile) => {
      if (typeof setProfile === 'function') {
        setProfile(nextProfile);
      }
    },
    [setProfile],
  );

  const isLoading =
    !auth.isReady || (Boolean(resolvedUserId) && !hasLoadedProfile && !resolvedProfile);

  return {
    applyProfile,
    followerCount: Number(resolvedProfile?.followerCount || 0),
    followingCount: Number(resolvedProfile?.followingCount || 0),
    form,
    isLoading,
    likesCount: Number(resolvedProfile?.likesCount || 0),
    linkedProviderDescriptorsOverride,
    linkedProviderIdsOverride,
    listsCount: Number(resolvedProfile?.listsCount || 0),
    profile: resolvedProfile,
    setForm,
    setLinkedProviderDescriptorsOverride,
    setLinkedProviderIdsOverride,
    watchedCount: Number(resolvedProfile?.watchedCount || 0),
    watchlistCount: Number(resolvedProfile?.watchlistCount || 0),
  };
}
