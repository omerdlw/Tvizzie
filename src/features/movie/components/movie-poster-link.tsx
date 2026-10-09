"use client";

import type { ReactNode } from "react";
import { useArtworkPath } from "@/features/artwork";
import { MediaCard } from "@/ui";
import { tmdbImageSrcSet, tmdbImageUrl } from "@/infrastructure/tmdb/images";
import { movieHref } from "../lib/utils";

interface MoviePosterLinkProps {
  movie: {
    id: number;
    posterPath: string | null;
    title: string;
    year: number | null;
  };
  caption?: boolean;
  detail?: string | null;
  onNavigated?: () => void;
  original?: boolean;
  overlay?: ReactNode;
  sizes?: string;
}

const POSTER_WIDTHS = ["w185", "w342"] as const;

export function MoviePosterLink({
  caption = true,
  detail = null,
  movie,
  onNavigated,
  original = false,
  overlay,
  sizes = "110px",
}: MoviePosterLinkProps) {
  const posterPath = useArtworkPath(
    "movie",
    movie.id,
    "poster",
    movie.posterPath,
  );
  const title = movie.year ? `${movie.title} (${movie.year})` : movie.title;
  const label = detail ? `${title}, ${detail}` : title;

  return (
    <MediaCard
      caption={
        caption ? (
          <>
            <span className="truncate px-1 text-xs font-semibold text-white/70">
              {movie.title}
            </span>
            {movie.year ? (
              <span className="-mt-1 px-1 text-[11px] font-semibold text-white/50">
                {movie.year}
              </span>
            ) : null}
          </>
        ) : undefined
      }
      fallbackIcon="solar:clapperboard-play-bold"
      href={movieHref(movie.id)}
      image={{
        sizes,
        src: tmdbImageUrl("poster", posterPath, original ? "original" : "w342"),
        srcSet: original
          ? undefined
          : (tmdbImageSrcSet("poster", posterPath, POSTER_WIDTHS) ?? undefined),
      }}
      label={label}
      onNavigated={onNavigated}
      overlay={overlay}
      tooltip={caption ? undefined : label}
    />
  );
}
