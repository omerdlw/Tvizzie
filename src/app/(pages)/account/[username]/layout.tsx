import type { JSX, ReactNode } from "react";
import type { Metadata } from "next";
import { report } from "@omerdlw/base-framework/utils";
import {
  getAccountFollowCounts,
  getAccountFollowRelation,
} from "@/features/account/server";
import { getAccountPageContext } from "@/features/account/server/context";
import { getAccountLibrarySummary } from "@/features/account/server/library-summary";
import { FollowedBy } from "@/features/social";
import { readMutualFollowers } from "@/features/social/server/queries";
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
  const { account, client, isOwner, viewerId } =
    await getAccountPageContext(username);

  const [relation, counts, library, mutual] = await Promise.all([
    getAccountFollowRelation({
      client,
      viewerId: viewerId ?? undefined,
      targetId: account.id,
    }),
    getAccountFollowCounts({ client, accountId: account.id }),
    getAccountLibrarySummary({ client, accountId: account.id }),
    viewerId && !isOwner
      ? readMutualFollowers(client, account.id).catch((error) => {
          report("Mutual followers read", error);
          return null;
        })
      : null,
  ]);

  return (
    <AccountClient
      account={account}
      followersCount={counts.followersCount}
      followingCount={counts.followingCount}
      initialFollowStatus={relation.status}
      isFollower={relation.isFollower}
      isOwner={isOwner}
      libraryCounts={library.counts}
      proofSlot={mutual ? <FollowedBy mutual={mutual} /> : null}
    >
      {children}
    </AccountClient>
  );
}
