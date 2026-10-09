"use client";

import { useArtworkPath } from "@/features/artwork";
import { Flowing } from "@/motion/flow";
import { Intermission } from "@/motion/film";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import type { MovieDetails } from "@/infrastructure/tmdb/types";
import { SCENE } from "../lib/motion";
import { EASE } from "../lib/tempo";
import { useLeaving } from "../stage";

export function MovieProjection({
  movie,
}: {
  movie: Pick<MovieDetails, "backdropPath" | "id" | "title">;
}) {
  const leaving = useLeaving();
  const { intermission } = SCENE.film;
  const path = useArtworkPath(
    "movie",
    movie.id,
    "backdrop",
    movie.backdropPath,
  );

  return (
    <>
      <Flowing ease={EASE.glide} run={SCENE.flow.run} />
      <Intermission
        {...intermission}
        ease={EASE.silk}
        image={tmdbImageUrl("backdrop", path, "original")}
        paused={leaving}
        title={movie.title}
      />
    </>
  );
}
