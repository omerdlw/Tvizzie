import type { JSX } from "react";
import { cn } from "@omerdlw/base-framework/utils";
import { movieHref } from "@config/routes";
import { MediaCard } from "@/ui";
import type { MediaItem } from "../../lib/browse-data";
import { GRID, posterImage } from "./poster";
import { TileActions, type TileSource } from "./tile-actions";

export function PosterTile({
  item,
  rank,
  source,
}: {
  item: MediaItem;
  rank?: number;
  source?: TileSource | null;
}) {
  const label = item.year ? `${item.title} (${item.year})` : item.title;
  return (
    <li className="group/tile relative min-w-0">
      <MediaCard
        fallbackIcon="solar:clapperboard-play-bold"
        href={movieHref(item.tmdbId)}
        image={posterImage(item.posterPath)}
        label={label}
        radius={6}
        tooltip={item.pinned ? `${label} · Favorite` : label}
      />
      {rank !== undefined ? (
        <span className="pointer-events-none absolute top-2 left-2 center h-6 min-w-6 rounded-[4px] bg-black/75 px-1.5 text-[11px] font-semibold text-white tabular-nums ring-1 ring-white/10 backdrop-blur-sm">
          {rank}
        </span>
      ) : null}
      {source ? (
        <TileActions
          pinned={item.pinned}
          source={source}
          title={item.title}
          tmdbId={item.tmdbId}
        />
      ) : null}
    </li>
  );
}

export function PosterGrid({
  className,
  items,
  numberFrom,
  source,
}: {
  className?: string;
  items: readonly MediaItem[];
  numberFrom?: number;
  source?: TileSource | null;
}): JSX.Element {
  return (
    <ul className={cn(GRID, className)}>
      {items.map((item, index) => (
        <PosterTile
          item={item}
          key={item.tmdbId}
          rank={numberFrom !== undefined ? numberFrom + index : undefined}
          source={source}
        />
      ))}
    </ul>
  );
}
