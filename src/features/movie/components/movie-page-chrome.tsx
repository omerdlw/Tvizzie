"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { usePage } from "@omerdlw/base-framework/kernel";
import { useDockActions } from "@omerdlw/base-framework/modules/dock";
import { useAmbientTheme } from "@omerdlw/base-framework/modules/ambient";
import { useArtworkContextMenu, useArtworkPath } from "@/features/artwork";
import { handoffTo, useDeparture } from "@/motion/handoff";
import { MovieAction } from "@/features/reviews";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import type { MovieDetails } from "@/infrastructure/tmdb/types";
import { MOVIE_FALLBACK_ICON } from "../lib/constants";
import { describeMovie } from "../lib/utils";
import { createWatchProvidersSurfaceEntry } from "./surfaces/watch-providers-surface";

export function MoviePageChrome({ movie }: { movie: MovieDetails }): null {
  const posterPath = useArtworkPath(
    "movie",
    movie.id,
    "poster",
    movie.posterPath,
  );
  const backdropPath = useArtworkPath(
    "movie",
    movie.id,
    "backdrop",
    movie.backdropPath,
  );
  const poster = tmdbImageUrl("poster", posterPath, "original");
  const backdrop = tmdbImageUrl("backdrop", backdropPath, "original");

  useArtworkContextMenu({
    defaults: { backdrop: movie.backdropPath, poster: movie.posterPath },
    id: movie.id,
    kind: "movie",
  });

  const { openSurface } = useDockActions();
  const hasProviders = Object.keys(movie.watchProviders).length > 0;

  const action = useMemo(
    () => (
      <MovieAction
        hasProviders={hasProviders}
        movieId={movie.id}
        onOpenProviders={() =>
          void openSurface(
            createWatchProvidersSurfaceEntry({
              movieId: movie.id,
              title: movie.title,
            }),
          )
        }
        title={movie.title}
      />
    ),
    [hasProviders, movie.id, movie.title, openSurface],
  );

  const pathname = usePathname();
  const departure = useDeparture(pathname);

  usePage({
    title: movie.title,
    dock: {
      action,
      description: describeMovie(movie) || undefined,
      icon: poster ?? MOVIE_FALLBACK_ICON,
      name: `movie-${movie.id}`,
      targetPath: departure,
    },
  });
  const [inherited] = useState(() => handoffTo(pathname)?.palette ?? undefined);
  useAmbientTheme({ image: backdrop ?? poster, initialPalette: inherited });

  return null;
}
