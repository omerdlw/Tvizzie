"use client";

import { useId, useMemo, useState, type JSX } from "react";
import Link from "next/link";
import { LayoutGroup } from "motion/react";
import { accountHref, reviewHref } from "@/config/routes";
import {
  useDockActions,
  type SurfaceEntry,
} from "@omerdlw/base-framework/modules/dock";
import { RatingStars } from "@/features/reviews";
import {
  Avatar,
  Icon,
  scrollWithin,
  SURFACE_META,
  SURFACE_SCROLL,
  SURFACE_STACK,
  SURFACE_TEXT,
  SURFACE_TILE,
  SURFACE_TILE_END,
  SURFACE_TILE_INNER,
  SURFACE_TITLE,
  SurfaceSegmentedControl,
} from "@/ui";
import { SlidingHighlight } from "@/ui/sliding-highlight";
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
    <span
      className="text-white/55 group-hover/friend:text-white/80"
      title={label}
    >
      <Icon aria-label={label} icon={icon} size={15} />
    </span>
  );
}

function FriendRow({
  close,
  friend,
  highlighted,
  movieId,
  onFocus,
  onPointerEnter,
}: {
  close: () => void;
  friend: Friend;
  highlighted: boolean;
  movieId: number;
  onFocus: () => void;
  onPointerEnter: () => void;
}): JSX.Element {
  return (
    <li
      className={`relative isolate ${SURFACE_TILE} group/friend ${SURFACE_TILE_END}`}
      onFocusCapture={onFocus}
      onPointerEnter={onPointerEnter}
    >
      {highlighted ? (
        <SlidingHighlight
          className="rounded-[16px] bg-white/[0.04] ring-1 ring-white/[0.08] ring-inset"
          layoutId="social-proof-friend-highlight"
        />
      ) : null}
      <Link
        className={`relative z-10 flex min-w-0 flex-1 items-center gap-3 ${SURFACE_TILE_INNER}`}
        href={accountHref(friend.username)}
        onClick={close}
        prefetch={false}
      >
        <Avatar
          className={SURFACE_TILE_INNER}
          name={friend.displayName}
          size={40}
          src={friend.avatarUrl}
        />
        <span className={SURFACE_TEXT}>
          <span className={SURFACE_TITLE}>{friend.displayName}</span>
          <span className={`${SURFACE_META} group-hover/friend:text-white/70`}>
            @{friend.username}
          </span>
        </span>
      </Link>

      <span className="relative z-10 flex shrink-0 items-center gap-2.5">
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
            className="center -m-1.5 size-7 rounded-full text-white/55 group-hover/friend:text-white/80 hover:bg-white/[0.08] hover:text-white"
            href={reviewHref(movieId, friend.username)}
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
  const highlightGroupId = useId();
  const [tab, setTab] = useState<ProofTab>("all");
  const [hoveredFriend, setHoveredFriend] = useState<string | null>(null);
  const [focusedFriend, setFocusedFriend] = useState<string | null>(null);

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
      .map(({ count, key, label }) => ({ count, key, label }));
  }, [counts, friends.length]);

  const visible = useMemo(
    () => friends.filter((friend) => matchesTab(friend, tab)),
    [friends, tab],
  );
  const activeFriend = visible.some((friend) => friend.id === hoveredFriend)
    ? hoveredFriend
    : visible.some((friend) => friend.id === focusedFriend)
      ? focusedFriend
      : null;

  return (
    <div className={SURFACE_STACK}>
      {tabs.length > 2 ? (
        <SurfaceSegmentedControl
          ariaLabel="Filter by what they did"
          id="social-proof-tabs"
          items={tabs}
          onChange={setTab}
          value={tab}
        />
      ) : null}

      <LayoutGroup id={`social-proof-${highlightGroupId}`}>
        <ul
          className={`${SURFACE_SCROLL} flex max-h-[min(56dvh,26rem)] flex-col gap-2.5`}
          data-lenis-prevent
          data-lenis-prevent-wheel
          onBlurCapture={(event) => {
            if (
              !(event.relatedTarget instanceof Node) ||
              !event.currentTarget.contains(event.relatedTarget)
            ) {
              setFocusedFriend(null);
            }
          }}
          onPointerLeave={() => setHoveredFriend(null)}
          onWheel={scrollWithin}
        >
          {visible.map((friend) => (
            <FriendRow
              close={() => closeSurface?.()}
              friend={friend}
              highlighted={activeFriend === friend.id}
              key={friend.id}
              movieId={data.movieId}
              onFocus={() => setFocusedFriend(friend.id)}
              onPointerEnter={() => setHoveredFriend(friend.id)}
            />
          ))}
        </ul>
      </LayoutGroup>

      {data.proof.total > friends.length ? (
        <p className="text-center text-xs text-white/50">
          Showing the {friends.length} most recent of {data.proof.total}.
        </p>
      ) : null}
    </div>
  );
}
