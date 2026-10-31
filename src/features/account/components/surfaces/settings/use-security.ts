"use client";

import { useCallback, useEffect, useState } from "react";
import type { PasskeyListItem, UserIdentity } from "@supabase/supabase-js";
import { getUserIdentities, listPasskeys, useAuth } from "@/features/auth";
import { requestJson } from "@/infrastructure/http/client";

export interface AuthSession {
  created_at: string | null;
  ip_address: string | null;
  is_current: boolean;
  last_seen_at: string | null;
  session_id: string;
  user_agent: string | null;
}

export function useSecurity(enabled: boolean) {
  const auth = useAuth();
  const [sessions, setSessions] = useState<AuthSession[]>([]);
  const [passkeys, setPasskeys] = useState<PasskeyListItem[]>([]);
  const [identities, setIdentities] = useState<UserIdentity[]>(
    () => auth.user?.identities ?? [],
  );
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    const client = auth.client;
    if (!client || !auth.isAuthenticated) return;
    setLoading(true);
    try {
      const [sessionList, passkeyList, identityList] = await Promise.all([
        requestJson<{ sessions: AuthSession[] }>("/api/auth/sessions", {
          notifyOnUnauthorized: false,
        }),
        listPasskeys(client).catch(() => []),
        getUserIdentities(client).catch(() => auth.user?.identities ?? []),
      ]);
      setSessions(sessionList.sessions);
      setPasskeys(passkeyList);
      setIdentities(identityList);
    } finally {
      setLoading(false);
    }
  }, [auth.client, auth.isAuthenticated, auth.user?.identities]);

  useEffect(() => {
    if (!enabled) return;
    const frame = requestAnimationFrame(() => void reload());
    return () => cancelAnimationFrame(frame);
  }, [enabled, reload]);

  return { identities, loading, passkeys, reload, sessions };
}
