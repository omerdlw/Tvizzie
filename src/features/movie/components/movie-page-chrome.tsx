"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { usePage } from "@omerdlw/base-framework/kernel";
import { useDockActions } from "@omerdlw/base-framework/modules/dock";
import {
  useAmbientTheme,
  type AmbientPalette,
} from "@omerdlw/base-framework/modules/ambient";
import { useArtworkContextMenu, useArtworkPath } from "@/features/artwork";
import { handoffTo, useDeparture, useHeldPalette } from "@/motion/handoff";
import { MovieAction } from "@/features/reviews";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import type { MovieDetails } from "@/infrastructure/tmdb/types";
import { MOVIE_FALLBACK_ICON } from "../lib/constants";
import { describeMovie, movieSwatch } from "../lib/utils";
import { createWatchProvidersSurfaceEntry } from "./surfaces/watch-providers-surface";

export function MoviePageChrome({
  movie,
  palette = null,
}: {
  movie: MovieDetails;
  // Worked out on the server from movieSwatch of the film's own artwork.
  palette?: AmbientPalette | null;
}): null {
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
  const swatch = movieSwatch(backdropPath, posterPath);

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
  // The server's palette is taken as it is. Artwork chosen in this browser is
  // read here, from the last page's colours.
  const { palette: lit } = useAmbientTheme({
    image: swatch,
    initialPalette: palette?.source === swatch ? palette : inherited,
  });
  useHeldPalette(lit);

  return null;
}
