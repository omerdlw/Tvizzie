import type { JSX } from "react";
import { movieHref } from "@config/routes";
import { Icon, MediaCard } from "@/ui";
import type { MediaItem } from "../../lib/browse-data";
import { GRID, posterImage } from "./poster";
import { TileActions, type TileSource } from "./tile-actions";

export function PosterGrid({
  items,
  numberFrom,
  source,
}: {
  items: readonly MediaItem[];
  numberFrom?: number;
  source?: TileSource | null;
}): JSX.Element {
  return (
    <div className={GRID}>
      {items.map((item, index) => (
        <div className="group/tile relative min-w-0" key={item.tmdbId}>
          <MediaCard
            caption={
              <>
                <span className="truncate px-1 text-xs font-semibold text-white/80">
                  {item.title}
                </span>
                {item.year ? (
                  <span className="-mt-1 px-1 text-[11px] font-semibold text-white/40">
                    {item.year}
                  </span>
                ) : null}
              </>
            }
            fallbackIcon="solar:clapperboard-play-bold"
            href={movieHref(item.tmdbId)}
            image={posterImage(item.posterPath)}
            label={item.year ? `${item.title} (${item.year})` : item.title}
            overlay={
              numberFrom !== undefined ? (
                <span className="pointer-events-none absolute bottom-2 left-2 rounded-lg bg-black/70 px-2 py-0.5 font-mono text-xs font-bold text-white">
                  {numberFrom + index}
                </span>
              ) : item.pinned ? (
                <span className="pointer-events-none absolute bottom-2 left-2 text-amber-400">
                  <Icon icon="solar:star-bold" size={16} />
                </span>
              ) : null
            }
          />
          {source ? (
            <TileActions
              pinned={item.pinned}
              source={source}
              title={item.title}
              tmdbId={item.tmdbId}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}
