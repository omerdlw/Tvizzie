import type { JSX, ReactNode } from "react";
import type { Metadata } from "next";
import { getAccountAmbientPalette } from "@/features/account/server/ambient";
import { getAccountHeader } from "@/features/account/server/header";
import { ProfileStats } from "@/features/account/components/browse/profile-stats";
import { getAccountPageContext } from "@/features/account/server/context";
import { FollowedBy } from "@/features/social";
import { project } from "@config/project";
import { AccountClient } from "./client";

export interface AccountPageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({
  params,
}: AccountPageProps): Promise<Metadata> {
  const { username } = await params;
  const { account } = await getAccountPageContext(username);

  const title = account.displayName
    ? `${account.displayName} (@${account.username})`
    : `@${account.username}`;
  const description =
    account.bio ||
    `View ${account.displayName || account.username}'s profile on ${project.name}.`;

  return {
    description,
    openGraph: {
      description,
      images: account.avatarUrl ? [{ url: account.avatarUrl }] : [],
      title,
    },
    title,
    twitter: {
      card: "summary",
      description,
      images: account.avatarUrl ? [account.avatarUrl] : [],
      title,
    },
  };
}

export default async function AccountRouteLayout({
  children,
  params,
}: AccountPageProps & { children: ReactNode }): Promise<JSX.Element> {
  const { username } = await params;
  const { account, client, isOwner } = await getAccountPageContext(username);

  const [header, palette] = await Promise.all([
    getAccountHeader({ accountId: account.id, client }),
    // The hero's picture lights the page, as a film's does.
    getAccountAmbientPalette(account.backgroundUrl || account.avatarUrl),
  ]);
  const { library, mutual } = header;
  const base = `/account/${encodeURIComponent(account.username)}`;

  return (
    <AccountClient
      account={account}
      followersCount={header.followersCount}
      followingCount={header.followingCount}
      initialFollowStatus={header.followStatus}
      isFollower={header.followStatus === "accepted"}
      isOwner={isOwner}
      palette={palette}
      proofSlot={mutual ? <FollowedBy mutual={mutual} /> : null}
      statsSlot={
        library ? (
          <ProfileStats
            stats={[
              {
                count: library.watched,
                href: `${base}/watched`,
                label: "Films",
              },
              {
                count: library.thisYear,
                href: `${base}/diary`,
                label: "This year",
              },
              {
                count: library.lists,
                href: `${base}/lists`,
                label: "Lists",
              },
            ]}
          />
        ) : null
      }
    >
      {children}
    </AccountClient>
  );
}
