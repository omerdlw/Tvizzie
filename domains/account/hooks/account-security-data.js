'use client';

import { useEffect, useState } from 'react';

import { listAuthSessionsRequest } from '@/domains/auth/client/requests';

export function useAccountSecurityData({ activeTab, auth, passkeySupported, toast }) {
  const { isAuthenticated, isReady, listMfaFactors, listPasskeys } = auth;
  const [passkeys, setPasskeys] = useState([]);
  const [passkeysLoading, setPasskeysLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [mfaFactors, setMfaFactors] = useState([]);
  const [mfaLoading, setMfaLoading] = useState(false);

  useEffect(() => {
    if (!isReady || !isAuthenticated) return undefined;

    let isMounted = true;
    setPasskeysLoading(true);
    setSessionsLoading(true);
    setMfaLoading(true);

    void Promise.allSettled([
      passkeySupported && typeof listPasskeys === 'function'
        ? listPasskeys()
        : Promise.resolve([]),
      listAuthSessionsRequest(),
      typeof listMfaFactors === 'function' ? listMfaFactors() : Promise.resolve([]),
    ]).then(([passkeyResult, sessionsResult, mfaResult]) => {
      if (!isMounted) return;

      if (passkeyResult.status === 'fulfilled') {
        setPasskeys(Array.isArray(passkeyResult.value) ? passkeyResult.value : []);
      } else {
        setPasskeys([]);
        toast.error(passkeyResult.reason?.message || 'Passkeys could not be loaded');
      }

      if (sessionsResult.status === 'fulfilled') {
        setSessions(
          Array.isArray(sessionsResult.value?.sessions) ? sessionsResult.value.sessions : [],
        );
      } else {
        setSessions([]);
      }

      if (mfaResult.status === 'fulfilled') {
        setMfaFactors(Array.isArray(mfaResult.value) ? mfaResult.value : []);
      } else {
        setMfaFactors([]);
      }

      setPasskeysLoading(false);
      setSessionsLoading(false);
      setMfaLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, isReady, listMfaFactors, listPasskeys, passkeySupported, toast]);

  return {
    mfaFactors,
    mfaLoading,
    passkeys,
    passkeysLoading,
    sessions,
    sessionsLoading,
    setMfaFactors,
    setPasskeys,
    setSessions,
  };
}
