"use client";

import { Suspense, use } from "react";
import { artworkTarget, useArtworkPath } from "@/features/artwork";
import { wonAcademyAward } from "@/features/awards/lib/utils";
import { AdaptiveImage, Icon } from "@/ui";
import { Foil, Projection } from "@/motion/film";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import type { Awards, MovieDetails } from "@/infrastructure/tmdb/types";
import { SCENE } from "../lib/motion";
import { Backdrop, Grade, Poster } from "../stage";
import { ease, unit } from "../stage/clock";

type Artwork = Pick<
  MovieDetails,
  "backdropPath" | "id" | "posterPath" | "title"
>;

type Light = Parameters<NonNullable<Parameters<typeof Poster>[0]["light"]>>[0];

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

export function MoviePoster({
  awards,
  movie,
}: {
  awards?: Promise<Awards | null>;
  movie: Artwork;
}) {
  const path = useArtworkPath("movie", movie.id, "poster", movie.posterPath);

  return (
    <Poster
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
        alt={`${movie.title} poster`}
        className="object-cover"
        fallback={
          <div className="center h-full w-full text-white/50 ring-1 ring-white/5 ring-inset">
            <Icon icon="solar:clapperboard-play-bold" size={40} />
          </div>
        }
        fetchPriority="high"
        loading="eager"
        sizes="(min-width: 1280px) 384px, (min-width: 1024px) 320px, 320px"
        src={tmdbImageUrl("poster", path, "original")}
      />
    </Poster>
  );
}

const [FROM, TO] = SCENE.scrub.defocus.range;
const defocusAt = (y: number) => ease.glide(unit((y - FROM) / (TO - FROM)));

export function MovieBackdropHero({ movie }: { movie: Artwork }) {
  const path = useArtworkPath(
    "movie",
    movie.id,
    "backdrop",
    movie.backdropPath,
  );
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
