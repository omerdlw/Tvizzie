"use client";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { isSupabaseConfigured } from "@/infrastructure/env";
import { createBrowserSupabaseClient } from "@/infrastructure/supabase/client";
import { signOut as signOutClient } from "./client";
import { INITIAL_AUTH_STATE } from "./constants";
import type { AuthContextValue, AuthState, SignOutScope } from "./types";
import { authStateFrom } from "./utils";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children?: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [state, setState] = useState<AuthState>(() => ({
    ...INITIAL_AUTH_STATE,
    isConfigured: configured,
    isReady: !configured,
  }));
  const client = useMemo(
    () => (configured ? createBrowserSupabaseClient() : null),
    [configured],
  );

  const refresh = useCallback(async (): Promise<AuthState | null> => {
    if (!client) return null;
    const { data } = await client.auth.getSession();
    const next = authStateFrom(data.session);
    setState(next);
    return next;
  }, [client]);

  const signOut = useCallback(
    async (scope: SignOutScope = "local") => {
      if (!client) return;
      await signOutClient(client, scope);
      if (scope !== "others") {
        setState({ ...INITIAL_AUTH_STATE, isConfigured: true, isReady: true });
      }
    },
    [client],
  );

  useEffect(() => {
    if (!client) return;
    let active = true;

    refresh().catch((error: unknown) => {
      if (active) setState((current) => ({ ...current, error, isReady: true }));
    });

    const { data } = client.auth.onAuthStateChange((_event, session) => {
      queueMicrotask(() => {
        if (active) setState(authStateFrom(session));
      });
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [client, refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, client, refresh, signOut }),
    [client, refresh, signOut, state],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const context = use(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
