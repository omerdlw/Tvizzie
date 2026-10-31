import type { JSX, ReactNode } from "react";
import type { Metadata } from "next";
import { getAccountAmbientPalette } from "../server/ambient";
import { getAccountHeader } from "../server/header";
import { ProfileStats } from "../components/browse/profile-stats";
import { getAccountPageContext } from "../server/context";
import { FollowedBy } from "@/features/social";
import { project, shareMetadata } from "@/config/project";
import { AccountShell } from "../components/account-shell";
import { accountHref } from "@/config/routes";

export async function getAccountMetadata(username: string): Promise<Metadata> {
  const { account } = await getAccountPageContext(username);

  const title = account.displayName
    ? `${account.displayName} (@${account.username})`
    : `@${account.username}`;
  return shareMetadata({
    card: "summary",
    description:
      account.bio ||
      `View ${account.displayName || account.username}'s profile on ${project.name}.`,
    image: account.avatarUrl,
    title,
  });
}

export async function AccountProfileLayout({
  children,
  username,
}: {
  children: ReactNode;
  username: string;
}): Promise<JSX.Element> {
  const { account, client, isOwner } = await getAccountPageContext(username);

  const [header, palette] = await Promise.all([
    getAccountHeader({ accountId: account.id, client }),
    getAccountAmbientPalette(account.backgroundUrl || account.avatarUrl),
  ]);
  const { library, mutual } = header;
  const base = accountHref(account.username);

  return (
    <AccountShell
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
    </AccountShell>
  );
}
