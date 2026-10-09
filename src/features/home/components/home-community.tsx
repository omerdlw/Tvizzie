"use client";

import { useEffect, useState, type JSX } from "react";
import Link from "next/link";
import { report } from "@omerdlw/base-framework/utils";
import { AdaptiveImage, Icon } from "@/ui";
import {
  CascadeItem,
  Section,
  SectionPart,
  TabSwap,
  useDockLinkClick,
} from "@/motion";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import { useAuth } from "@/features/auth";
import { cn } from "@omerdlw/base-framework/utils";
import { getHomeCommunityAction } from "../server/actions";
import type {
  CommunityPicks,
  HomeCommunity as Community,
  HomeList,
  HomeReview,
} from "../lib/types";
import { Heading } from "./heading";

type Tab = "everyone" | "following";

const TABS: readonly { key: Tab; label: string }[] = [
  { key: "everyone", label: "Everyone" },
  { key: "following", label: "People you follow" },
];

function Quote({ review }: { review: HomeReview }): JSX.Element {
  const href = `/movie/${review.tmdbId}/reviews?user=${encodeURIComponent(review.author.username)}`;
  const onClick = useDockLinkClick(href);

  return (
    <Link
      aria-label={`${review.author.displayName}'s review of ${review.title}`}
      className="group/quote relative flex h-full flex-col gap-5 outline-none"
      href={href}
      onClick={onClick}
      prefetch={false}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-8 -left-1 font-zuume text-[9rem] leading-none font-bold text-white/[0.06] select-none"
      >
        “
      </span>
      <span className="cine-fade relative line-clamp-6 text-xl leading-[1.45] font-light text-white/80 group-hover/quote:text-white group-focus-visible/quote:text-white sm:text-2xl">
        {review.excerpt}
      </span>
      <span className="mt-auto flex items-baseline gap-3">
        <span className="min-w-0 truncate font-zuume text-2xl leading-none font-bold text-white uppercase">
          {review.title}
        </span>
        {review.year ? (
          <span className="shrink-0 text-xs text-white/40 tabular-nums">
            {review.year}
          </span>
        ) : null}
      </span>
      <span className="-mt-3 flex items-center gap-2 text-xs font-semibold text-white/50">
        <span className="min-w-0 truncate">@{review.author.username}</span>
        {review.likesCount > 0 ? (
          <span className="inline-flex shrink-0 items-center gap-1">
            <Icon icon="solar:heart-bold" size={11} />
            {review.likesCount}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

function Stack({ list }: { list: HomeList }): JSX.Element {
  const href = `/account/${encodeURIComponent(list.owner.username)}/lists/${list.slug}`;
  const onClick = useDockLinkClick(href);
  const posters = list.previews.slice(0, 4);

  return (
    <Link
      className="group/stack flex flex-col gap-4 outline-none"
      href={href}
      onClick={onClick}
      prefetch={false}
    >
      <span className="relative block h-44 w-full">
        {posters.map((poster, position) => (
          <span
            className="absolute bottom-0 block aspect-[2/3] h-40 overflow-hidden rounded-[10px] bg-white/5 ring-1 shadow-xl shadow-black/50 ring-white/10 transition-transform duration-slow ease-out-expo group-hover/stack:-translate-y-2 group-focus-visible/stack:-translate-y-2"
            key={position}
            style={{
              left: `${position * 3.4}rem`,
              transform: `rotate(${(position - (posters.length - 1) / 2) * 4}deg)`,
              zIndex: position,
            }}
          >
            <AdaptiveImage
              alt=""
              className="object-cover"
              sizes="110px"
              src={tmdbImageUrl("poster", poster, "w185")}
              wrapperClassName="absolute inset-0"
            />
          </span>
        ))}
      </span>
      <span className="flex flex-col gap-1">
        <span className="cine-fade font-zuume text-3xl leading-[0.95] font-bold text-white/90 uppercase group-hover/stack:text-white">
          {list.title}
        </span>
        <span className="text-xs text-white/50">
          {list.itemsCount} films · @{list.owner.username}
        </span>
      </span>
    </Link>
  );
}

function Picks({ picks }: { picks: CommunityPicks }): JSX.Element {
  return (
    <div className="flex flex-col gap-16">
      {picks.reviews.length > 0 ? (
        <ul className="grid grid-cols-1 gap-x-12 gap-y-14 md:grid-cols-2">
          {picks.reviews.slice(0, 4).map((review) => (
            <CascadeItem as="li" key={review.id}>
              <Quote review={review} />
            </CascadeItem>
          ))}
        </ul>
      ) : null}
      {picks.lists.length > 0 ? (
        <ul className="grid grid-cols-1 gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {picks.lists.slice(0, 3).map((list) => (
            <CascadeItem as="li" key={list.id}>
              <Stack list={list} />
            </CascadeItem>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

const hasAny = (picks: CommunityPicks | null | undefined): boolean =>
  Boolean(picks && (picks.lists.length > 0 || picks.reviews.length > 0));

export function HomeCommunity(): JSX.Element | null {
  const auth = useAuth();
  const userId = auth.isAuthenticated ? (auth.user?.id ?? null) : null;
  const key = userId ?? "visitor";
  const [loaded, setLoaded] = useState<{
    community: Community;
    key: string;
  } | null>(null);
  const [chosen, setChosen] = useState<Tab | null>(null);

  useEffect(() => {
    if (!auth.isReady) return;
    let cancelled = false;
    getHomeCommunityAction()
      .then((result) => {
        if (cancelled) return;
        if (result.success) setLoaded({ community: result.community, key });
        else report("HomeCommunity load", result.error);
      })
      .catch((error) => report("HomeCommunity load", error));
    return () => {
      cancelled = true;
    };
  }, [auth.isReady, key]);

  const community = loaded && loaded.key === key ? loaded.community : null;
  if (!community || !hasAny(community.everyone)) return null;

  const following = community.following;
  const shown: Tab =
    following && chosen !== "everyone" ? "following" : "everyone";
  const picks =
    shown === "following" && following ? following : community.everyone;

  return (
    <Section className="grid w-full gap-8 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:gap-16">
      <div className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
        <Heading kicker="Written and made here">In their words</Heading>
        {following ? (
          <SectionPart className="flex flex-col gap-1" order={1.5}>
            {TABS.map((tab) => (
              <button
                aria-pressed={tab.key === shown}
                className={cn(
                  "cine-fade w-fit cursor-pointer text-left text-sm font-semibold",
                  tab.key === shown
                    ? "text-white"
                    : "text-white/40 hover:text-white/70",
                )}
                key={tab.key}
                onClick={() => setChosen(tab.key)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </SectionPart>
        ) : null}
      </div>
      <TabSwap id={shown}>
        <Picks picks={picks} />
      </TabSwap>
    </Section>
  );
}
