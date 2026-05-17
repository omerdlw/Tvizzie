import { Suspense, use } from 'react';
import { motion } from 'framer-motion';

import NavHeightSpacer from '@/ui/elements/nav-height-spacer';
import { PageGradientShell } from '@/ui/elements/page-gradient-shell';
import CollectionActions from '@/features/movie/collection-actions';
import GallerySection from '@/features/movie/gallery-section';
import ImagesSection from '@/features/movie/images-section';
import RecommendationCard from '@/features/movie/recommendation-card';
import Sidebar from '@/features/movie/sidebar';
import MovieHeroStage from '@/features/movie/hero-stage';
import { MovieGridDivider, MovieGridFrame, MovieGridSidebarBoundary } from '@/features/movie/grid-animation';
import MoviePrimaryGridDivider from '@/features/movie/primary-grid-divider';
import { getGalleryImages, getMovieComputedData } from '@/features/movie/movie-data';
import VideosSection from '@/features/movie/videos-section';
import MediaReviews from '@/features/reviews/media-reviews';
import Carousel from '@/ui/media/carousel';
import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/core/constants';
import { cn } from '@/core/utils';
import { MovieSectionSkeleton } from '@/features/movie/skeletons';
import { getMovieRouteSectionMotion, MOVIE_ROUTE_MOTION } from './motion';

import Registry from './registry';

function MovieGridSection({ children, className = '', insetDivider = true, hideDivider = false, motionIndex = 0 }) {
  return (
    <motion.section className={cn('movie-detail-grid-subsection', className)} {...getMovieRouteSectionMotion(motionIndex)}>
      {!hideDivider && <MovieGridDivider inset={insetDivider} />}
      <div className="movie-detail-grid-subsection-content movie-detail-shell-inset">{children}</div>
    </motion.section>
  );
}

function RelatedMoviesSection({ items, title, hideDivider = false, motionIndex = 0 }) {
  if (!items?.length) {
    return null;
  }

  return (
    <MovieGridSection hideDivider={hideDivider} motionIndex={motionIndex}>
      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold tracking-widest text-white/70 uppercase">{title}</h2>
        <Carousel
          gap="gap-3"
          itemClassName="w-36 shrink-0 sm:min-w-[13rem] sm:w-[calc((100%-1.5rem)/3)] md:min-w-36 md:w-[calc((100%-2.25rem)/4)] lg:min-w-0 lg:w-[calc((100%-3.75rem)/6)]"
        >
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
    </MovieGridSection>
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
  showLeadingDivider = false,
  motionIndexBase = 2,
}) {
  const secondaryMovie = use(secondaryDataPromise);
  const galleryImages = getGalleryImages(secondaryMovie?.images);
  const hasGallery = galleryImages.length > 0;
  const hasImages = Boolean(secondaryMovie?.images);

  if (!hasGallery && !hasImages) {
    return null;
  }

  return (
    <div className="flex flex-col">
      {hasGallery ? (
        <MovieGridSection hideDivider={!showLeadingDivider} motionIndex={motionIndexBase}>
          <GallerySection
            images={galleryImages}
            onSetMovieBackground={onSetMovieBackground}
            onResetMovieBackground={onResetMovieBackground}
            canResetMovieBackground={canResetMovieBackground}
          />
        </MovieGridSection>
      ) : null}

      {hasImages ? (
        <MovieGridSection hideDivider={!hasGallery && !showLeadingDivider} motionIndex={motionIndexBase + 1}>
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
      ) : null}
    </div>
  );
}

function MovieDiscoveryDeferred({
  secondaryDataPromise,
  videos = [],
  hasPreviousSecondaryContent = false,
  showLeadingDivider = false,
  motionIndexBase = 4,
}) {
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
    <div className="flex flex-col">
      {sections.map((section, index) =>
        section.content ? (
          <MovieGridSection
            key={section.key}
            hideDivider={index === 0 && !hasPreviousSecondaryContent && !showLeadingDivider}
            motionIndex={motionIndexBase + index}
          >
            {section.content}
          </MovieGridSection>
        ) : (
          <RelatedMoviesSection
            key={section.key}
            items={section.items}
            title={section.title}
            hideDivider={index === 0 && !hasPreviousSecondaryContent && !showLeadingDivider}
            motionIndex={motionIndexBase + index}
          />
        )
      )}
    </div>
  );
}

function MovieSecondaryContent({ movie, secondaryDataPromise, motionIndexBase = 4 }) {
  return (
    <Suspense fallback={null}>
      <MovieDiscoveryDeferred
        secondaryDataPromise={secondaryDataPromise}
        videos={movie.videos?.results || []}
        showLeadingDivider
        motionIndexBase={motionIndexBase}
      />
    </Suspense>
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
        <MovieGridFrame
          baseDelay={MOVIE_ROUTE_MOTION.gridFrameBaseDelay}
          className={cn('mx-auto flex w-full flex-col gap-0 px-0', PAGE_SHELL_MAX_WIDTH_CLASS)}
          routeKey={`movie-${movie.id}`}
        >
          <motion.div
            className="movie-detail-grid-section movie-detail-grid-primary movie-detail-grid-primary-layout items-stretch border-t-0"
            {...getMovieRouteSectionMotion(0)}
          >
            <div className="movie-detail-grid-sidebar relative w-full shrink-0">
              <div className="h-full lg:sticky lg:top-0">
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
            <div className="movie-detail-grid-main relative flex w-full min-w-0 flex-col pb-0">
              <MovieGridSidebarBoundary />
              <div className="flex flex-col">
                <MovieHeroStage
                  cast={computed.cast}
                  crew={computed.crew}
                  overview={movie.overview}
                  tagline={movie.tagline}
                  className="py-7"
                  titleBlock={
                    <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
                      <div className="min-w-0">
                        <div className="font-zuume max-w-full text-6xl leading-none font-bold uppercase sm:text-7xl lg:text-8xl">
                          {movie.title}
                        </div>
                      </div>
                    </div>
                  }
                />

                <Suspense fallback={<MovieSectionSkeleton variant="gallery" />}>
                  <MovieVisualMediaDeferred
                    onSetMovieBackground={onSetMovieBackground}
                    onSetMoviePoster={onSetMoviePoster}
                    onResetMovieBackground={onResetMovieBackground}
                    onResetMoviePoster={onResetMoviePoster}
                  canResetMovieBackground={canResetMovieBackground}
                  canResetMoviePoster={canResetMoviePoster}
                  secondaryDataPromise={secondaryDataPromise}
                  motionIndexBase={2}
                />
                </Suspense>
              </div>
            </div>

            <MoviePrimaryGridDivider />
          </motion.div>

          <motion.div {...getMovieRouteSectionMotion(1)}>
            <MovieSecondaryContent movie={movie} secondaryDataPromise={secondaryDataPromise} motionIndexBase={4} />
          </motion.div>

          <motion.section
            className="movie-detail-grid-section movie-detail-grid-reviews w-full"
            {...getMovieRouteSectionMotion(2)}
          >
            <MovieGridDivider />
            <div className="movie-detail-grid-subsection-content">
              <MediaReviews
                entityId={movie.id}
                entityType="movie"
                title={movie.title}
                headerTitle="Recent Reviews"
                listMode="recent"
                showBackdropGradient={false}
                allReviewsHref={`/movie/${movie.id}/reviews`}
                posterPath={movie.poster_path}
                backdropPath={movie.backdrop_path}
                onReviewStateChange={setReviewState}
              />
            </div>
          </motion.section>
          <NavHeightSpacer className="w-full" />
        </MovieGridFrame>
      </PageGradientShell>
    </>
  );
}
