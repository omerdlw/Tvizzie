"use client";

import { useArtworkPath } from "@/features/artwork";
import { Flowing } from "@/motion/flow";
import { Intermission } from "@/motion/film";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import type { PersonDetails } from "@/infrastructure/tmdb/types";
import { SCENE } from "../lib/motion";
import { EASE, useLeaving, useWall } from "@/motion/stage";
import { readable } from "@/motion/gl";

export function PersonProjection({
  backdrop,
  person,
}: {
  backdrop: string | null;
  person: Pick<PersonDetails, "id" | "name" | "profilePath">;
}) {
  const leaving = useLeaving();
  const away = (useWall()?.phase ?? "page") !== "page";
  const { intermission } = SCENE.film;
  const path = useArtworkPath("person", person.id, "backdrop", backdrop);
  const photo = useArtworkPath(
    "person",
    person.id,
    "poster",
    person.profilePath,
  );
  const picture = tmdbImageUrl("backdrop", path, "original");
  const image = picture
    ? readable(picture)
    : tmdbImageUrl("profile", photo, "original");

  return (
    <>
      <Flowing ease={EASE.glide} run={SCENE.flow.run} />
      <Intermission
        {...intermission}
        ease={EASE.silk}
        image={image}
        paused={leaving || away}
        title={person.name}
      />
    </>
  );
}
