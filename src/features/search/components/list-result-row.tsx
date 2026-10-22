"use client";

import { Highlight, MediaCard, ResultRow } from "@/ui";
import { RADIUS } from "@/ui/radius";
import { tmdbImageSrcSet, tmdbImageUrl } from "@/infrastructure/tmdb/images";
import type { ListSearchHit } from "../lib/types";
import { listHref } from "../lib/utils";

const POSTER_WIDTHS = ["w185"] as const;

export function ListResultRow({
  list,
  onNavigated,
  query,
}: {
  list: ListSearchHit;
  onNavigated?: () => void;
  query?: string;
}) {
  const films = `${list.itemsCount} ${list.itemsCount === 1 ? "film" : "films"}`;

  return (
    <ResultRow
      href={listHref(list.owner.username, list.slug)}
      label={`${list.title}, a list by ${list.owner.displayName}`}
      meta={
        <>
          <span className="shrink-0">List</span>
          <span aria-hidden="true">·</span>
          <span className="shrink-0">{films}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">@{list.owner.username}</span>
        </>
      }
      onNavigated={onNavigated}
      thumb={
        <MediaCard
          fallbackIcon="solar:list-bold"
          fallbackIconSize={16}
          image={{
            sizes: "40px",
            src: tmdbImageUrl("poster", list.posterPath, "w185"),
            srcSet:
              tmdbImageSrcSet("poster", list.posterPath, POSTER_WIDTHS) ??
              undefined,
          }}
          radius={RADIUS.card}
        />
      }
      title={<Highlight query={query} text={list.title} />}
    />
  );
}
