"use client";

import Link from "next/link";
import { MediaCard } from "@/ui";
import { useDockLinkClick } from "@/motion";
import { tmdbImageSrcSet, tmdbImageUrl } from "@/infrastructure/tmdb/images";
import type { ListSearchHit } from "../lib/types";
import { listHref } from "../lib/utils";

const POSTER_WIDTHS = ["w185"] as const;

export function ListResultRow({
  list,
  onNavigated,
}: {
  list: ListSearchHit;
  onNavigated?: () => void;
}) {
  const href = listHref(list.owner.username, list.slug);
  const handleClick = useDockLinkClick(href, onNavigated);
  const films = `${list.itemsCount} ${list.itemsCount === 1 ? "film" : "films"}`;

  return (
    <Link
      aria-label={`${list.title}, a list by ${list.owner.displayName}`}
      className="cine-fade flex items-center gap-3 rounded-[20px] p-0.5 pr-3 outline-none hover:bg-white/10 focus-visible:bg-white/10"
      href={href}
      onClick={handleClick}
      prefetch={false}
    >
      <MediaCard
        className="w-14 shrink-0"
        fallbackIcon="solar:list-bold"
        fallbackIconSize={20}
        image={{
          sizes: "56px",
          src: tmdbImageUrl("poster", list.posterPath, "w185"),
          srcSet:
            tmdbImageSrcSet("poster", list.posterPath, POSTER_WIDTHS) ??
            undefined,
        }}
        radius={18}
      />
      <span className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
        <span className="w-full truncate text-sm leading-tight font-bold text-white">
          {list.title}
        </span>
        <span className="flex max-w-full items-center gap-1.5 text-xs font-bold text-white/70">
          <span className="shrink-0 rounded-lg px-2 py-1 ring-1 ring-white/5 ring-inset">
            {films}
          </span>
          <span className="truncate rounded-lg px-2 py-1 ring-1 ring-white/5 ring-inset">
            by @{list.owner.username}
          </span>
        </span>
      </span>
    </Link>
  );
}
