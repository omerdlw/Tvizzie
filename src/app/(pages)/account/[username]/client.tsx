"use client";

import type { JSX, ReactNode } from "react";
import type { AmbientPalette } from "@omerdlw/base-framework/modules/ambient";
import { useAuth } from "@/features/auth";
import {
  AccountDockProvider,
  AccountLayout,
  AccountSectionTabs,
  type AccountData,
  useAccount,
} from "@/features/account";
import { AccountRegistry } from "./registry";

interface AccountClientProps {
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

export function AccountClient({
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
}: AccountClientProps): JSX.Element {
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
    isOwner && (accountState?.account || accountState?.profile)
      ? { ...account, ...(accountState.account || accountState.profile) }
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
