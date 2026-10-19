"use client";

import { createContext, use, useMemo, type ReactNode } from "react";
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

export type AccountDockConfig = Partial<AccountDockCard> & {
  action?: ReactNode;
};

const AccountDockContext = createContext<AccountDockCard | null>(null);

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
  return <AccountDockContext value={card}>{children}</AccountDockContext>;
}

// The dock keeps one card per path, so a page of a profile that puts its own
// action there gives the whole card: the profile's, unless it says otherwise.
// `dock` must be memoised; null leaves the dock as it is.
export function useAccountDock(dock: AccountDockConfig | null): void {
  const card = use(AccountDockContext);
  const config = useMemo(
    () => (dock && card ? { dock: { ...card, ...dock } } : {}),
    [card, dock],
  );
  usePage(config, { priority: 260 });
}
