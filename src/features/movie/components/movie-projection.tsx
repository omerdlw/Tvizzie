"use client";

import { useArtworkPath } from "@/features/artwork";
import { Flowing } from "@/motion/flow";
import { Intermission } from "@/motion/film";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import type { MovieDetails } from "@/infrastructure/tmdb/types";
import { SCENE } from "../lib/motion";
import { EASE, useLeaving, useWall } from "@/motion/stage";
import { readable } from "@/motion/gl";

const pictureOf = (src: string | null) => (src ? readable(src) : null);

export function MovieProjection({
  movie,
}: {
  movie: Pick<MovieDetails, "backdropPath" | "id" | "title">;
}) {
  const leaving = useLeaving();
  const away = (useWall()?.phase ?? "page") !== "page";
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
        image={pictureOf(tmdbImageUrl("backdrop", path, "original"))}
        paused={leaving || away}
        title={movie.title}
      />
    </>
  );
}
