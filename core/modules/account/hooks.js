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

  const initialStateConsumedRef = useRef(hasServerSnapshot);
  const [remoteUserId, setRemoteUserId] = useState(initialResolvedUserId);
  const [isResolvingProfile, setIsResolvingProfile] = useState(Boolean(username) && !hasServerSnapshot);
  const [resolveError, setResolveError] = useState(initialResolveError);

  useEffect(() => {
    if (username) {
      if (initialStateConsumedRef.current) {
        initialStateConsumedRef.current = false;
        return undefined;
      }

      let ignore = false;

      async function resolveProfile() {
        setIsResolvingProfile(true);
        setResolveError(null);

        try {
          let userId = await accountClient.getAccountIdByUsername(username);

          if (!userId) {
            const profileSnapshot = await accountClient.getAccountByUsername(username);

            if (profileSnapshot) {
              userId = profileSnapshot.id || username;
            }
          }

          if (ignore) {
            return;
          }

          setRemoteUserId(userId);
          setResolveError(userId ? null : 'Profile not found');
        } catch (error) {
          if (ignore) {
            return;
          }

          setRemoteUserId(null);
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
    }

    setRemoteUserId(null);
    setResolveError(null);
    setIsResolvingProfile(false);
  }, [accountClient, authUserId, username]);

  const resolvedUserId = username ? remoteUserId : authUserId || initialResolvedUserId || null;

  return {
    isResolvingProfile,
    resolveError,
    resolvedUserId,
  };
}

export function useAccountProfile({ resolvedUserId, initialProfile = null, onError }) {
  const accountClient = useAccountClient();
  const [profile, setProfile] = useState(initialProfile);

  useEffect(() => {
    if (!resolvedUserId) {
      setProfile(null);
      return undefined;
    }

    const hasInitialProfile = initialProfile?.id === resolvedUserId;

    if (hasInitialProfile) {
      accountClient.primeAccount(resolvedUserId, initialProfile);
      setProfile((currentProfile) => (currentProfile?.id === resolvedUserId ? currentProfile : initialProfile));
    }

    return accountClient.subscribeToAccount(
      resolvedUserId,
      (nextProfile) => {
        setProfile(nextProfile);
      },
      {
        fetchOnSubscribe: !hasInitialProfile,
        hiddenIntervalMs: ACCOUNT_PROFILE_SUBSCRIPTION_HIDDEN_INTERVAL_MS,
        intervalMs: ACCOUNT_PROFILE_SUBSCRIPTION_INTERVAL_MS,
        onError,
      }
    );
  }, [accountClient, initialProfile, onError, resolvedUserId]);

  return { profile, setProfile };
}
