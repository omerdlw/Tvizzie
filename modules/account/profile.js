'use client';

import { useEffect, useRef, useState } from 'react';

import { useAccountClient } from './provider';

const ACCOUNT_PROFILE_SUBSCRIPTION_INTERVAL_MS = 3 * 60 * 1000;
const ACCOUNT_PROFILE_SUBSCRIPTION_HIDDEN_INTERVAL_MS = 15 * 60 * 1000;

// Resolves a public username to the account identity used by profile reads.
export function useResolvedAccountUser({
  authUserId,
  username,
  initialResolvedUserId = null,
  initialResolveError = null,
}) {
  const accountClient = useAccountClient();
  const hasServerSnapshot = Boolean(initialResolvedUserId) || initialResolveError !== null;
  const [remoteUserId, setRemoteUserId] = useState(initialResolvedUserId);
  const [resolvedUsername, setResolvedUsername] = useState(username || null);
  const [isResolvingProfile, setIsResolvingProfile] = useState(
    Boolean(username) && !hasServerSnapshot,
  );
  const [resolveError, setResolveError] = useState(initialResolveError);

  useEffect(() => {
    if (!username) {
      setRemoteUserId(null);
      setResolvedUsername(null);
      setResolveError(null);
      setIsResolvingProfile(false);
      return;
    }

    if (hasServerSnapshot) {
      setRemoteUserId(initialResolvedUserId);
      setResolvedUsername(username);
      setResolveError(initialResolveError);
      setIsResolvingProfile(false);
      return;
    }

    let ignore = false;

    async function resolveProfile() {
      setRemoteUserId(null);
      setResolvedUsername(username);
      setIsResolvingProfile(true);
      setResolveError(null);

      try {
        let userId = await accountClient.getAccountIdByUsername(username);

        if (!userId) {
          const profileSnapshot = await accountClient.getAccountByUsername(username);
          userId = profileSnapshot?.id || null;
        }

        if (ignore) return;

        setRemoteUserId(userId);
        setResolvedUsername(username);
        setResolveError(userId ? null : 'Profile not found');
      } catch (error) {
        if (ignore) return;

        setRemoteUserId(null);
        setResolvedUsername(username);
        setResolveError(error?.message || 'Profile not found');
      } finally {
        if (!ignore) {
          setIsResolvingProfile(false);
        }
      }
    }

    void resolveProfile();

    return () => {
      ignore = true;
    };
  }, [accountClient, initialResolveError, initialResolvedUserId, username]);

  const resolvedUserId = username
    ? (resolvedUsername === username ? remoteUserId : null) || initialResolvedUserId || null
    : authUserId || initialResolvedUserId || null;

  return {
    isResolvingProfile,
    resolveError,
    resolvedUserId,
  };
}

// Subscribes to a private or public profile and owns its hydration lifecycle.
export function useAccountProfile({
  resolvedUserId,
  initialProfile = null,
  onError,
  username = null,
}) {
  const accountClient = useAccountClient();
  const [profile, setProfile] = useState(initialProfile);
  const [hasLoadedProfile, setHasLoadedProfile] = useState(Boolean(initialProfile?.id));

  const initialProfileId = initialProfile?.id;

  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  });

  useEffect(() => {
    if (!resolvedUserId) {
      setProfile(null);
      setHasLoadedProfile(false);
      return;
    }

    let ignore = false;
    const isPublicProfile = Boolean(username);
    const hasInitialProfile =
      initialProfileId != null &&
      resolvedUserId != null &&
      String(initialProfileId) === String(resolvedUserId);
    setHasLoadedProfile(hasInitialProfile);

    if (hasInitialProfile && initialProfile) {
      if (isPublicProfile) {
        accountClient.primeAccountByUsername(username, initialProfile);
      } else {
        accountClient.primeAccount(resolvedUserId, initialProfile);
      }
      setProfile((currentProfile) =>
        currentProfile?.id != null && String(currentProfile.id) === String(resolvedUserId)
          ? currentProfile
          : initialProfile,
      );
    } else {
      setProfile(null);
    }

    const subscribe = isPublicProfile
      ? accountClient.subscribeToAccountByUsername.bind(accountClient, username)
      : accountClient.subscribeToAccount.bind(accountClient, resolvedUserId);

    const unsubscribe = subscribe(
      (nextProfile) => {
        if (ignore) return;
        if (nextProfile) {
          setProfile(nextProfile);
        }
        setHasLoadedProfile(true);
      },
      {
        fetchOnSubscribe: !hasInitialProfile,
        hiddenIntervalMs: ACCOUNT_PROFILE_SUBSCRIPTION_HIDDEN_INTERVAL_MS,
        intervalMs: ACCOUNT_PROFILE_SUBSCRIPTION_INTERVAL_MS,
        realtimeProfileReference: resolvedUserId,
        onError: (error) => {
          if (ignore) return;
          setHasLoadedProfile(true);
          if (typeof onErrorRef.current === 'function') {
            onErrorRef.current(error);
          }
        },
      },
    );

    return () => {
      ignore = true;
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [accountClient, initialProfileId, resolvedUserId, username]);

  return { hasLoadedProfile, profile, setProfile };
}
