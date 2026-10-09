"use client";

import Link from "next/link";
import { Avatar, Icon } from "@/ui";
import { useDockLinkClick } from "@/motion";
import type { UserSearchHit } from "../lib/types";
import { userHref } from "../lib/utils";

export function UserResultRow({
  onNavigated,
  user,
}: {
  onNavigated?: () => void;
  user: UserSearchHit;
}) {
  const href = userHref(user.username);
  const handleClick = useDockLinkClick(href, onNavigated);
  const followers = `${user.followersCount} ${user.followersCount === 1 ? "follower" : "followers"}`;

  return (
    <Link
      aria-label={`${user.displayName}, @${user.username}`}
      className="cine-fade flex items-center gap-3 rounded-[20px] p-0.5 pr-3 outline-none hover:bg-white/10 focus-visible:bg-white/10"
      href={href}
      onClick={handleClick}
      prefetch={false}
    >
      <Avatar
        className="rounded-[18px]"
        name={user.displayName}
        size={56}
        src={user.avatarUrl}
      />
      <span className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
        <span className="w-full truncate text-sm leading-tight font-bold text-white">
          {user.displayName}
        </span>
        <span className="flex max-w-full items-center gap-1.5 text-xs font-bold text-white/70">
          <span className="truncate rounded-lg px-2 py-1 ring-1 ring-white/5 ring-inset">
            @{user.username}
          </span>
          <span className="shrink-0 rounded-lg px-2 py-1 ring-1 ring-white/5 ring-inset">
            {followers}
          </span>
          {user.isPrivate ? (
            <Icon aria-label="Private" icon="solar:lock-bold" size={13} />
          ) : null}
        </span>
      </span>
    </Link>
  );
}
