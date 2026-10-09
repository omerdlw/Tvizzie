"use client";

import { Suspense, use } from "react";
import { artworkTarget, useArtworkPath } from "@/features/artwork";
import { wonAcademyAward } from "@/features/awards/lib/utils";
import { AdaptiveImage, Icon } from "@/ui";
import { Foil, Projection } from "@/motion/film";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import type { Awards, PersonDetails } from "@/infrastructure/tmdb/types";
import { PERSON_FALLBACK_ICON } from "../lib/constants";
import { SCENE } from "../lib/motion";
import { Backdrop, Grade, Portrait } from "../stage";
import { ease, unit } from "../stage/clock";

type Light = Parameters<
  NonNullable<Parameters<typeof Portrait>[0]["light"]>
>[0];

function AwardFoil({
  awards,
  light,
}: {
  awards: Promise<Awards | null>;
  light: Light;
}) {
  const known = use(awards);
  return known && wonAcademyAward(known) ? <Foil {...light} /> : null;
}

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
    <Portrait
      className="w-full shrink-0"
      light={
        awards
          ? (light) => (
              <Suspense fallback={null}>
                <AwardFoil awards={awards} light={light} />
              </Suspense>
            )
          : undefined
      }
      target={artworkTarget("poster", path)}
    >
      <AdaptiveImage
        alt={person.name}
        className="object-cover"
        fallback={
          <div className="center h-full w-full text-white/50 ring-1 ring-white/5 ring-inset">
            <Icon icon={PERSON_FALLBACK_ICON} size={40} />
          </div>
        }
        fetchPriority="high"
        loading="eager"
        sizes="(min-width: 1280px) 384px, (min-width: 1024px) 320px, 320px"
        src={tmdbImageUrl("profile", path, "original")}
      />
    </Portrait>
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
  return image ? (
    <Backdrop>
      <Grade source={tmdbImageUrl("backdrop", path, "w300")} />
      <Projection
        defocusAt={defocusAt}
        halation={SCENE.film.halation}
        position="center 20%"
        src={image}
      />
    </Backdrop>
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
  return <Grade source={tmdbImageUrl("profile", path, "w185")} />;
}
