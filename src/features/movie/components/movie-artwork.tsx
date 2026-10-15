"use client";

import { Suspense, use } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useModal } from "@omerdlw/base-framework/modules/modal";
import { artworkTarget, useArtworkPath } from "@/features/artwork";
import { wonAcademyAward } from "@/features/awards/lib/utils";
import { AdaptiveImage, Icon } from "@/ui";
import { Foil, Projection } from "@/motion/film";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import type { Awards, MovieDetails } from "@/infrastructure/tmdb/types";
import { SCENE } from "../lib/motion";
import { Ambient, Backdrop, EASE, Grade, Poster, ease, unit } from "../stage";
import { ImageModal, type ImageModalData } from "./movie-modals";
import { useReel } from "./movie-reel";

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

const REEL_SIZE = "w1280";

// While a still is on the projector, a quiet slate says so and offers the
// way back to the film's own picture.
function Slate({ title }: { title: string }) {
  const { project, reel } = useReel();
  const [openImage] = useModal(ImageModal);
  return (
    <AnimatePresence>
      {reel ? (
        <motion.div
          animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
          className="absolute top-6 right-4 z-20 flex items-center gap-1 rounded-full bg-black/40 p-1 ring-1 ring-white/10 backdrop-blur-md sm:right-6 lg:right-8"
          exit={{ filter: "blur(6px)", opacity: 0, y: -8 }}
          initial={{ filter: "blur(6px)", opacity: 0, y: -8 }}
          transition={{ duration: SCENE.view.enter, ease: EASE.expo }}
        >
          <span className="px-3 text-[10px] font-semibold tracking-[0.24em] text-white/60 uppercase">
            Still
          </span>
          <button
            aria-label="View this still"
            className="cine-press center size-8 cursor-pointer rounded-full text-white/70 hover:bg-white/10 hover:text-white"
            onClick={() => {
              const src = tmdbImageUrl("backdrop", reel, "original");
              if (!src) return;
              const data: ImageModalData = { alt: `Still of ${title}`, src };
              void openImage(data as unknown as Record<string, unknown>);
            }}
            type="button"
          >
            <Icon icon="solar:maximize-square-minimalistic-linear" size={16} />
          </button>
          <button
            className="cine-press h-8 cursor-pointer rounded-full px-3 text-[11px] font-semibold tracking-[0.12em] text-white uppercase hover:bg-white/10"
            onClick={() => project(null)}
            type="button"
          >
            Back to the film
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function MovieBackdropHero({ movie }: { movie: Artwork }) {
  const path = useArtworkPath(
    "movie",
    movie.id,
    "backdrop",
    movie.backdropPath,
  );
  const { reel } = useReel();
  const image = tmdbImageUrl("backdrop", path, "original");
  const room = tmdbImageUrl("backdrop", path, "w300");
  const still = reel ? tmdbImageUrl("backdrop", reel, REEL_SIZE) : null;
  return image ? (
    <>
      {room ? <Ambient source={room} /> : null}
      <Backdrop>
        {(reveal) => (
          <>
            <Grade source={tmdbImageUrl("backdrop", reel ?? path, "w300")} />
            <Projection
              cut={SCENE.film.cut}
              defocusAt={defocusAt}
              halation={SCENE.film.halation}
              onReady={reveal}
              position="center 20%"
              reel={still}
              src={image}
            />
          </>
        )}
      </Backdrop>
      <Slate title={movie.title} />
    </>
  ) : null;
}
