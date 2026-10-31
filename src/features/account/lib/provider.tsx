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
import { useAuth } from "@/features/auth";
import { fetchCurrentAccount } from "./client";
import { INITIAL_ACCOUNT_STATE } from "./constants";
import type { AccountContextValue, AccountState } from "./types";

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children?: ReactNode }) {
  const auth = useAuth();
  const userId = auth.isAuthenticated ? (auth.user?.id ?? null) : null;
  const [state, setState] = useState<AccountState>(INITIAL_ACCOUNT_STATE);

  const refresh = useCallback(async () => {
    if (!userId) {
      setState(INITIAL_ACCOUNT_STATE);
      return;
    }
    setState((current) => ({ ...current, error: null, isLoading: true }));
    try {
      const account = await fetchCurrentAccount();
      setState({ account, error: null, isLoading: false });
    } catch (error) {
      setState((current) => ({ ...current, error, isLoading: false }));
      throw error;
    }
  }, [userId]);

  useEffect(() => {
    if (auth.isReady) void refresh().catch(() => null);
  }, [auth.isReady, refresh]);

  const value = useMemo(() => ({ ...state, refresh }), [refresh, state]);

  return <AccountContext value={value}>{children}</AccountContext>;
}

export function useAccount(): AccountContextValue {
  const context = use(AccountContext);
  if (!context) {
    throw new Error("useAccount must be used inside AccountProvider");
  }
  return context;
}
