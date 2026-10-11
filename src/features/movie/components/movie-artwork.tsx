"use client";

import { Suspense, use } from "react";
import { motion, useTransform } from "motion/react";
import { artworkTarget, useArtworkPath } from "@/features/artwork";
import { wonAcademyAward } from "@/features/awards/lib/utils";
import { AdaptiveImage, Icon } from "@/ui";
import { Foil, Projection } from "@/motion/film";
import { useScrollY } from "@/motion/scroll";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import type { Awards, MovieDetails } from "@/infrastructure/tmdb/types";
import { SCENE } from "../lib/motion";
import { Backdrop, Grade, Poster } from "../stage";
import { ease, unit, useExit } from "../stage/clock";
import { GradeContext } from "../stage/frame";
import { EASE } from "../lib/tempo";

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

const FADE = 760;
const settle = (y: number) => ease.glide(unit(y / FADE));

const FALLOFF =
  "radial-gradient(ellipse 125% 105% at 50% 32%, #000 30%, rgb(0 0 0 / 0.7))";
const shade = (mix: number, alpha: number) =>
  `color-mix(in oklab, color-mix(in oklab, rgb(var(--grade)) ${mix}%, black) ${alpha}%, transparent)`;
const CEILING = "linear-gradient(rgb(0 0 0 / 0.08), rgb(0 0 0 / 0.14))";
const WASH = [
  `radial-gradient(90% 70% at 22% 18%, ${shade(34, 68)}, transparent 74%)`,
  `radial-gradient(80% 65% at 88% 82%, ${shade(26, 64)}, transparent 74%)`,
  `linear-gradient(${shade(18, 76)}, ${shade(14, 84)})`,
].join(", ");

// Once the backdrop has drifted out of focus and off the top of the page, the
// room keeps its colour: the film's grade carries it, with a faint ghost of
// the picture behind. It fades in step with the backdrop's own fade-out, so
// the one hands over to the other. The ceiling keeps it a room tint rather than
// a second picture: however bright the film's backdrop or grade, it never
// rises past a deep shade.
function Ambient({ source }: { source: string }) {
  const scrollY = useScrollY();
  const left = useExit(SCENE.exit.backdrop);
  const grade = use(GradeContext);
  const opacity = useTransform(
    [scrollY, left],
    ([y, out]: number[]) => settle(y) * (1 - out),
  );

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{ maskImage: FALLOFF, opacity, WebkitMaskImage: FALLOFF }}
    >
      <motion.div
        animate={{ opacity: grade?.tone ? 1 : 0 }}
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        style={{ background: WASH }}
        transition={{ duration: SCENE.frame.light, ease: EASE.silk }}
      />
      <img
        alt=""
        className="absolute -inset-[8%] size-[116%] max-w-none object-cover"
        decoding="async"
        loading="lazy"
        src={source}
        style={{
          filter: "blur(24px) saturate(1.05) brightness(0.5)",
          opacity: 0.2,
        }}
      />
      <div className="absolute inset-0" style={{ background: CEILING }} />
    </motion.div>
  );
}

export function MovieBackdropHero({ movie }: { movie: Artwork }) {
  const path = useArtworkPath(
    "movie",
    movie.id,
    "backdrop",
    movie.backdropPath,
  );
  const image = tmdbImageUrl("backdrop", path, "original");
  const ambient = tmdbImageUrl("backdrop", path, "w780");
  return image ? (
    <>
      {ambient ? <Ambient source={ambient} /> : null}
      <Backdrop>
        {(reveal) => (
          <>
            <Grade source={tmdbImageUrl("backdrop", path, "w300")} />
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
