"use client";

import type { JSX, ReactNode } from "react";
import type { AmbientPalette } from "@omerdlw/base-framework/modules/ambient";
import { useAuth } from "@/features/auth";
import { useAccount } from "../lib/provider";
import { AccountDockProvider } from "./account-dock";
import { AccountLayout, type AccountData } from "./account-layout";
import { AccountRegistry } from "./account-registry";
import { AccountSectionTabs } from "./browse/section-tabs";

interface AccountShellProps {
  account: AccountData;
  children: ReactNode;
  followersCount: number;
  followingCount: number;
  initialFollowStatus: string | null;
  isFollower: boolean;
  isOwner: boolean;
  palette?: AmbientPalette | null;
  proofSlot?: ReactNode;
  statsSlot?: ReactNode;
}

export function AccountShell({
  account,
  children,
  followersCount,
  followingCount,
  initialFollowStatus,
  isFollower,
  isOwner: initialIsOwner,
  palette,
  proofSlot,
  statsSlot,
}: AccountShellProps): JSX.Element {
  const auth = useAuth();
  const accountState = useAccount();
  const isOwner =
    initialIsOwner ||
    Boolean(
      auth.isAuthenticated &&
      auth.user?.id &&
      account?.id &&
      auth.user.id === account.id,
    );

  const activeAccount =
    isOwner && accountState.account
      ? { ...account, ...accountState.account }
      : account;

  return (
    <>
      <AccountRegistry
        account={activeAccount}
        initialFollowStatus={initialFollowStatus}
        isOwner={isOwner}
      />
      <AccountDockProvider account={activeAccount}>
        <AccountLayout
          account={activeAccount}
          followersCount={followersCount}
          followingCount={followingCount}
          isFollower={isFollower}
          isOwner={isOwner}
          palette={palette}
          proofSlot={proofSlot}
          statsSlot={statsSlot}
          tabsSlot={
            activeAccount.username ? (
              <AccountSectionTabs username={activeAccount.username} />
            ) : null
          }
        >
          {children}
        </AccountLayout>
      </AccountDockProvider>
    </>
  );
}
