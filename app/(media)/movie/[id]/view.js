import { Suspense, use } from 'react';

import NavHeightSpacer from '@/features/layout/nav-height-spacer';
import { PageGradientShell } from '@/ui/elements/page-gradient-shell';
import { TextAnimate } from '@/ui/animations/text-animate';
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
import { MovieSectionSkeleton } from '@/ui/skeletons/views/movie';

import {
  MovieClipReveal,
  MovieHeroReveal,
  MOVIE_ROUTE_TIMING,
  MovieSectionGroup,
  MovieSectionReveal,
  MovieSidebarReveal,
  MovieSurfaceReveal,
} from './motion';
import HeroMeta from './hero-meta';
import Registry from './registry';

function RelatedMoviesSection({ items, title, groupIndex = 0 }) {
  if (!items?.length) {
    return null;
  }

  return (
    <MovieSectionReveal groupIndex={groupIndex}>
      <MovieSurfaceReveal>
        <div className="flex flex-col gap-3">
          <h2 className="text-[11px] font-semibold tracking-widest text-black/70 uppercase">{title}</h2>
          <Carousel gap="gap-3" itemClassName="w-36 sm:w-[calc((100%-24px)/3)] md:w-[calc((100%-36px)/4)]">
            {items.map((item, index) => (
              <RecommendationCard
                key={`${item.id}-${index}`}
                movie={item}
                index={index}
                imagePriority={index < 4}
                imageFetchPriority={index < 4 ? 'high' : undefined}
              />
            ))}
          </Carousel>
        </div>
      </MovieSurfaceReveal>
    </MovieSectionReveal>
  );
}

function MovieVisualMediaDeferred({
  onSetMovieBackground,
  onSetMoviePoster,
  onResetMovieBackground,
  onResetMoviePoster,
  canResetMovieBackground,
  canResetMoviePoster,
  secondaryDataPromise,
}) {
  const secondaryMovie = use(secondaryDataPromise);
  const galleryImages = getGalleryImages(secondaryMovie?.images);
  const hasGallery = galleryImages.length > 0;
  const hasImages = Boolean(secondaryMovie?.images);

  if (!hasGallery && !hasImages) {
    return null;
  }

  return (
    <MovieSectionGroup
      className="mt-10 flex flex-col gap-10"
      delay={MOVIE_ROUTE_TIMING.sections.groupDelay}
      staggerStep={MOVIE_ROUTE_TIMING.sections.groupStagger}
    >
      {hasGallery ? (
        <MovieSectionReveal groupIndex={0}>
          <GallerySection
            images={galleryImages}
            onSetMovieBackground={onSetMovieBackground}
            onResetMovieBackground={onResetMovieBackground}
            canResetMovieBackground={canResetMovieBackground}
          />
        </MovieSectionReveal>
      ) : null}

      {hasImages ? (
        <MovieSectionReveal groupIndex={hasGallery ? 1 : 0}>
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
      ) : null}
    </MovieSectionGroup>
  );
}

function MovieDiscoveryDeferred({ secondaryDataPromise, videos = [] }) {
  const secondaryMovie = use(secondaryDataPromise);
  const deferredComputed = getMovieComputedData(secondaryMovie);
  const sections = [];

  if (videos.length > 0) {
    sections.push({
      key: 'videos',
      content: <VideosSection videos={videos} />,
    });
  }

  if (deferredComputed.recommendations?.length) {
    sections.push({
      key: 'recommendations',
      items: deferredComputed.recommendations,
      title: 'More like this',
    });
  }

  if (deferredComputed.similar?.length) {
    sections.push({
      key: 'similar',
      items: deferredComputed.similar,
      title: 'Similar movies',
    });
  }

  if (!sections.length) {
    return null;
  }

  return (
    <MovieSectionGroup
      className="mt-10 flex flex-col gap-10"
      delay={MOVIE_ROUTE_TIMING.sections.groupDelay}
      staggerStep={MOVIE_ROUTE_TIMING.sections.groupStagger}
    >
      {sections.map((section, index) =>
        section.key === 'videos' ? (
          <MovieSectionReveal key={section.key} groupIndex={index}>
            {section.content}
          </MovieSectionReveal>
        ) : (
          <RelatedMoviesSection
            key={section.key}
            items={section.items}
            title={section.title}
            groupIndex={index}
          />
        )
      )}
    </MovieSectionGroup>
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
        <MovieSectionReveal className="mt-10" delay={MOVIE_ROUTE_TIMING.sections.cast}>
          <CastSection cast={computed.cast} crew={computed.crew} />
        </MovieSectionReveal>
      ) : null}

      <Suspense fallback={<MovieSectionSkeleton variant="gallery" />}>
        <MovieVisualMediaDeferred
          onSetMovieBackground={onSetMovieBackground}
          onSetMoviePoster={onSetMoviePoster}
          onResetMovieBackground={onResetMovieBackground}
          onResetMoviePoster={onResetMoviePoster}
          canResetMovieBackground={canResetMovieBackground}
          canResetMoviePoster={canResetMoviePoster}
          secondaryDataPromise={secondaryDataPromise}
        />
      </Suspense>

      <Suspense fallback={null}>
        <MovieDiscoveryDeferred secondaryDataPromise={secondaryDataPromise} videos={movie.videos?.results || []} />
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
  const { certification, director, genres, rating, runtimeText, tags, writers, year } = computed;

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
          <div className="mt-6 flex w-full flex-col items-start gap-5 sm:mt-12 sm:gap-6 lg:mt-20 lg:flex-row lg:items-stretch lg:gap-12">
            <div className="w-full shrink-0 self-start lg:w-[400px] lg:self-stretch">
              <MovieSidebarReveal className="lg:sticky lg:top-6">
                <Sidebar
                  item={movie}
                  certification={certification}
                  director={director}
                  topContent={<CollectionActions media={{ ...movie, entityType: 'movie' }} />}
                  writers={writers}
                />
              </MovieSidebarReveal>
            </div>

            <div className="flex w-full min-w-0 flex-col lg:self-stretch">
              <div className="flex w-full flex-col">
                <MovieHeroReveal delay={MOVIE_ROUTE_TIMING.hero.containerDelay}>
                  <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
                    <MovieClipReveal animateOnView={false} delay={MOVIE_ROUTE_TIMING.hero.titleClipDelay} className="min-w-0">
                      <TextAnimate
                        animation="cinematicSoft"
                        by="word"
                        delay={MOVIE_ROUTE_TIMING.hero.titleDelay}
                        duration={MOVIE_ROUTE_TIMING.hero.titleDuration}
                        startOnView={false}
                        className="max-w-full [overflow-wrap:anywhere] font-zuume text-6xl leading-none font-bold uppercase sm:text-7xl lg:text-8xl"
                      >
                        {movie.title}
                      </TextAnimate>
                    </MovieClipReveal>

                    <MovieClipReveal animateOnView={false} delay={MOVIE_ROUTE_TIMING.hero.socialProofDelay} direction="left">
                      <div>
                        <MediaSocialProof media={{ ...movie, entityType: 'movie' }} />
                      </div>
                    </MovieClipReveal>
                  </div>
                </MovieHeroReveal>

                {genres?.length || tags?.length || movie.tagline || movie.overview ? (
                  <MovieHeroReveal delay={MOVIE_ROUTE_TIMING.hero.taglineDelay} className="mt-4">
                    <MovieClipReveal animateOnView={false} delay={0.04} className="w-full">
                      <div className="flex w-full flex-col gap-4">
                        {genres?.length || tags?.length ? <HeroMeta genres={genres} tags={tags} /> : null}

                        {movie.tagline ? (
                          <p className="text-[11px] font-semibold tracking-widest text-black/80 uppercase sm:text-sm">
                            {movie.tagline}
                          </p>
                        ) : null}

                        {movie.overview ? (
                          <div>
                            <p className="max-w-[70ch] text-justify text-[15px] leading-6 text-black/70 sm:text-base sm:leading-7">
                              {movie.overview}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </MovieClipReveal>
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

          <MovieSectionReveal className="w-full" delay={MOVIE_ROUTE_TIMING.sections.reviews}>
            <MediaReviews
              entityId={movie.id}
              entityType="movie"
              title={movie.title}
              headerTitle="Recent Reviews"
              listMode="recent"
              showBackdropGradient={false}
              hideWhenEmpty
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
