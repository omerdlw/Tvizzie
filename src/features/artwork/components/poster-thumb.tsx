"use client";

import { AdaptiveImage, Icon } from "@/ui";
import { useArtworkPath } from "../lib/hooks";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";

export function PosterThumb({
  className,
  movieId,
  original = false,
  posterPath,
}: {
  className: string;
  movieId: number | null;
  original?: boolean;
  posterPath: string | null;
}) {
  const path = useArtworkPath("movie", movieId ?? 0, "poster", posterPath);

  return (
    <div
      className={`relative aspect-[2/3] shrink-0 overflow-hidden rounded-[12px] bg-white/5 ring-1 ring-white/5 ring-inset ${className}`}
    >
      <AdaptiveImage
        alt=""
        className="object-cover"
        fallback={
          <div className="center h-full w-full text-white/30">
            <Icon icon="solar:clapperboard-play-bold" size={16} />
          </div>
        }
        sizes="80px"
        src={tmdbImageUrl("poster", path, original ? "original" : "w92")}
      />
    </div>
  );
}
