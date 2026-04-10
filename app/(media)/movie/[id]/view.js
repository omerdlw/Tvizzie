import { Suspense, use } from 'react';

import { TextAnimate } from '@/components/ui/text-animate';
import NavHeightSpacer from '@/features/layout/nav-height-spacer';
import { PageGradientShell } from '@/features/layout/page-gradient-backdrop';
import CastSection from '@/features/movie/cast-section';
import CollectionActions from '@/features/movie/collection-actions';
import GallerySection from '@/features/movie/gallery-section';
import ImagesSection from '@/features/movie/images-section';
import RecommendationCard from '@/features/movie/recommendation-card';
import Sidebar from '@/features/movie/sidebar';
import MediaSocialProof from '@/features/movie/social-proof';
import { getGalleryImages, getMovieComputedData } from '@/features/movie/utils';
import VideosSection from '@/features/movie/videos-section';
import MediaReviews from '@/features/reviews';
import Carousel from '@/features/shared/carousel';
import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/core/constants';

import {
  MovieHeroReveal,
  MovieSectionReveal,
  MovieSectionSkeleton,
  MovieSidebarReveal,
} from '../../../../features/movie/movie-motion';
import Registry from './registry';

const HERO_REVEAL_TIMING = Object.freeze({
  containerDelay: 0.12,
  titleDelay: 0.18,
  titleDuration: 0.54,
  taglineDelay: 0.3,
  overviewDelay: 0.42,
});

const SECTION_REVEAL_TIMING = Object.freeze({
  cast: 0.16,
  gallery: 0.28,
  images: 0.4,
  videos: 0.52,
  recommendations: 0.64,
  similar: 0.76,
  reviews: 0.14,
});

function RelatedMoviesSection({ items, title, delay = 0 }) {
  if (!items?.length) {
    return null;
  }

  return (
    <MovieSectionReveal className="mt-10" delay={delay}>
      <div className="flex flex-col gap-3">
        <h2 className="text-[11px] font-semibold tracking-widest text-black/70 uppercase">{title}</h2>
        <Carousel gap="gap-3" itemClassName="w-36 sm:w-[calc((100%-24px)/3)] md:w-[calc((100%-36px)/4)]">
          {items.map((item, index) => (
            <RecommendationCard
              key={item.id}
              movie={item}
              imagePriority={index < 4}
              imageFetchPriority={index < 4 ? 'high' : undefined}
            />
          ))}
        </Carousel>
      </div>
    </MovieSectionReveal>
  );
}

function MovieGalleryDeferred({
  onSetMovieBackground,
  onResetMovieBackground,
  canResetMovieBackground,
  secondaryDataPromise,
}) {
  const secondaryMovie = use(secondaryDataPromise);
  const galleryImages = getGalleryImages(secondaryMovie?.images);

  if (!galleryImages.length) {
    return null;
  }

  return (
    <MovieSectionReveal className="mt-10" delay={SECTION_REVEAL_TIMING.gallery}>
      <GallerySection
        images={galleryImages}
        onSetMovieBackground={onSetMovieBackground}
        onResetMovieBackground={onResetMovieBackground}
        canResetMovieBackground={canResetMovieBackground}
      />
    </MovieSectionReveal>
  );
}

function MovieImagesDeferred({
  onSetMovieBackground,
  onSetMoviePoster,
  onResetMovieBackground,
  onResetMoviePoster,
  canResetMovieBackground,
  canResetMoviePoster,
  secondaryDataPromise,
}) {
  const secondaryMovie = use(secondaryDataPromise);

  if (!secondaryMovie?.images) {
    return null;
  }

  return (
    <MovieSectionReveal className="mt-10" delay={SECTION_REVEAL_TIMING.images}>
      <ImagesSection
        images={secondaryMovie.images}
        onSetMovieBackground={onSetMovieBackground}
        onSetMoviePoster={onSetMoviePoster}
        onResetMovieBackground={onResetMovieBackground}
        onResetMoviePoster={onResetMoviePoster}
        canResetMovieBackground={canResetMovieBackground}
        canResetMoviePoster={canResetMoviePoster}
      />
    </MovieSectionReveal>
  );
}

function MovieRelatedDeferred({ secondaryDataPromise }) {
  const secondaryMovie = use(secondaryDataPromise);
  const deferredComputed = getMovieComputedData(secondaryMovie);

  if (!deferredComputed.recommendations?.length && !deferredComputed.similar?.length) {
    return null;
  }

  return (
    <>
      <RelatedMoviesSection
        items={deferredComputed.recommendations}
        title="More like this"
        delay={SECTION_REVEAL_TIMING.recommendations}
      />
      <RelatedMoviesSection
        items={deferredComputed.similar}
        title="Similar movies"
        delay={SECTION_REVEAL_TIMING.similar}
      />
    </>
  );
}

function MovieSecondaryContent({
  computed,
  movie,
  onSetMovieBackground,
  onSetMoviePoster,
  onResetMovieBackground,
  onResetMoviePoster,
  canResetMovieBackground,
  canResetMoviePoster,
  secondaryDataPromise,
}) {
  return (
    <>
      {computed.cast?.length > 0 || computed.crew?.length > 0 ? (
        <MovieSectionReveal className="mt-10" delay={SECTION_REVEAL_TIMING.cast}>
          <CastSection cast={computed.cast} crew={computed.crew} />
        </MovieSectionReveal>
      ) : null}

      <Suspense fallback={<MovieSectionSkeleton />}>
        <MovieGalleryDeferred
          onSetMovieBackground={onSetMovieBackground}
          onResetMovieBackground={onResetMovieBackground}
          canResetMovieBackground={canResetMovieBackground}
          secondaryDataPromise={secondaryDataPromise}
        />
      </Suspense>

      <Suspense fallback={<MovieSectionSkeleton />}>
        <MovieImagesDeferred
          onSetMovieBackground={onSetMovieBackground}
          onSetMoviePoster={onSetMoviePoster}
          onResetMovieBackground={onResetMovieBackground}
          onResetMoviePoster={onResetMoviePoster}
          canResetMovieBackground={canResetMovieBackground}
          canResetMoviePoster={canResetMoviePoster}
          secondaryDataPromise={secondaryDataPromise}
        />
      </Suspense>

      {movie.videos?.results?.length > 0 ? (
        <MovieSectionReveal className="mt-10" delay={SECTION_REVEAL_TIMING.videos}>
          <VideosSection videos={movie.videos.results} />
        </MovieSectionReveal>
      ) : null}

      <Suspense fallback={null}>
        <MovieRelatedDeferred secondaryDataPromise={secondaryDataPromise} />
      </Suspense>
    </>
  );
}

export default function MovieView({
  onSetMoviePoster,
  onSetMovieBackground,
  onResetMoviePoster,
  onResetMovieBackground,
  canResetMoviePoster,
  canResetMovieBackground,
  backgroundImage,
  computed,
  movie,
  reviewState,
  secondaryDataPromise,
  setReviewState,
}) {
  const { certification, director, rating, runtimeText, writers, year } = computed;

  return (
    <>
      <Registry
        onSetMoviePoster={onSetMoviePoster}
        onSetMovieBackground={onSetMovieBackground}
        onResetMoviePoster={onResetMoviePoster}
        onResetMovieBackground={onResetMovieBackground}
        canResetMoviePoster={canResetMoviePoster}
        canResetMovieBackground={canResetMovieBackground}
        backgroundImage={backgroundImage}
        rating={rating}
        movie={movie}
        reviewState={reviewState}
        runtimeText={runtimeText}
        year={year}
      />

      <PageGradientShell>
        <div
          className={`relative mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col gap-6 px-3 pb-12 [overflow-anchor:none] sm:gap-8 sm:px-4 md:px-6`}
        >
          <div className="mt-6 flex w-full flex-col items-start gap-5 sm:mt-12 sm:gap-6 lg:mt-20 lg:flex-row lg:gap-12">
            <div className="w-full shrink-0 self-start lg:sticky lg:top-6 lg:w-[400px]">
              <MovieSidebarReveal>
                <Sidebar
                  item={movie}
                  certification={certification}
                  director={director}
                  topContent={<CollectionActions media={{ ...movie, entityType: 'movie' }} />}
                  writers={writers}
                />
              </MovieSidebarReveal>
            </div>

            <div className="flex w-full min-w-0 flex-col">
              <div className="flex w-full flex-col">
                <MovieHeroReveal delay={HERO_REVEAL_TIMING.containerDelay}>
                  <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
                    <TextAnimate
                      animation="slideUp"
                      by="word"
                      delay={HERO_REVEAL_TIMING.titleDelay}
                      duration={HERO_REVEAL_TIMING.titleDuration}
                      startOnView={false}
                      className="font-zuume text-6xl leading-none font-bold uppercase sm:text-7xl lg:text-8xl"
                    >
                      {movie.title}
                    </TextAnimate>
                    <MediaSocialProof media={{ ...movie, entityType: 'movie' }} />
                  </div>
                </MovieHeroReveal>

                {movie.tagline ? (
                  <MovieHeroReveal delay={HERO_REVEAL_TIMING.taglineDelay} className="mt-4">
                    <p className="text-[11px] font-semibold tracking-widest text-black/80 uppercase sm:text-sm">
                      {movie.tagline}
                    </p>
                  </MovieHeroReveal>
                ) : null}

                {movie.overview ? (
                  <MovieHeroReveal delay={HERO_REVEAL_TIMING.overviewDelay} className="mt-4">
                    <p className="max-w-[70ch] text-justify text-[15px] leading-6 text-black/70 sm:text-base sm:leading-7">
                      {movie.overview}
                    </p>
                  </MovieHeroReveal>
                ) : null}

                <MovieSecondaryContent
                  computed={computed}
                  movie={movie}
                  onSetMovieBackground={onSetMovieBackground}
                  onSetMoviePoster={onSetMoviePoster}
                  onResetMovieBackground={onResetMovieBackground}
                  onResetMoviePoster={onResetMoviePoster}
                  canResetMovieBackground={canResetMovieBackground}
                  canResetMoviePoster={canResetMoviePoster}
                  secondaryDataPromise={secondaryDataPromise}
                />

              </div>
            </div>
          </div>

          <MovieSectionReveal className="w-full" delay={SECTION_REVEAL_TIMING.reviews}>
            <MediaReviews
              entityId={movie.id}
              entityType="movie"
              title={movie.title}
              headerTitle="Recent Reviews"
              listMode="recent"
              allReviewsHref={`/movie/${movie.id}/reviews`}
              posterPath={movie.poster_path}
              backdropPath={movie.backdrop_path}
              onReviewStateChange={setReviewState}
            />
          </MovieSectionReveal>
        </div>
        <NavHeightSpacer />
      </PageGradientShell>
    </>
  );
}
