"use client";

import { useArtworkPath } from "@/features/artwork";
import { Flowing } from "@/motion/flow";
import { Intermission } from "@/motion/film";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import type { PersonDetails } from "@/infrastructure/tmdb/types";
import { SCENE } from "../lib/motion";
import { EASE } from "../lib/tempo";
import { useLeaving } from "../stage";

export function PersonProjection({
  backdrop,
  person,
}: {
  backdrop: string | null;
  person: Pick<PersonDetails, "id" | "name" | "profilePath">;
}) {
  const leaving = useLeaving();
  const { intermission } = SCENE.film;
  const path = useArtworkPath("person", person.id, "backdrop", backdrop);
  const photo = useArtworkPath(
    "person",
    person.id,
    "poster",
    person.profilePath,
  );
  const image =
    tmdbImageUrl("backdrop", path, "original") ??
    tmdbImageUrl("profile", photo, "original");

  return (
    <>
      <Flowing ease={EASE.glide} run={SCENE.flow.run} />
      <Intermission
        {...intermission}
        ease={EASE.silk}
        image={image}
        paused={leaving}
        title={person.name}
      />
    </>
  );
}
