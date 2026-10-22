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
  detail?: string | null;
  carried?: boolean;
  onNavigated?: () => void;
  overlay?: ReactNode;
  sizes?: string;
}

const POSTER_WIDTHS = ["w185", "w342"] as const;
// A card that flies to the film's page lands on its poster: it is drawn at
// the poster's own size, so the flight is sharp and the landing is a picture
// already decoded, without the cost of the full-size original.
const CARRIED = "w780";

// Holds a poster's place, so a short last page of a grid keeps the height
// of a full one.
export function MoviePosterPlaceholder() {
  return <MediaCard framed={false} image={{ src: null }} />;
}

export function MoviePosterLink({
  carried = false,
  detail = null,
  movie,
  onNavigated,
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
      fallbackIcon="solar:clapperboard-play-bold"
      href={movieHref(movie.id)}
      image={{
        sizes,
        src: tmdbImageUrl("poster", posterPath, carried ? CARRIED : "w342"),
        srcSet: carried
          ? undefined
          : (tmdbImageSrcSet("poster", posterPath, POSTER_WIDTHS) ?? undefined),
      }}
      label={label}
      onNavigated={onNavigated}
      overlay={overlay}
      tooltip={label}
    />
  );
}
