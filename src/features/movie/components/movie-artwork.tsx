"use client";

import { AnimatePresence, motion } from "motion/react";
import { useModal } from "@omerdlw/base-framework/modules/modal";
import { ArtworkPoster, useArtworkPath } from "@/features/artwork";
import { Icon, TONE } from "@/ui";
import { Projection } from "@/motion/film";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import type { Awards, MovieDetails } from "@/infrastructure/tmdb/types";
import { SCENE } from "../lib/motion";
import { Ambient, Backdrop, ease, EASE, Grade, unit } from "@/motion/stage";
import { ImageModal, type ImageModalData } from "./movie-modals";
import { useReel } from "./movie-reel";

type Artwork = Pick<
  MovieDetails,
  "backdropPath" | "id" | "posterPath" | "title"
>;

export function MoviePoster({
  awards,
  movie,
}: {
  awards?: Promise<Awards | null>;
  movie: Artwork;
}) {
  const path = useArtworkPath("movie", movie.id, "poster", movie.posterPath);

  return (
    <ArtworkPoster
      alt={`${movie.title} poster`}
      awards={awards}
      className="@container w-full shrink-0"
      fallbackIcon="solar:clapperboard-play-bold"
      frameClassName="h-[round(150cqw,1px)]"
      path={path}
      src={tmdbImageUrl("poster", path, "w780")}
    />
  );
}

const [FROM, TO] = SCENE.scrub.defocus.range;
const defocusAt = (y: number) => ease.glide(unit((y - FROM) / (TO - FROM)));

const REEL_SIZE = "w1280";

function Slate({ title }: { title: string }) {
  const { project, reel } = useReel();
  const [openImage] = useModal(ImageModal);
  return (
    <AnimatePresence>
      {reel ? (
        <motion.div
          animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
          className="absolute top-6 right-4 z-20 flex items-center gap-1 rounded-full bg-black/60 p-1 shadow-[0_14px_32px_-16px_rgb(0_0_0/0.85)] ring-1 ring-white/[0.08] backdrop-blur-md backdrop-saturate-150 ring-inset inset-shadow-[0_1px_0_rgb(255_255_255/0.07)] sm:right-6 lg:right-8"
          exit={{ filter: "blur(6px)", opacity: 0, y: -8 }}
          initial={{ filter: "blur(6px)", opacity: 0, y: -8 }}
          transition={{ duration: SCENE.view.enter, ease: EASE.expo }}
        >
          <span className={`px-3 ${TONE.label} text-white/50`}>Still</span>
          <button
            aria-label="View this still"
            className="cine-fade center size-8 cursor-pointer rounded-full text-white/70 hover:bg-white/10 hover:text-white"
            onClick={() => {
              const src = tmdbImageUrl("backdrop", reel, "original");
              if (!src) return;
              const data: ImageModalData = { alt: `Still of ${title}`, src };
              void openImage(data);
            }}
            type="button"
          >
            <Icon icon="solar:maximize-square-minimalistic-linear" size={16} />
          </button>
          <button
            className="cine-fade h-8 cursor-pointer rounded-full px-3 text-[13px] font-medium text-white hover:bg-white/10"
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
      {room ? <Ambient rises={false} source={room} /> : null}
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
