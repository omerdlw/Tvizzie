import { Suspense, use } from 'react';

import NavHeightSpacer from '@/features/app-shell/nav-height-spacer';
import { PageGradientShell } from '@/ui/elements/page-gradient-shell';
import CollectionActions from '@/features/movie/collection-actions';
import GallerySection from '@/features/movie/gallery-section';
import ImagesSection from '@/features/movie/images-section';
import RecommendationCard from '@/features/movie/recommendation-card';
import Sidebar from '@/features/movie/sidebar';
import MovieHeroStage from '@/features/movie/hero-stage';
import { MovieGridDivider, MovieGridFrame, MovieGridSidebarBoundary } from '@/features/movie/grid-animation';
import MoviePrimaryGridDivider from '@/features/movie/primary-grid-divider';
import { getGalleryImages, getMovieComputedData } from '@/features/movie/utils';
import VideosSection from '@/features/movie/videos-section';
import MediaReviews from '@/features/reviews/media-reviews';
import Carousel from '@/ui/media/carousel';
import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/core/constants';
import { MovieSectionSkeleton } from '@/ui/skeletons/views/movie';

import Registry from './registry';

function MovieGridSection({ children, className = '', insetDivider = true, hideDivider = false }) {
  return (
    <section className={`movie-detail-grid-subsection ${className}`}>
      {!hideDivider && <MovieGridDivider inset={insetDivider} />}
      <div className="movie-detail-grid-subsection-content movie-detail-shell-inset">{children}</div>
    </section>
  );
}

function RelatedMoviesSection({ items, title, hideDivider = false }) {
  if (!items?.length) {
    return null;
  }

  return (
    <div className="w-full">
      <MovieGridSection hideDivider={hideDivider}>
        <div className="flex flex-col gap-3">
          <h2 className="text-white-soft text-xs font-semibold tracking-widest uppercase">{title}</h2>
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
      </MovieGridSection>
    </div>
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
        <div className="w-full">
          <MovieGridSection hideDivider={!showLeadingDivider}>
            <GallerySection
              images={galleryImages}
              onSetMovieBackground={onSetMovieBackground}
              onResetMovieBackground={onResetMovieBackground}
              canResetMovieBackground={canResetMovieBackground}
            />
          </MovieGridSection>
        </div>
      ) : null}

      {hasImages ? (
        <div className="w-full">
          <MovieGridSection hideDivider={!hasGallery && !showLeadingDivider}>
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
        </div>
      ) : null}
    </div>
  );
}

function MovieDiscoveryDeferred({
  secondaryDataPromise,
  videos = [],
  hasPreviousSecondaryContent = false,
  showLeadingDivider = false,
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
        section.key === 'videos' ? (
          <div key={section.key} className="w-full">
            <MovieGridSection hideDivider={index === 0 && !hasPreviousSecondaryContent && !showLeadingDivider}>
              {section.content}
            </MovieGridSection>
          </div>
        ) : (
          <RelatedMoviesSection
            key={section.key}
            items={section.items}
            title={section.title}
            hideDivider={index === 0 && !hasPreviousSecondaryContent && !showLeadingDivider}
          />
        )
      )}
    </div>
  );
}

function MovieSecondaryContent({ movie, secondaryDataPromise }) {
  return (
    <Suspense fallback={null}>
      <MovieDiscoveryDeferred
        secondaryDataPromise={secondaryDataPromise}
        videos={movie.videos?.results || []}
        showLeadingDivider
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
        <MovieGridFrame className={`mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col gap-0 px-0`}>
          <div className="movie-detail-grid-section movie-detail-grid-primary movie-detail-grid-primary-layout items-stretch border-t-0">
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
            <div className="movie-detail-grid-main relative flex w-full min-w-0 flex-col">
              <MovieGridSidebarBoundary />
              <div className="flex w-full flex-col">
                <MovieHeroStage
                  cast={computed.cast}
                  crew={computed.crew}
                  overview={movie.overview}
                  tagline={movie.tagline}
                  className="py-7"
                  titleBlock={
                    <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
                      <div className="min-w-0">
                        <div
                          className="font-zuume max-w-full text-6xl leading-none font-bold uppercase sm:text-7xl lg:text-8xl"
                        >
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
                  />
                </Suspense>
              </div>
            </div>

            <MoviePrimaryGridDivider />
          </div>

          <MovieSecondaryContent movie={movie} secondaryDataPromise={secondaryDataPromise} />

          <section className="movie-detail-grid-section movie-detail-grid-reviews w-full">
            <MovieGridDivider />
            <div className="movie-detail-grid-subsection-content">
              <div className="w-full">
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
            </div>
          </section>
          <NavHeightSpacer className="w-full" />
        </MovieGridFrame>
      </PageGradientShell>
    </>
  );
}
