'use client';

import { useMemo } from 'react';

import { useAuthState } from './context';

export function useAuthSessionReady(expectedUserId = null) {
  const authState = useAuthState();

  return useMemo(() => {
    if (!authState?.isReady) {
      return false;
    }

    if (!expectedUserId) {
      return true;
    }

    const userId = authState?.user?.id ?? null;
    return Boolean(userId) && String(userId) === String(expectedUserId);
  }, [authState, expectedUserId]);
}
