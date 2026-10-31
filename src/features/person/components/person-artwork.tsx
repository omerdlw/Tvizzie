"use client";

import { ArtworkPoster, useArtworkPath } from "@/features/artwork";
import { Projection } from "@/motion/film";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import type { Awards, PersonDetails } from "@/infrastructure/tmdb/types";
import { PERSON_FALLBACK_ICON } from "../lib/constants";
import { SCENE } from "../lib/motion";
import { Ambient, Backdrop, ease, Grade, unit } from "@/motion/stage";

export function PersonPortrait({
  awards,
  person,
}: {
  awards?: Promise<Awards | null>;
  person: Pick<PersonDetails, "id" | "name" | "profilePath">;
}) {
  const path = useArtworkPath(
    "person",
    person.id,
    "poster",
    person.profilePath,
  );

  return (
    <ArtworkPoster
      alt={person.name}
      awards={awards}
      fallbackIcon={PERSON_FALLBACK_ICON}
      frameClassName="aspect-[2/3]"
      path={path}
      src={tmdbImageUrl("profile", path, "h632")}
    />
  );
}

const [FROM, TO] = SCENE.scrub.defocus.range;
const defocusAt = (y: number) => ease.glide(unit((y - FROM) / (TO - FROM)));

export function PersonBackdropHero({
  fallback,
  person,
}: {
  fallback: string | null;
  person: Pick<PersonDetails, "id" | "profilePath">;
}) {
  const path = useArtworkPath("person", person.id, "backdrop", fallback);
  const image = tmdbImageUrl("backdrop", path, "original");
  const room = tmdbImageUrl("backdrop", path, "w300");
  return image ? (
    <>
      {room ? <Ambient source={room} /> : null}
      <Backdrop>
        {(reveal) => (
          <>
            <Grade source={room} />
            <Projection
              defocusAt={defocusAt}
              halation={SCENE.film.halation}
              onReady={reveal}
              position="center 20%"
              src={image}
            />
          </>
        )}
      </Backdrop>
    </>
  ) : null;
}

export function PersonPhotoGrade({
  person,
}: {
  person: Pick<PersonDetails, "id" | "profilePath">;
}) {
  const path = useArtworkPath(
    "person",
    person.id,
    "poster",
    person.profilePath,
  );
  const photo = tmdbImageUrl("profile", path, "w185");
  return (
    <>
      {photo ? <Ambient source={photo} /> : null}
      <Grade source={photo} />
    </>
  );
}
