"use client";

import type { JSX, ReactNode } from "react";
import { useAuth } from "@/features/auth";
import {
  AccountLayout,
  AccountSectionTabs,
  type AccountData,
  type LibraryCounts,
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
  libraryCounts: LibraryCounts;
  proofSlot?: ReactNode;
}

export function AccountClient({
  account,
  children,
  followersCount,
  followingCount,
  initialFollowStatus,
  isFollower,
  isOwner: initialIsOwner,
  libraryCounts,
  proofSlot,
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
      <AccountLayout
        account={activeAccount}
        followersCount={followersCount}
        followingCount={followingCount}
        isFollower={isFollower}
        isOwner={isOwner}
        proofSlot={proofSlot}
        tabsSlot={
          activeAccount.username ? (
            <AccountSectionTabs
              counts={libraryCounts}
              username={activeAccount.username}
            />
          ) : null
        }
      >
        {children}
      </AccountLayout>
    </>
  );
}
