import { StickyAside } from "@/ui";
import { Suspense, type JSX } from "react";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import type { Awards, MovieDetails } from "@/infrastructure/tmdb/types";
import {
  AFTER_TAGLINE,
  ASIDE_CLASS,
  COLUMNS_CLASS,
  CONTAINER_CLASS,
  HEADER_CLASS,
  OVERVIEW_CLASS,
  PAGE_CLASS,
  RULE_GAP,
  TAGLINE_CLASS,
  pageBodyClass,
  titleClass,
} from "../lib/layout";
import { SCENE } from "../lib/motion";
import { Body, Hairline, Sequence, Layer, Stage, Title, Words } from "../stage";
import type { PersonEntry } from "../lib/types";
import {
  getCast,
  getCrew,
  getGalleryImages,
  getPaletteImages,
  getPosterImages,
  getVideoTypes,
} from "../lib/utils";
import { MovieBackdropHero } from "./movie-artwork";
import { MovieAwards } from "./movie-awards";
import { MovieGallery } from "./movie-gallery";
import { MoviePalette } from "./movie-palette";
import { MoviePeople } from "./movie-people";
import { MovieProjection } from "./movie-projection";
import { MovieRecommendations } from "./movie-recommendations";
import { MovieReviews } from "./movie-reviews";
import { MovieSidebar } from "./movie-sidebar";
import { MovieViewProvider, MovieViews } from "./movie-views";
import { MovieVideos } from "./movie-videos";

export function MovieView({
  awards,
  movie,
}: {
  awards: Promise<Awards | null>;
  movie: MovieDetails;
}): JSX.Element {
  const backdrop = tmdbImageUrl("backdrop", movie.backdropPath, "original");

  const cast: PersonEntry[] = getCast(movie).map((member) => ({
    id: member.id,
    key: member.creditId,
    name: member.name,
    profilePath: member.profilePath,
    subtitle: member.character ?? "Cast",
  }));
  const crew: PersonEntry[] = getCrew(movie).map((member) => ({
    id: member.id,
    key: `${member.id}-${member.creditId}`,
    name: member.name,
    profilePath: member.profilePath,
    subtitle: member.jobs,
  }));

  return (
    <Stage className={PAGE_CLASS}>
      <MovieProjection movie={movie} />
      <div className={CONTAINER_CLASS}>
        {backdrop ? <MovieBackdropHero movie={movie} /> : null}

        <Body className={pageBodyClass(Boolean(backdrop))}>
          <MovieViewProvider>
            <div className={COLUMNS_CLASS}>
              <Sequence as="header" className={HEADER_CLASS}>
                <Layer {...SCENE.layers.title}>
                  <Title className={titleClass(movie.title)}>
                    {movie.title}
                  </Title>
                </Layer>
                {movie.tagline || movie.overview ? (
                  <Layer className={RULE_GAP} {...SCENE.layers.rule}>
                    <Hairline />
                  </Layer>
                ) : null}
                {movie.tagline ? (
                  <Layer {...SCENE.layers.tagline}>
                    <Words
                      {...SCENE.tagline}
                      className={TAGLINE_CLASS}
                      alpha={0.92}
                    >
                      {movie.tagline}
                    </Words>
                  </Layer>
                ) : null}
                {movie.overview ? (
                  <Layer {...SCENE.layers.overview}>
                    <Words
                      {...SCENE.overview}
                      className={`${OVERVIEW_CLASS} ${movie.tagline ? AFTER_TAGLINE : ""}`}
                      alpha={0.7}
                    >
                      {movie.overview}
                    </Words>
                  </Layer>
                ) : null}
              </Sequence>

              <StickyAside className={ASIDE_CLASS}>
                <MovieSidebar awards={awards} movie={movie} />
              </StickyAside>

              <MovieViews
                views={{
                  awards: (
                    <Suspense fallback={null}>
                      <MovieAwards awards={awards} />
                    </Suspense>
                  ),
                  overview: (
                    <>
                      <MoviePeople cast={cast} crew={crew} />
                      <MoviePalette
                        stills={getPaletteImages(movie)}
                        title={movie.title}
                      />
                      <MovieGallery
                        backdrops={getGalleryImages(movie)}
                        posters={getPosterImages(movie)}
                        title={movie.title}
                      />
                      <MovieVideos
                        types={getVideoTypes(movie)}
                        videos={movie.videos}
                      />
                      <MovieRecommendations movie={movie} />
                    </>
                  ),
                }}
              />
            </div>
          </MovieViewProvider>

          <MovieReviews movieId={movie.id} title={movie.title} />
        </Body>
      </div>
    </Stage>
  );
}
