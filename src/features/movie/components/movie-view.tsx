import {
  ASIDE_CLASS,
  COLUMNS_CLASS,
  CONTAINER_CLASS,
  HEADER_CLASS,
  MAIN_COLUMN_CLASS,
  PAGE_CLASS,
  pageBodyClass,
  PROSE_CLASS,
  RULE_GAP,
  StickyAside,
} from "@/ui";
import { Suspense, type JSX } from "react";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import type {
  Awards,
  MovieDetails,
  MovieImages,
} from "@/infrastructure/tmdb/types";
import { AFTER_TAGLINE, TAGLINE_CLASS, titleClass } from "../lib/layout";
import { SCENE } from "../lib/motion";
import {
  Body,
  Hairline,
  Layer,
  Sequence,
  Stage,
  Title,
  Words,
} from "@/motion/stage";
import type { FilmStats, PersonEntry, PopularList } from "../lib/types";
import type { MovieReviewSort } from "@/features/reviews";
import { AccountLink } from "@/features/account";
import { movieHref } from "@/config/routes";
import {
  getCast,
  getCrew,
  getGalleryImages,
  getPosterImages,
  getVideoTypes,
} from "../lib/utils";
import { MovieBackdropHero } from "./movie-artwork";
import { MovieAwards } from "./movie-awards";
import { MovieGallery, MovieGalleryWall } from "./movie-gallery";
import { MoviePeople } from "./movie-people";
import { MovieProjection } from "./movie-projection";
import { MovieRecommendations } from "./movie-recommendations";
import { ReelProvider } from "./movie-reel";
import { MoviePopularLists } from "./movie-popular-lists";
import { MovieReviewDigest } from "./movie-review-digest";
import { MovieReviews } from "./movie-reviews";
import { MovieSidebar } from "./movie-sidebar";
import { MovieViews } from "./movie-views";
import { MovieVideos } from "./movie-videos";

// The film page, or its reviews page: the same stage, poster and facts,
// with every review in the main column instead of the film's sections.
export type MoviePageKind =
  | { kind: "film"; popularLists: Promise<PopularList[]> }
  | { kind: "reviews"; reviewer: string | null; sort: MovieReviewSort };

export function MovieView({
  awards,
  images,
  movie,
  page,
  stats,
}: {
  awards: Promise<Awards | null>;
  images: MovieImages;
  movie: MovieDetails;
  page: MoviePageKind;
  stats: FilmStats | null;
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
    <Stage
      className={`movie-page ${PAGE_CLASS}`}
      opening={SCENE.opening}
      picture={Boolean(backdrop)}
      wash={false}
      wall={
        <MovieGalleryWall
          backdrops={getGalleryImages(images)}
          posters={getPosterImages(images)}
          title={movie.title}
        />
      }
    >
      <ReelProvider>
        <MovieProjection movie={movie} />
        <div className={CONTAINER_CLASS}>
          {backdrop ? <MovieBackdropHero movie={movie} /> : null}

          <Body className={pageBodyClass(Boolean(backdrop))}>
            <div className={COLUMNS_CLASS}>
              <Sequence as="header" className={HEADER_CLASS}>
                <Layer {...SCENE.layers.title}>
                  {page.kind === "reviews" ? (
                    <AccountLink
                      className="ui-fade hover:opacity-80"
                      href={movieHref(movie.id)}
                    >
                      <Title className={titleClass(movie.title)}>
                        {movie.title}
                      </Title>
                    </AccountLink>
                  ) : (
                    <Title className={titleClass(movie.title)}>
                      {movie.title}
                    </Title>
                  )}
                </Layer>
                {movie.tagline || movie.overview ? (
                  <Layer className={RULE_GAP} {...SCENE.layers.rule}>
                    <Hairline {...SCENE.rule} />
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
                      className={`${PROSE_CLASS} ${movie.tagline ? AFTER_TAGLINE : ""}`}
                      alpha={0.7}
                    >
                      {movie.overview}
                    </Words>
                  </Layer>
                ) : null}
              </Sequence>

              <StickyAside className={ASIDE_CLASS}>
                <MovieSidebar awards={awards} movie={movie} stats={stats} />
              </StickyAside>

              {page.kind === "reviews" ? (
                <div className={MAIN_COLUMN_CLASS}>
                  <MovieReviews
                    initialSort={page.sort}
                    movieId={movie.id}
                    reviewer={page.reviewer}
                    title={movie.title}
                  />
                </div>
              ) : (
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
                        <MovieGallery
                          backdrops={getGalleryImages(images)}
                          posters={getPosterImages(images)}
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
              )}
            </div>

            {page.kind === "film" ? (
              <>
                <MovieReviewDigest movieId={movie.id} title={movie.title} />
                <Suspense fallback={null}>
                  <MoviePopularLists lists={page.popularLists} />
                </Suspense>
              </>
            ) : null}
          </Body>
        </div>
      </ReelProvider>
    </Stage>
  );
}
