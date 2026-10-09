"use client";

import { useMemo, useState, type JSX } from "react";
import Link from "next/link";
import {
  useDockActions,
  type SurfaceEntry,
} from "@omerdlw/base-framework/modules/dock";
import { RatingStars } from "@/features/reviews/components/rating-stars";
import { Avatar, Icon, SegmentedControl } from "@/ui";
import type { Friend, MovieSocialProof } from "../lib/types";
import { matchesTab, type ProofTab } from "../lib/utils";

interface SocialProofSurfaceData {
  movieId: number;
  proof: MovieSocialProof;
  title: string;
}

export function createSocialProofSurfaceEntry(
  data: SocialProofSurfaceData,
): SurfaceEntry {
  return {
    component: SocialProofSurface,
    description: data.title,
    icon: "solar:users-group-rounded-bold",
    props: { data },
    title: "People you follow",
  };
}

function Signal({
  active,
  icon,
  label,
}: {
  active: boolean;
  icon: string;
  label: string;
}): JSX.Element | null {
  if (!active) return null;
  return (
    <span className="text-white/70" title={label}>
      <Icon aria-label={label} icon={icon} size={15} />
    </span>
  );
}

function FriendRow({
  close,
  friend,
  movieId,
}: {
  close: () => void;
  friend: Friend;
  movieId: number;
}): JSX.Element {
  return (
    <li className="flex items-center gap-3 rounded-[16px] p-2 transition-colors duration-fast hover:bg-white/5">
      <Link
        className="flex min-w-0 flex-1 items-center gap-3"
        href={`/account/${friend.username}`}
        onClick={close}
        prefetch={false}
      >
        <Avatar
          className="rounded-[14px]"
          name={friend.displayName}
          size={40}
          src={friend.avatarUrl}
        />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm leading-tight font-semibold text-white">
            {friend.displayName}
          </span>
          <span className="truncate text-xs leading-tight text-white/70">
            @{friend.username}
          </span>
        </span>
      </Link>

      <span className="flex shrink-0 items-center gap-2.5">
        {friend.rating !== null ? (
          <RatingStars rating={friend.rating} size={12} />
        ) : null}
        <Signal active={friend.watched} icon="solar:eye-bold" label="Watched" />
        <Signal active={friend.liked} icon="solar:heart-bold" label="Liked" />
        <Signal
          active={friend.watchlisted}
          icon="solar:bookmark-bold"
          label="Wants to watch"
        />
        {friend.reviewed ? (
          <Link
            aria-label={`Read ${friend.displayName}'s review`}
            className="text-white/70 transition-colors duration-fast hover:text-white"
            href={`/movie/${movieId}/reviews?user=${encodeURIComponent(friend.username)}`}
            onClick={close}
            prefetch={false}
            title="Read review"
          >
            <Icon icon="solar:chat-round-bold" size={15} />
          </Link>
        ) : null}
      </span>
    </li>
  );
}

function SocialProofSurface({
  data,
}: {
  data: SocialProofSurfaceData;
}): JSX.Element {
  const { closeSurface } = useDockActions();
  const { counts, friends } = data.proof;
  const [tab, setTab] = useState<ProofTab>("all");

  const tabs = useMemo(() => {
    const all: { count: number; key: ProofTab; label: string }[] = [
      { count: friends.length, key: "all", label: "All" },
      { count: counts.watched, key: "watched", label: "Watched" },
      { count: counts.liked, key: "liked", label: "Liked" },
      { count: counts.watchlist, key: "watchlist", label: "To watch" },
      { count: counts.reviews, key: "reviews", label: "Reviews" },
    ];
    return all
      .filter((item) => item.key === "all" || item.count > 0)
      .map((item) => ({
        key: item.key,
        label: `${item.label} ${item.count}`,
      }));
  }, [counts, friends.length]);

  const visible = useMemo(
    () => friends.filter((friend) => matchesTab(friend, tab)),
    [friends, tab],
  );

  return (
    <div className="flex w-full flex-col gap-3">
      {tabs.length > 2 ? (
        <SegmentedControl
          ariaLabel="Filter by what they did"
          items={tabs}
          onChange={setTab}
          value={tab}
        />
      ) : null}

      <ul className="flex max-h-[50vh] flex-col gap-0.5 overflow-y-auto">
        {visible.map((friend) => (
          <FriendRow
            close={() => closeSurface?.()}
            friend={friend}
            key={friend.id}
            movieId={data.movieId}
          />
        ))}
      </ul>

      {data.proof.total > friends.length ? (
        <p className="text-center text-xs text-white/50">
          Showing the {friends.length} most recent of {data.proof.total}.
        </p>
      ) : null}
    </div>
  );
}
