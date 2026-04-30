import { Suspense, use } from 'react';

import NavHeightSpacer from '@/features/app-shell/nav-height-spacer';
import { PageGradientShell } from '@/ui/elements/page-gradient-shell';
import { TextAnimate } from '@/ui/animations/text-animate';
import CastSection from '@/features/movie/cast-section';
import CollectionActions from '@/features/movie/collection-actions';
import GallerySection from '@/features/movie/gallery-section';
import ImagesSection from '@/features/movie/images-section';
import RecommendationCard from '@/features/movie/recommendation-card';
import Sidebar from '@/features/movie/sidebar';
import { getGalleryImages, getMovieComputedData } from '@/features/movie/utils';
import VideosSection from '@/features/movie/videos-section';
import MediaReviews from '@/features/reviews/media-reviews';
import Carousel from '@/ui/media/carousel';
import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/core/constants';
import { MovieSectionSkeleton } from '@/ui/skeletons/views/movie';

import {
  MovieClipReveal,
  MovieHeroReveal,
  MOVIE_ROUTE_TIMING,
  MovieSectionGroup,
  MovieSectionReveal,
  MovieSurfaceReveal,
} from './motion';
import Registry from './registry';

function MovieGridDivider({ inset = false }) {
  return (
    <div className={`movie-detail-grid-divider${inset ? ' movie-detail-grid-divider-inset' : ''}`} aria-hidden="true">
      <span className="movie-detail-grid-divider-startcap">
        <span className="movie-detail-grid-divider-diamond movie-detail-grid-divider-diamond-start" />
      </span>
      <span className="movie-detail-grid-divider-endcap">
        <span className="movie-detail-grid-divider-diamond movie-detail-grid-divider-diamond-end" />
      </span>
    </div>
  );
}

function MovieGridSection({ children, className = '', insetDivider = true }) {
  return (
    <section className={`movie-detail-grid-subsection ${className}`}>
      <MovieGridDivider inset={insetDivider} />
      <div className="movie-detail-grid-subsection-content movie-detail-shell-inset">{children}</div>
    </section>
  );
}

function RelatedMoviesSection({ items, title, groupIndex = 0 }) {
  if (!items?.length) {
    return null;
  }

  return (
    <MovieSectionReveal groupIndex={groupIndex}>
      <MovieGridSection>
        <MovieSurfaceReveal>
          <div className="flex flex-col gap-3">
            <h2 className="text-black-soft text-xs font-semibold tracking-widest uppercase">{title}</h2>
            <Carousel gap="gap-3" itemClassName="movie-carousel-recommendation-item">
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
      </MovieGridSection>
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
    <MovieSectionGroup delay={MOVIE_ROUTE_TIMING.sections.groupDelay} staggerStep={MOVIE_ROUTE_TIMING.sections.groupStagger}>
      {hasGallery ? (
        <MovieSectionReveal groupIndex={0}>
          <MovieGridSection>
            <GallerySection
              images={galleryImages}
              onSetMovieBackground={onSetMovieBackground}
              onResetMovieBackground={onResetMovieBackground}
              canResetMovieBackground={canResetMovieBackground}
            />
          </MovieGridSection>
        </MovieSectionReveal>
      ) : null}

      {hasImages ? (
        <MovieSectionReveal groupIndex={hasGallery ? 1 : 0}>
          <MovieGridSection>
            <ImagesSection
              images={secondaryMovie.images}
              onSetMovieBackground={onSetMovieBackground}
              onSetMoviePoster={onSetMoviePoster}
              onResetMovieBackground={onResetMovieBackground}
              onResetMoviePoster={onResetMoviePoster}
              canResetMovieBackground={canResetMovieBackground}
              canResetMoviePoster={canResetMoviePoster}
            />
          </MovieGridSection>
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
    <MovieSectionGroup delay={MOVIE_ROUTE_TIMING.sections.groupDelay} staggerStep={MOVIE_ROUTE_TIMING.sections.groupStagger}>
      {sections.map((section, index) =>
        section.key === 'videos' ? (
          <MovieSectionReveal key={section.key} groupIndex={index}>
            <MovieGridSection>{section.content}</MovieGridSection>
          </MovieSectionReveal>
        ) : (
          <RelatedMoviesSection key={section.key} items={section.items} title={section.title} groupIndex={index} />
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
        <MovieSectionReveal delay={MOVIE_ROUTE_TIMING.sections.cast}>
          <MovieGridSection>
            <CastSection cast={computed.cast} crew={computed.crew} />
          </MovieGridSection>
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

      <PageGradientShell className="overflow-hidden" contentClassName="movie-detail-grid-content">
        <div
          className={`movie-detail-grid-frame relative mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col gap-0 px-0`}
        >
          <div className="movie-detail-grid-section movie-detail-grid-primary movie-detail-grid-primary-layout items-stretch border-t-0">
            <div className="movie-detail-grid-sidebar w-full shrink-0">
              <div className="lg:sticky lg:top-0">
                <Sidebar
                  item={movie}
                  certification={certification}
                  director={director}
                  genres={genres}
                  topContent={<CollectionActions media={{ ...movie, entityType: 'movie' }} />}
                  tags={tags}
                  writers={writers}
                />
              </div>
            </div>

            <div className="movie-detail-grid-main flex w-full min-w-0 flex-col">
              <div className="flex w-full flex-col">
                <div className="movie-detail-section-band movie-detail-shell-inset">
                  <MovieHeroReveal delay={MOVIE_ROUTE_TIMING.hero.containerDelay}>
                    <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
                      <MovieClipReveal
                        animateOnView={false}
                        delay={MOVIE_ROUTE_TIMING.hero.titleClipDelay}
                        className="min-w-0"
                      >
                        <TextAnimate
                          animation="cinematicSoft"
                          by="word"
                          delay={MOVIE_ROUTE_TIMING.hero.titleDelay}
                          duration={MOVIE_ROUTE_TIMING.hero.titleDuration}
                          startOnView={false}
                          className="font-zuume max-w-full text-6xl leading-none font-bold uppercase sm:text-7xl lg:text-8xl"
                        >
                          {movie.title}
                        </TextAnimate>
                      </MovieClipReveal>
                    </div>
                  </MovieHeroReveal>

                  {movie.tagline || movie.overview ? (
                    <MovieHeroReveal delay={MOVIE_ROUTE_TIMING.hero.taglineDelay} className="mt-4">
                      <MovieClipReveal animateOnView={false} delay={0.04} className="w-full">
                        <div className="flex w-full flex-col gap-4">
                          {movie.tagline ? (
                            <p className="text-black-strong text-xs font-semibold tracking-widest uppercase sm:text-sm">
                              {movie.tagline}
                            </p>
                          ) : null}

                          {movie.overview ? (
                            <div>
                              <p className="movie-detail-reading-measure text-black-soft text-left text-base leading-7 sm:text-justify">
                                {movie.overview}
                              </p>
                            </div>
                          ) : null}
                        </div>
                      </MovieClipReveal>
                    </MovieHeroReveal>
                  ) : null}
                </div>

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

          <section className="movie-detail-grid-section movie-detail-grid-reviews w-full">
            <MovieGridDivider />
            <div className="movie-detail-grid-subsection-content">
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
          </section>
          <NavHeightSpacer className="w-full" />
        </div>
      </PageGradientShell>
    </>
  );
}
