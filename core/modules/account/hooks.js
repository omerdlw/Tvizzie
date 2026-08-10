'use client';

import { useEffect, useRef, useState } from 'react';
import { useAccountClient } from './context';

const ACCOUNT_PROFILE_SUBSCRIPTION_INTERVAL_MS = 15000;
const ACCOUNT_PROFILE_SUBSCRIPTION_HIDDEN_INTERVAL_MS = 60000;

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

export function useAccountProfile({ resolvedUserId, initialProfile = null, onError }) {
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

    const hasInitialProfile = initialProfileId === resolvedUserId;
    setHasLoadedProfile(hasInitialProfile);

    if (hasInitialProfile && initialProfile) {
      accountClient.primeAccount(resolvedUserId, initialProfile);
      setProfile((currentProfile) =>
        currentProfile?.id === resolvedUserId ? currentProfile : initialProfile,
      );
    } else {
      setProfile(null);
    }

    return accountClient.subscribeToAccount(
      resolvedUserId,
      (nextProfile) => {
        if (nextProfile) {
          setProfile(nextProfile);
        }
        setHasLoadedProfile(true);
      },
      {
        fetchOnSubscribe: !hasInitialProfile,
        hiddenIntervalMs: ACCOUNT_PROFILE_SUBSCRIPTION_HIDDEN_INTERVAL_MS,
        intervalMs: ACCOUNT_PROFILE_SUBSCRIPTION_INTERVAL_MS,
        onError: (error) => {
          setHasLoadedProfile(true);
          if (typeof onErrorRef.current === 'function') {
            onErrorRef.current(error);
          }
        },
      },
    );
  }, [accountClient, initialProfileId, resolvedUserId]);

  return { hasLoadedProfile, profile, setProfile };
}
