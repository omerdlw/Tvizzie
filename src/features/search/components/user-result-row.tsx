"use client";

import { Avatar, Highlight, Icon, ResultRow } from "@/ui";
import type { UserSearchHit } from "../lib/types";
import { accountHref } from "@/config/routes";

export function UserResultRow({
  onNavigated,
  query,
  user,
}: {
  onNavigated?: () => void;
  query?: string;
  user: UserSearchHit;
}) {
  const followers = `${user.followersCount} ${user.followersCount === 1 ? "follower" : "followers"}`;

  return (
    <ResultRow
      href={accountHref(user.username)}
      label={`${user.displayName}, @${user.username}`}
      meta={
        <>
          <span className="truncate">
            @<Highlight query={query} text={user.username} />
          </span>
          <span aria-hidden="true">·</span>
          <span className="shrink-0">{followers}</span>
          {user.isPrivate ? (
            <Icon aria-label="Private" icon="solar:lock-bold" size={12} />
          ) : null}
        </>
      }
      onNavigated={onNavigated}
      thumb={
        <Avatar
          className="rounded-full"
          name={user.displayName}
          size={32}
          src={user.avatarUrl}
        />
      }
      title={<Highlight query={query} text={user.displayName} />}
    />
  );
}
