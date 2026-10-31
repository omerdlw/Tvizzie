"use client";

import {
  createContext,
  use,
  useLayoutEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { usePage } from "@omerdlw/base-framework/kernel";
import { DEFAULT_ACCOUNT_ICON } from "../lib/constants";
import type { AccountData } from "./account-layout";

interface AccountDockCard {
  bannerPosition: string | null;
  bannerUrl: string | null;
  description: string | null;
  icon: string;
  title: string;
}

type AccountDockConfig = Partial<AccountDockCard> & {
  action?: ReactNode;
};

interface AccountDockSlots {
  setPageDock: Dispatch<SetStateAction<AccountDockConfig | null>>;
}

const AccountDockContext = createContext<AccountDockSlots | null>(null);

export function AccountDockProvider({
  account,
  children,
}: {
  account: AccountData;
  children: ReactNode;
}) {
  const { avatarUrl, bannerPosition, bannerUrl, displayName, username } =
    account;
  const card = useMemo(
    () => ({
      bannerPosition: bannerPosition || null,
      bannerUrl: bannerUrl || null,
      description: username ? `@${username}` : null,
      icon: avatarUrl || DEFAULT_ACCOUNT_ICON,
      title: displayName || username || "Account",
    }),
    [avatarUrl, bannerPosition, bannerUrl, displayName, username],
  );
  const [pageDock, setPageDock] = useState<AccountDockConfig | null>(null);
  const slots = useMemo(() => ({ setPageDock }), []);

  const config = useMemo(() => {
    if (!pageDock) return {};
    return { ambient: false, dock: { ...card, ...pageDock } };
  }, [card, pageDock]);
  usePage(config, { priority: 260 });

  return <AccountDockContext value={slots}>{children}</AccountDockContext>;
}

export function useAccountDock(dock: AccountDockConfig | null): void {
  const setPageDock = use(AccountDockContext)?.setPageDock;
  useLayoutEffect(() => {
    if (!setPageDock) return;
    setPageDock(dock);
    return () => setPageDock(null);
  }, [dock, setPageDock]);
}
