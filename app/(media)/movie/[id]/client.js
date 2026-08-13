'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  clearMediaBackgroundPreference,
  clearMediaPosterPreference,
  getMediaBackgroundPreferenceFilePath,
  getMediaPosterPreferenceFilePath,
  setMediaBackgroundPreference,
  setMediaPosterPreference,
} from '@/domains/media/utils/background-preferences';
import {
  createMovieBackdropImageUrl,
  createMoviePosterImageUrl,
  getPreferredMovieBackground,
} from '@/domains/media/services/media-data';
import { Suspense, use } from 'react';
import NavHeightSpacer from '@/ui/layout/nav-height-spacer';
import { PageGradientShell } from '@/ui/layout/page-gradient-shell';
import CastSection from '@/domains/media/ui/sections/cast-section';
import CollectionActions from '@/domains/media/ui/components/collection-actions';
import GallerySection from '@/domains/media/ui/sections/gallery-section';
import ImagesSection from '@/domains/media/ui/sections/images-section';
import RecommendationCard from '@/domains/media/ui/components/recommendation-card';
import Sidebar from '@/domains/media/ui/components/sidebar';
import { getGalleryImages, getMediaComputedData } from '@/domains/media/services/media-data';
import VideosSection from '@/domains/media/ui/sections/videos-section';
import MediaReviews from '@/domains/reviews/ui/sections/media-reviews';
import TvSeasonsSection from '@/domains/media/ui/sections/seasons-section';
import TvSeasonRatings from '@/domains/media/ui/components/tv-season-ratings';
import TvSeasonRatingsSkeleton from '@/domains/media/ui/components/tv-season-ratings-skeleton';
import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/shared/constants';
import Registry from '@/app/(media)/registry';
import { MediaRouteMotionProvider, MediaRouteReveal } from '@/app/(media)/motion';
import MediaGridFrame from '@/domains/media/ui/layouts/media-grid-frame';
import {
  MEDIA_DETAIL_SECTION_CONTENT_CLASS,
  MEDIA_DETAIL_SECTION_HEADER_CLASS,
} from '@/domains/media/ui/layouts/media-detail-section';
import Icon from '@/ui/primitives/icon';
import Carousel from '@/domains/media/ui/components/media-carousel';
import { cn } from '@/core/shared/utils';

const TV_VIEW_TRANSITION = {
  duration: 0.38,
  ease: [0.16, 1, 0.3, 1],
};

function createReviewState() {
  return {
    isActive: false,
    isSubmitting: false,
    ownReview: false,
    submitReview: null,
  };
}

function preloadBackgroundImage(source) {
  return new Promise((resolve, reject) => {
    if (!source) {
      resolve(null);
      return;
    }

    const image = new window.Image();
    image.decoding = 'async';
    image.onload = () => resolve(source);
    image.onerror = reject;
    image.src = source;

    if (image.complete) {
      resolve(source);
    }
  });
}

function createUniqueImageCandidates(candidates = []) {
  return [
    ...new Set(candidates.filter((candidate) => typeof candidate === 'string' && candidate.trim())),
  ];
}

async function resolveFirstLoadableImage(candidates = []) {
  const resolvedCandidates = createUniqueImageCandidates(candidates);

  for (const candidate of resolvedCandidates) {
    try {
      await preloadBackgroundImage(candidate);
      return candidate;
    } catch {}
  }

  return null;
}

async function resolveFirstLoadablePosterFilePath(candidates = []) {
  const resolvedCandidates = createUniqueImageCandidates(candidates);

  for (const filePath of resolvedCandidates) {
    try {
      await preloadBackgroundImage(createMoviePosterImageUrl(filePath));
      return filePath;
    } catch {}
  }

  return null;
}

export default function Client({
  computed,
  mediaType = 'movie',
  movie,
  ratingsPromise,
  secondaryDataPromise,
}) {
  const movieId = movie?.id;
  const fallbackPosterFilePath = movie?.poster_path || null;
  const fallbackBackgroundImage = createMovieBackdropImageUrl(movie?.backdrop_path);

  const [backgroundImage, setBackgroundImage] = useState(fallbackBackgroundImage);
  const [posterFilePath, setPosterFilePath] = useState(fallbackPosterFilePath);
  const [canResetMovieBackground, setCanResetMovieBackground] = useState(false);
  const [canResetMoviePoster, setCanResetMoviePoster] = useState(false);
  const [reviewState, setReviewState] = useState(createReviewState);
  const [activeView, setActiveView] = useState('main');

  const resolvedMovie = useMemo(
    () => ({
      ...movie,
      poster_path: posterFilePath || movie?.poster_path || null,
    }),
    [movie, posterFilePath],
  );

  const handleSetMovieBackground = useCallback(
    ({ filePath }) => {
      if (!movieId || typeof filePath !== 'string' || !filePath.trim()) {
        return;
      }

      const nextBackgroundImage = createMovieBackdropImageUrl(filePath);
      if (!nextBackgroundImage) {
        return;
      }

      setMediaBackgroundPreference(mediaType, movieId, filePath);
      setCanResetMovieBackground(true);
      setBackgroundImage(nextBackgroundImage);
    },
    [mediaType, movieId],
  );

  const handleSetMoviePoster = useCallback(
    ({ filePath }) => {
      if (!movieId || typeof filePath !== 'string' || !filePath.trim()) {
        return;
      }

      setMediaPosterPreference(mediaType, movieId, filePath);
      setCanResetMoviePoster(true);
      setPosterFilePath(filePath);
    },
    [mediaType, movieId],
  );

  const handleResetMovieBackground = useCallback(() => {
    if (!movieId) {
      return;
    }

    clearMediaBackgroundPreference(mediaType, movieId);
    setCanResetMovieBackground(false);
    setBackgroundImage(fallbackBackgroundImage || null);

    void Promise.resolve(secondaryDataPromise)
      .then(async (secondaryMovie) => {
        const autoBackgroundImage = getPreferredMovieBackground(secondaryMovie?.images);
        const nextBackgroundImage = await resolveFirstLoadableImage([
          autoBackgroundImage,
          fallbackBackgroundImage,
        ]);
        setBackgroundImage(nextBackgroundImage || null);
      })
      .catch(async () => {
        const nextBackgroundImage = await resolveFirstLoadableImage([fallbackBackgroundImage]);
        setBackgroundImage(nextBackgroundImage || null);
      });
  }, [fallbackBackgroundImage, mediaType, movieId, secondaryDataPromise]);

  const handleResetMoviePoster = useCallback(() => {
    if (!movieId) {
      return;
    }

    clearMediaPosterPreference(mediaType, movieId);
    setCanResetMoviePoster(false);
    setPosterFilePath(fallbackPosterFilePath || null);
  }, [fallbackPosterFilePath, mediaType, movieId]);

  useEffect(() => {
    let isActive = true;

    const preferredPosterFilePath = getMediaPosterPreferenceFilePath(mediaType, movieId);
    setCanResetMoviePoster(Boolean(preferredPosterFilePath));
    setPosterFilePath(preferredPosterFilePath || fallbackPosterFilePath || null);

    void resolveFirstLoadablePosterFilePath([preferredPosterFilePath, fallbackPosterFilePath]).then(
      (filePath) => {
        if (isActive) {
          setPosterFilePath(filePath || fallbackPosterFilePath || null);
        }
      },
    );

    return () => {
      isActive = false;
    };
  }, [fallbackPosterFilePath, mediaType, movieId]);

  useEffect(() => {
    let isActive = true;
    const preferredFilePath = getMediaBackgroundPreferenceFilePath(mediaType, movieId);
    setCanResetMovieBackground(Boolean(preferredFilePath));
    const preferredBackgroundImage = createMovieBackdropImageUrl(preferredFilePath);

    setBackgroundImage(preferredBackgroundImage || fallbackBackgroundImage || null);

    void Promise.resolve(secondaryDataPromise)
      .then(async (secondaryMovie) => {
        if (!isActive) {
          return;
        }

        const autoBackgroundImage = getPreferredMovieBackground(secondaryMovie?.images);
        const nextBackgroundImage = await resolveFirstLoadableImage([
          preferredBackgroundImage,
          autoBackgroundImage,
          fallbackBackgroundImage,
        ]);

        if (isActive) {
          setBackgroundImage(nextBackgroundImage || null);
        }
      })
      .catch(async () => {
        const nextBackgroundImage = await resolveFirstLoadableImage([
          preferredBackgroundImage,
          fallbackBackgroundImage,
        ]);

        if (isActive) {
          setBackgroundImage(nextBackgroundImage || null);
        }
      });

    return () => {
      isActive = false;
    };
  }, [fallbackBackgroundImage, mediaType, movieId, secondaryDataPromise]);

  return (
    <MovieView
      onSetMoviePoster={handleSetMoviePoster}
      onSetMovieBackground={handleSetMovieBackground}
      onResetMoviePoster={handleResetMoviePoster}
      onResetMovieBackground={handleResetMovieBackground}
      canResetMoviePoster={canResetMoviePoster}
      canResetMovieBackground={canResetMovieBackground}
      backgroundImage={backgroundImage}
      computed={computed}
      mediaType={mediaType}
      movie={resolvedMovie}
      ratingsPromise={ratingsPromise}
      reviewState={reviewState}
      secondaryDataPromise={secondaryDataPromise}
      setReviewState={setReviewState}
      activeView={activeView}
      setActiveView={setActiveView}
    />
  );
}

function RelatedMoviesSection({ items, title, hasBottomBorder = true, isDeferred = false }) {
  if (!items?.length) {
    return null;
  }

  return (
    <MediaRouteReveal stage="sections.discovery" deferred={isDeferred}>
      <div className={cn('relative w-full', hasBottomBorder && 'border-b border-black/10')}>
        <div className={MEDIA_DETAIL_SECTION_HEADER_CLASS}>
          <div className="flex min-w-0 items-center gap-2">
            <Icon icon="solar:stars-minimalistic-bold" size={20} className="text-black/70" />
            <h2 className="min-w-0 text-xs font-semibold tracking-wide text-black/70 uppercase">
              {title}
            </h2>
          </div>
        </div>

        <div className={MEDIA_DETAIL_SECTION_CONTENT_CLASS}>
          <Carousel
            gap="gap-3"
            itemClassName="w-36 sm:w-[calc((100%-24px)/3)] md:w-[calc((100%-36px)/4)]"
          >
            {items.map((item, index) => (
              <MediaRouteReveal
                key={`${item.id}-${index}`}
                stage="items.discovery"
                deferred={isDeferred}
                interactive
                itemIndex={index}
              >
                <RecommendationCard movie={item} index={index} />
              </MediaRouteReveal>
            ))}
          </Carousel>
        </div>
      </div>
    </MediaRouteReveal>
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
  showGallery = true,
  showImages = true,
}) {
  const secondaryMovie = use(secondaryDataPromise);
  const galleryImages = getGalleryImages(secondaryMovie?.images);
  const hasGallery = showGallery && galleryImages.length > 0;
  const hasImages = showImages && Boolean(secondaryMovie?.images);

  if (!hasGallery && !hasImages) {
    return null;
  }

  return (
    <div className="flex w-full flex-col">
      {hasGallery ? (
        <MediaRouteReveal stage="sections.gallery" deferred>
          <GallerySection
            images={galleryImages}
            onSetMovieBackground={onSetMovieBackground}
            onResetMovieBackground={onResetMovieBackground}
            canResetMovieBackground={canResetMovieBackground}
          />
        </MediaRouteReveal>
      ) : null}

      {hasImages ? (
        <MediaRouteReveal stage="sections.images" deferred>
          <ImagesSection
            images={secondaryMovie.images}
            onSetMovieBackground={onSetMovieBackground}
            onSetMoviePoster={onSetMoviePoster}
            onResetMovieBackground={onResetMovieBackground}
            onResetMoviePoster={onResetMoviePoster}
            canResetMovieBackground={canResetMovieBackground}
            canResetMoviePoster={canResetMoviePoster}
          />
        </MediaRouteReveal>
      ) : null}
    </div>
  );
}

function MovieDiscoveryDeferred({ secondaryDataPromise, videos = [] }) {
  const secondaryMovie = use(secondaryDataPromise);
  const deferredComputed = getMediaComputedData(secondaryMovie);
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
    <div className="flex w-full flex-col">
      {sections.map((section, index) =>
        section.key === 'videos' ? (
          <div key={section.key}>
            <MediaRouteReveal stage="sections.discovery" deferred>
              {section.content}
            </MediaRouteReveal>
          </div>
        ) : (
          <RelatedMoviesSection
            key={section.key}
            items={section.items}
            title={section.title}
            hasBottomBorder={index < sections.length - 1}
            isDeferred
          />
        ),
      )}
    </div>
  );
}

function TvSeasonsDeferred({ secondaryDataPromise, seasons = [] }) {
  const secondaryMovie = use(secondaryDataPromise);

  return (
    <MediaRouteReveal stage="sections.seasons" deferred>
      <TvSeasonsSection seasons={seasons} seasonDetails={secondaryMovie?.seasonDetails || []} />
    </MediaRouteReveal>
  );
}

function MovieSecondaryContent({
  computed,
  mediaType = 'movie',
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
    <div className="flex w-full flex-col">
      {computed.cast?.length > 0 || computed.crew?.length > 0 ? (
        <MediaRouteReveal stage="sections.cast">
          <CastSection cast={computed.cast} crew={computed.crew} />
        </MediaRouteReveal>
      ) : null}

      {mediaType === 'tv' ? (
        <Suspense fallback={null}>
          <TvSeasonsDeferred
            secondaryDataPromise={secondaryDataPromise}
            seasons={movie.seasons || []}
          />
        </Suspense>
      ) : null}

      <Suspense fallback={null}>
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
        <MovieDiscoveryDeferred
          secondaryDataPromise={secondaryDataPromise}
          videos={movie.videos?.results || []}
        />
      </Suspense>
    </div>
  );
}

function MovieView({
  onSetMoviePoster,
  onSetMovieBackground,
  onResetMoviePoster,
  onResetMovieBackground,
  canResetMoviePoster,
  canResetMovieBackground,
  backgroundImage,
  computed,
  mediaType = 'movie',
  movie,
  ratingsPromise,
  reviewState,
  secondaryDataPromise,
  setReviewState,
  activeView,
  setActiveView,
}) {
  const collectionMedia = useMemo(() => ({ ...movie, entityType: mediaType }), [mediaType, movie]);
  const { certification, creators, director, genres, rating, runtimeText, tags, writers, year } =
    computed;
  const mediaTitle =
    movie.title || movie.original_title || movie.name || movie.original_name || 'Untitled';
  const isRatingsView = mediaType === 'tv' && activeView === 'ratings' && Boolean(ratingsPromise);
  const hasRatingsView = mediaType === 'tv' && Boolean(ratingsPromise);
  const ratingSeasonCount = (Array.isArray(movie?.seasons) ? movie.seasons : []).filter(
    (season) => Number(season?.season_number) > 0,
  ).length;
  const ratingPanelWidth = Math.max(48, 5 + ratingSeasonCount * 4);
  const ratingsLayoutStyle = isRatingsView
    ? {
        '--ratings-panel-width': `${ratingPanelWidth}rem`,
        '--ratings-shell-width': `${24 + ratingPanelWidth}rem`,
      }
    : undefined;

  return (
    <MediaRouteMotionProvider routeKey={`${mediaType}-${movie.id}`}>
      <Registry
        onSetMoviePoster={onSetMoviePoster}
        onSetMovieBackground={onSetMovieBackground}
        onResetMoviePoster={onResetMoviePoster}
        onResetMovieBackground={onResetMovieBackground}
        canResetMoviePoster={canResetMoviePoster}
        canResetMovieBackground={canResetMovieBackground}
        backgroundImage={backgroundImage}
        mediaType={mediaType}
        rating={rating}
        movie={movie}
        reviewState={reviewState}
        runtimeText={runtimeText}
        year={year}
      />

      <PageGradientShell>
        <MediaGridFrame
          className={isRatingsView ? 'lg:w-[var(--ratings-shell-width)] lg:max-w-none' : ''}
          style={ratingsLayoutStyle}
        />
        <div
          style={ratingsLayoutStyle}
          className={`relative z-10 mx-auto flex w-full flex-col pb-12 [overflow-anchor:none] ${
            isRatingsView
              ? 'lg:w-[var(--ratings-shell-width)] lg:max-w-none lg:pb-0'
              : PAGE_SHELL_MAX_WIDTH_CLASS
          }`}
        >
          <div className="relative flex w-full flex-col items-start lg:flex-row lg:items-stretch">
            <div className="order-1 w-full shrink-0 p-6 lg:w-96">
              <Sidebar
                item={movie}
                certification={certification}
                creators={creators}
                director={director}
                genres={genres}
                tags={tags}
                topContent={
                  <CollectionActions
                    media={collectionMedia}
                    additionalActions={
                      hasRatingsView
                        ? [
                            {
                              active: isRatingsView,
                              icon: isRatingsView ? 'solar:arrow-left-bold' : 'solar:chart-2-bold',
                              key: 'ratings',
                              label: isRatingsView ? 'Back to Details' : 'Ratings',
                              onClick: () => setActiveView(isRatingsView ? 'main' : 'ratings'),
                            },
                          ]
                        : []
                    }
                  />
                }
                writers={writers}
              />
            </div>

            <div
              className={`order-2 flex w-full min-w-0 flex-col lg:border-l lg:border-black/10 ${
                isRatingsView ? 'lg:w-[var(--ratings-panel-width)] lg:flex-none' : 'lg:flex-1'
              }`}
            >
              <AnimatePresence mode="wait">
                {isRatingsView ? (
                  <motion.div
                    key="tv-ratings"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={TV_VIEW_TRANSITION}
                  >
                    <Suspense fallback={<TvSeasonRatingsSkeleton />}>
                      <TvSeasonRatings ratingsPromise={ratingsPromise} />
                    </Suspense>
                  </motion.div>
                ) : (
                  <motion.div
                    key="media-details"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={TV_VIEW_TRANSITION}
                  >
                    <div className="flex w-full flex-col border-b border-black/10 p-6">
                      <MediaRouteReveal stage="hero.title">
                        <h1 className="font-zuume line-clamp-2 max-w-full overflow-hidden text-6xl leading-none font-bold [overflow-wrap:anywhere] uppercase sm:text-7xl lg:text-8xl">
                          {mediaTitle}
                        </h1>
                      </MediaRouteReveal>

                      {movie.tagline ? (
                        <MediaRouteReveal stage="hero.tagline">
                          <p className="mt-4 text-[11px] font-semibold tracking-widest text-black/80 uppercase sm:text-sm">
                            {movie.tagline}
                          </p>
                        </MediaRouteReveal>
                      ) : null}

                      {movie.overview ? (
                        <MediaRouteReveal stage="hero.overview">
                          <div className="mt-3 flex w-full flex-col">
                            <p className="max-w-[70ch] text-left text-[15px] leading-6 text-black/70 sm:text-base sm:leading-7">
                              {movie.overview}
                            </p>
                          </div>
                        </MediaRouteReveal>
                      ) : null}
                    </div>

                    <MovieSecondaryContent
                      computed={computed}
                      mediaType={mediaType}
                      movie={movie}
                      onSetMovieBackground={onSetMovieBackground}
                      onSetMoviePoster={onSetMoviePoster}
                      onResetMovieBackground={onResetMovieBackground}
                      onResetMoviePoster={onResetMoviePoster}
                      canResetMovieBackground={canResetMovieBackground}
                      canResetMoviePoster={canResetMoviePoster}
                      secondaryDataPromise={secondaryDataPromise}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {!isRatingsView ? (
            <MediaRouteReveal className="w-full" stage="sections.reviews">
              <MediaReviews
                entityId={movie.id}
                entityType={mediaType}
                title={mediaTitle}
                headerTitle="Recent Reviews"
                listMode="recent"
                showBackdropGradient={false}
                allReviewsHref={`/${mediaType}/${movie.id}/reviews`}
                posterPath={movie.poster_path}
                backdropPath={movie.backdrop_path}
                onReviewStateChange={setReviewState}
                motionStage="items.reviews"
                motionDeferred
              />
            </MediaRouteReveal>
          ) : null}

          {isRatingsView ? (
            <div className="hidden lg:ml-96 lg:block lg:border-l lg:border-black/10 lg:pb-12">
              <NavHeightSpacer />
            </div>
          ) : null}
        </div>
        <NavHeightSpacer className={isRatingsView ? 'lg:hidden' : ''} />
      </PageGradientShell>
    </MediaRouteMotionProvider>
  );
}
