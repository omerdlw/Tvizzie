'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  getGalleryImages,
  getMediaComputedData,
  hasMediaAwards,
} from '@/domains/media/utils/media-data';
import { useToast } from '@/modules/notification';
import { getMediaAwardsServer } from '@/domains/media/server/movie-awards.js';
import { Suspense, use } from 'react';
import { NavHeightSpacer } from '@/modules/nav';
import { useRegisterBreadcrumbOverride } from '@/modules/nav';
import CastSection from '@/domains/media/ui/sections/cast-section';
import CollectionActions from '@/domains/media/ui/components/collection-actions';
import GallerySection from '@/domains/media/ui/sections/gallery-section';
import ImagesSection from '@/domains/media/ui/sections/images-section';
import RecommendationCard from '@/domains/media/ui/components/recommendation-card';
import Sidebar from '@/domains/media/ui/components/sidebar';
import VideosSection from '@/domains/media/ui/sections/videos-section';
import MediaReviews from '@/domains/reviews/ui/sections/media-reviews';
import TvSeasonsSection from '@/domains/media/ui/sections/seasons-section';
import TvSeasonRatings, { RatingsLegend } from '@/domains/media/ui/components/tv-season-ratings';
import {
  MovieAwardsSkeleton,
  TvSeasonRatingsSkeleton,
  MediaTvSeasonsSkeleton,
  MediaVisualMediaSkeleton,
  MediaDiscoverySkeleton,
} from '@/domains/media/ui/skeletons';
import MovieAwards from '@/domains/media/ui/sections/movie-awards-section';
import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/shared';
import MediaRegistry from '@/domains/media/ui/registry';
import {
  MEDIA_DETAIL_SECTION_CONTENT_CLASS,
  MEDIA_DETAIL_SECTION_HEADER_CLASS,
  MEDIA_DETAIL_STACK_CLASS,
} from '@/domains/media/ui/layouts/media-detail-section';
import Icon from '@/ui/primitives/icon';
import Carousel from '@/ui/components/media-carousel';
import BackdropHero from '@/ui/components/backdrop-hero';
import { cn } from '@/ui/class-names';

function createReviewState() {
  return {
    isActive: false,
    isSubmitting: false,
    ownReview: null,
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

export default function MediaDetailView({
  awardsPromise,
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

  const mediaPath = movieId ? `/${mediaType}/${movieId}` : null;
  useRegisterBreadcrumbOverride({
    path: mediaPath,
    title: movie?.title || movie?.name || null,
    icon: mediaType === 'movie' ? 'solar:clapperboard-play-bold' : 'solar:tv-bold',
  });

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
      awardsPromise={awardsPromise}
      reviewState={reviewState}
      secondaryDataPromise={secondaryDataPromise}
      setReviewState={setReviewState}
      activeView={activeView}
      setActiveView={setActiveView}
    />
  );
}

function RelatedMoviesSection({ items, title, isDeferred = false }) {
  if (!items?.length) {
    return null;
  }

  return (
    <div className="relative flex w-full flex-col">
      <div className={MEDIA_DETAIL_SECTION_HEADER_CLASS}>
        <div className="flex min-w-0 items-center gap-2.5">
          <Icon icon="solar:stars-minimalistic-bold" size={20} className="text-white/70" />
          <h2 className="min-w-0 text-xs font-semibold text-white/70 uppercase">{title}</h2>
        </div>
      </div>

      <div className={MEDIA_DETAIL_SECTION_CONTENT_CLASS}>
        <Carousel
          gap="gap-3"
          itemClassName="w-[calc((100%-1.5rem)/3)] md:w-[calc((100%-2.25rem)/4)]"
          arrowPlacement="inset"
        >
          {items.map((item, index) => (
            <RecommendationCard
              key={`${item.id}-${index}`}
              movie={item}
              imageLoading={index < 4 ? 'eager' : 'lazy'}
              imageFetchPriority={index < 4 ? 'high' : undefined}
            />
          ))}
        </Carousel>
      </div>
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
    <div className={MEDIA_DETAIL_STACK_CLASS}>
      {hasGallery ? (
        <GallerySection
          images={galleryImages}
          onSetMovieBackground={onSetMovieBackground}
          onResetMovieBackground={onResetMovieBackground}
          canResetMovieBackground={canResetMovieBackground}
        />
      ) : null}

      {hasImages ? (
        <ImagesSection
          images={secondaryMovie.images}
          onSetMovieBackground={onSetMovieBackground}
          onSetMoviePoster={onSetMoviePoster}
          onResetMovieBackground={onResetMovieBackground}
          onResetMoviePoster={onResetMoviePoster}
          canResetMovieBackground={canResetMovieBackground}
          canResetMoviePoster={canResetMoviePoster}
        />
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
    <div className={MEDIA_DETAIL_STACK_CLASS}>
      {sections.map((section) =>
        section.key === 'videos' ? (
          <div key={section.key}>{section.content}</div>
        ) : (
          <RelatedMoviesSection
            key={section.key}
            items={section.items}
            title={section.title}
            isDeferred
          />
        ),
      )}
    </div>
  );
}

function TvSeasonsDeferred({ secondaryDataPromise, seasons = [], series = null }) {
  const secondaryMovie = use(secondaryDataPromise);

  return (
    <TvSeasonsSection
      seasons={seasons}
      series={series}
      seasonDetails={secondaryMovie?.seasonDetails || []}
    />
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
    <div className={MEDIA_DETAIL_STACK_CLASS}>
      {computed.cast?.length > 0 || computed.crew?.length > 0 ? (
        <CastSection cast={computed.cast} crew={computed.crew} />
      ) : null}

      {mediaType === 'tv' ? (
        <Suspense fallback={<MediaTvSeasonsSkeleton />}>
          <TvSeasonsDeferred
            secondaryDataPromise={secondaryDataPromise}
            seasons={movie.seasons || []}
            series={movie}
          />
        </Suspense>
      ) : null}

      <Suspense fallback={<MediaVisualMediaSkeleton />}>
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

      <Suspense fallback={<MediaDiscoverySkeleton />}>
        <MovieDiscoveryDeferred
          secondaryDataPromise={secondaryDataPromise}
          videos={movie.videos?.results || []}
        />
      </Suspense>
    </div>
  );
}

function MediaBackdropHero({ image }) {
  return <BackdropHero image={image} position="center 20%" />;
}

function MovieView({
  awardsPromise,
  backgroundImage,
  canResetMovieBackground,
  canResetMoviePoster,
  computed,
  mediaType = 'movie',
  movie,
  onResetMovieBackground,
  onResetMoviePoster,
  onSetMovieBackground,
  onSetMoviePoster,
  ratingsPromise,
  reviewState,
  secondaryDataPromise,
  setReviewState,
  activeView,
  setActiveView,
}) {
  const toast = useToast();
  const collectionMedia = useMemo(() => ({ ...movie, entityType: mediaType }), [mediaType, movie]);
  const { certification, creators, director, genres, rating, runtimeText, tags, writers, year } =
    computed;
  const mediaTitle =
    movie.title || movie.original_title || movie.name || movie.original_name || 'Untitled';
  const isRatingsView = mediaType === 'tv' && activeView === 'ratings' && Boolean(ratingsPromise);
  const hasRatingsView = mediaType === 'tv' && Boolean(ratingsPromise);
  const isAwardsView = activeView === 'awards';
  const hasAwardsView = Boolean(awardsPromise) || Boolean(movie?.id);
  const hasInlineBackdrop = typeof backgroundImage === 'string' && backgroundImage.trim();

  const awardsDataRef = useRef(null);
  const [hasAwards, setHasAwards] = useState(null);
  const [isCheckingAwards, setIsCheckingAwards] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    setHasAwards(null);
    awardsDataRef.current = null;

    async function resolveAwards() {
      try {
        let data = null;
        if (awardsPromise) {
          data = await awardsPromise;
        } else if (movie?.id) {
          const response = await getMediaAwardsServer({ id: movie.id, mediaType });
          data = response?.data;
        }
        if (!isCurrent) return;
        awardsDataRef.current = data;
        setHasAwards(hasMediaAwards(data));
      } catch {
        if (!isCurrent) return;
        awardsDataRef.current = null;
        setHasAwards(false);
      }
    }

    void resolveAwards();

    return () => {
      isCurrent = false;
    };
  }, [awardsPromise, movie?.id, mediaType]);

  const handleAwardsClick = useCallback(async () => {
    if (isAwardsView) {
      setActiveView('main');
      return;
    }

    if (isCheckingAwards) return;

    if (hasAwards === false) {
      toast.info('No awards information found for this title', {
        allowInProduction: true,
        icon: 'solar:cup-star-linear',
      });
      return;
    }

    if (hasAwards === true) {
      setActiveView('awards');
      return;
    }

    setIsCheckingAwards(true);
    try {
      let data = awardsDataRef.current;
      if (!data) {
        if (awardsPromise) {
          data = await awardsPromise;
        } else if (movie?.id) {
          const response = await getMediaAwardsServer({ id: movie.id, mediaType });
          data = response?.data;
        }
        awardsDataRef.current = data;
      }

      const exists = hasMediaAwards(data);
      setHasAwards(exists);

      if (!exists) {
        toast.info('No awards information found for this title', {
          allowInProduction: true,
          icon: 'solar:cup-star-linear',
        });
        return;
      }

      setActiveView('awards');
    } catch {
      toast.error('Awards are temporarily unavailable');
    } finally {
      setIsCheckingAwards(false);
    }
  }, [
    isAwardsView,
    isCheckingAwards,
    hasAwards,
    awardsPromise,
    movie?.id,
    mediaType,
    toast,
    setActiveView,
  ]);

  return (
    <>
      <MediaRegistry
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

      <div
        className={`relative z-10 mx-auto flex w-full flex-col px-4 pb-16 [overflow-anchor:none] sm:px-6 lg:px-8 ${PAGE_SHELL_MAX_WIDTH_CLASS}`}
      >
        {hasInlineBackdrop ? <MediaBackdropHero image={backgroundImage} /> : null}

        <div
          className={`relative w-full ${
            hasInlineBackdrop ? '-mt-32 sm:-mt-48 lg:-mt-64 xl:-mt-72' : 'pt-6 sm:pt-8 lg:pt-10'
          } grid grid-cols-1 items-start gap-8 lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[24rem_minmax(0,1fr)]`}
        >
          <aside className="w-full shrink-0 self-start lg:sticky lg:top-6 lg:w-auto">
            <Sidebar
              item={movie}
              certification={certification}
              creators={creators}
              director={director}
              genres={genres}
              tags={tags}
              hideTaxonomy={isRatingsView}
              hideMetadata={isRatingsView}
              bottomContent={isRatingsView ? <RatingsLegend /> : null}
              topContent={
                <CollectionActions
                  media={collectionMedia}
                  additionalActions={[
                    ...(hasAwardsView
                      ? [
                          {
                            active: isAwardsView,
                            disabled: isCheckingAwards,
                            icon: isAwardsView ? 'solar:arrow-left-bold' : 'solar:cup-star-bold',
                            key: 'awards',
                            label: isAwardsView ? 'Back to Details' : 'Awards',
                            onClick: handleAwardsClick,
                          },
                        ]
                      : []),
                    ...(hasRatingsView
                      ? [
                          {
                            active: isRatingsView,
                            icon: isRatingsView ? 'solar:arrow-left-bold' : 'solar:chart-2-bold',
                            key: 'ratings',
                            label: isRatingsView ? 'Back to Details' : 'Ratings',
                            onClick: () => setActiveView(isRatingsView ? 'main' : 'ratings'),
                          },
                        ]
                      : []),
                  ]}
                />
              }
              writers={writers}
            />
          </aside>

          <div className="flex w-full min-w-0 flex-col lg:w-auto">
            <div className="flex w-full flex-col">
              {!isAwardsView && !isRatingsView ? (
                <div className="relative mb-8 flex w-full flex-col">
                  <h1 className="font-zuume -mt-2 line-clamp-2 max-w-full overflow-hidden text-7xl leading-none font-bold [overflow-wrap:anywhere] uppercase sm:-mt-2.5 sm:text-8xl lg:-mt-3 lg:text-9xl">
                    {mediaTitle}
                  </h1>

                  {movie.tagline ? (
                    <p className="mt-4 text-xs font-semibold text-white/70 uppercase sm:text-sm">
                      {movie.tagline}
                    </p>
                  ) : null}

                  {movie.overview ? (
                    <div className="mt-3 flex w-full flex-col">
                      <p className="max-w-[70ch] text-left text-sm leading-6 text-white/70 sm:text-base sm:leading-7">
                        {movie.overview}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {isRatingsView ? (
                <div>
                  <Suspense fallback={<TvSeasonRatingsSkeleton />}>
                    <TvSeasonRatings ratingsPromise={ratingsPromise} />
                  </Suspense>
                </div>
              ) : isAwardsView ? (
                <div>
                  <Suspense fallback={<MovieAwardsSkeleton />}>
                    <MovieAwards
                      mediaId={movie.id}
                      mediaType={mediaType}
                      awardsPromise={awardsPromise}
                      onEmpty={() => setActiveView('main')}
                    />
                  </Suspense>
                </div>
              ) : (
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
              )}
            </div>
          </div>
        </div>

        {!isRatingsView && !isAwardsView ? (
          <div className="mt-12 w-full sm:mt-14 lg:mt-16">
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
            />
          </div>
        ) : null}
      </div>
      <NavHeightSpacer />
    </>
  );
}
