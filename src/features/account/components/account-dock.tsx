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

export type AccountDockConfig = Partial<AccountDockCard> & {
  action?: ReactNode;
};

interface AccountDockSlots {
  setFilterAction: Dispatch<SetStateAction<ReactNode>>;
  setPageDock: Dispatch<SetStateAction<AccountDockConfig | null>>;
}

const AccountDockContext = createContext<AccountDockSlots | null>(null);

// The page's own action and the filters' reset share the dock's action row:
// the page's first, the reset at the end, so neither pushes the other off.
function composeAction(page: ReactNode, filter: ReactNode): ReactNode {
  if (!page) return filter ?? null;
  if (!filter) return page;
  return (
    <div className="flex w-full items-center gap-2.5">
      <div className="min-w-0 flex-1">{page}</div>
      <div className="shrink-0">{filter}</div>
    </div>
  );
}

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
  const [filterAction, setFilterAction] = useState<ReactNode>(null);
  const slots = useMemo(() => ({ setFilterAction, setPageDock }), []);

  // The dock keeps one card per path, so a page of a profile that puts
  // anything there gives the whole card: the profile's, unless it says
  // otherwise.
  const config = useMemo(() => {
    if (!pageDock && !filterAction) return {};
    return {
      dock: {
        ...card,
        ...pageDock,
        action: composeAction(pageDock?.action, filterAction),
      },
    };
  }, [card, filterAction, pageDock]);
  usePage(config, { priority: 260 });

  return <AccountDockContext value={slots}>{children}</AccountDockContext>;
}

// `dock` must be memoised; null leaves the dock as it is.
export function useAccountDock(dock: AccountDockConfig | null): void {
  const setPageDock = use(AccountDockContext)?.setPageDock;
  useLayoutEffect(() => {
    if (!setPageDock) return;
    setPageDock(dock);
    return () => setPageDock(null);
  }, [dock, setPageDock]);
}

// What the filters put in the dock's action row; `action` must be memoised.
export function useAccountDockFilterAction(action: ReactNode): boolean {
  const setFilterAction = use(AccountDockContext)?.setFilterAction;
  useLayoutEffect(() => {
    if (!setFilterAction) return;
    setFilterAction(action);
    return () => setFilterAction(null);
  }, [action, setFilterAction]);
  return Boolean(setFilterAction);
}
