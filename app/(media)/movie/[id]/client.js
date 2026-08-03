'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  clearMovieBackgroundPreference,
  clearMoviePosterPreference,
  getMovieBackgroundPreferenceFilePath,
  getMoviePosterPreferenceFilePath,
  setMovieBackgroundPreference,
  setMoviePosterPreference,
} from '@/domains/media/ui/background-preferences';
import {
  createMovieBackdropImageUrl,
  createMoviePosterImageUrl,
  getPreferredMovieBackground,
} from '@/domains/media/ui/media-data';
// Movie view is defined in this route client.
import { Suspense, use } from 'react';
import { motion } from 'framer-motion';
import NavHeightSpacer from '@/ui/layout/nav-height-spacer';
import { PageGradientShell } from '@/ui/layout/page-gradient-shell';
import { BlurryText } from '@/ui/motion/animations/blurry-text';
import CastSection from '@/domains/media/ui/cast-section';
import CollectionActions from '@/domains/media/ui/collection-actions';
import GallerySection from '@/domains/media/ui/gallery-section';
import ImagesSection from '@/domains/media/ui/images-section';
import RecommendationCard from '@/domains/media/ui/recommendation-card';
import Sidebar from '@/domains/media/ui/sidebar';
import { getGalleryImages, getMovieComputedData } from '@/domains/media/ui/media-data';
import VideosSection from '@/domains/media/ui/videos-section';
import MediaReviews from '@/domains/reviews/ui/media-reviews';
import TvSeasonsSection from '@/domains/media/ui/seasons-section';
import Carousel from '@/domains/media/ui/components/media-carousel';
import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/shared/constants';
import Registry from '@/app/(media)/registry';
import {
  getMediaCardProps,
  heroOverviewVariants,
  heroSocialProofVariants,
  heroTaglineVariants,
  heroTitleVariants,
  mainContentColumnVariants,
  EASINGS,
  TIMELINES,
  SCROLL_VIEWPORT_CONFIG,
  scrollReviewsSectionVariants,
  scrollSectionVariants,
  sidebarColumnVariants,
} from '@/app/(media)/motion';

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
    } catch {
      
    }
  }

  return null;
}

async function resolveFirstLoadablePosterFilePath(candidates = []) {
  const resolvedCandidates = createUniqueImageCandidates(candidates);

  for (const filePath of resolvedCandidates) {
    try {
      await preloadBackgroundImage(createMoviePosterImageUrl(filePath));
      return filePath;
    } catch {
      
    }
  }

  return null;
}

export default function Client({ computed, mediaType = 'movie', movie, secondaryDataPromise }) {
  const isMovieMedia = mediaType === 'movie';
  const movieId = movie?.id;
  const fallbackPosterFilePath = movie?.poster_path || null;
  const fallbackBackgroundImage = createMovieBackdropImageUrl(movie?.backdrop_path);

  const [backgroundImage, setBackgroundImage] = useState(fallbackBackgroundImage);
  const [posterFilePath, setPosterFilePath] = useState(fallbackPosterFilePath);
  const [canResetMovieBackground, setCanResetMovieBackground] = useState(false);
  const [canResetMoviePoster, setCanResetMoviePoster] = useState(false);
  const [reviewState, setReviewState] = useState(createReviewState);

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

      setMovieBackgroundPreference(`${mediaType}-${movieId}`, filePath);
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

      setMoviePosterPreference(`${mediaType}-${movieId}`, filePath);
      setCanResetMoviePoster(true);
      setPosterFilePath(filePath);
    },
    [mediaType, movieId],
  );

  const handleResetMovieBackground = useCallback(() => {
    if (!movieId) {
      return;
    }

    clearMovieBackgroundPreference(`${mediaType}-${movieId}`);
    if (isMovieMedia) {
      clearMovieBackgroundPreference(movieId);
    }
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
  }, [fallbackBackgroundImage, isMovieMedia, mediaType, movieId, secondaryDataPromise]);

  const handleResetMoviePoster = useCallback(() => {
    if (!movieId) {
      return;
    }

    clearMoviePosterPreference(`${mediaType}-${movieId}`);
    if (isMovieMedia) {
      clearMoviePosterPreference(movieId);
    }
    setCanResetMoviePoster(false);
    setPosterFilePath(fallbackPosterFilePath || null);
  }, [fallbackPosterFilePath, isMovieMedia, mediaType, movieId]);

  useEffect(() => {
    let isActive = true;

    const preferredPosterFilePath =
      getMoviePosterPreferenceFilePath(`${mediaType}-${movieId}`) ||
      (isMovieMedia ? getMoviePosterPreferenceFilePath(movieId) : null);
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
  }, [fallbackPosterFilePath, isMovieMedia, mediaType, movieId]);

  useEffect(() => {
    let isActive = true;
    const preferredFilePath =
      getMovieBackgroundPreferenceFilePath(`${mediaType}-${movieId}`) ||
      (isMovieMedia ? getMovieBackgroundPreferenceFilePath(movieId) : null);
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
  }, [fallbackBackgroundImage, isMovieMedia, mediaType, movieId, secondaryDataPromise]);

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
      reviewState={reviewState}
      secondaryDataPromise={secondaryDataPromise}
      setReviewState={setReviewState}
    />
  );
}

function RelatedMoviesSection({ items, title }) {
  if (!items?.length) {
    return null;
  }

  return (
    <motion.div {...scrollSectionVariants}>
      <div className="flex flex-col gap-3">
        <h2 className="text-[11px] font-semibold tracking-widest text-black/70 uppercase">
          {title}
        </h2>
        <Carousel
          gap="gap-3"
          itemClassName="w-36 sm:w-[calc((100%-24px)/3)] md:w-[calc((100%-36px)/4)]"
        >
          {items.map((item, index) => (
            <motion.div
              key={`${item.id}-${index}`}
              {...getMediaCardProps(index, 0, false)}
            >
              <RecommendationCard
                movie={item}
                index={index}
                imagePriority={index < 4}
                imageFetchPriority={index < 4 ? 'high' : undefined}
              />
            </motion.div>
          ))}
        </Carousel>
      </div>
    </motion.div>
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
    <div className="flex flex-col gap-10 lg:gap-12">
      {hasGallery ? (
        <GallerySection
          images={galleryImages}
          baseDelay={TIMELINES.GALLERY_SECTION_BASE_DELAY}
          onSetMovieBackground={onSetMovieBackground}
          onResetMovieBackground={onResetMovieBackground}
          canResetMovieBackground={canResetMovieBackground}
        />
      ) : null}

      {hasImages ? (
        <ImagesSection
          images={secondaryMovie.images}
          baseDelay={TIMELINES.IMAGES_SECTION_BASE_DELAY}
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
    <div className="flex flex-col gap-10 lg:gap-12">
      {sections.map((section) =>
        section.key === 'videos' ? (
          <motion.div key={section.key} {...scrollSectionVariants}>
            {section.content}
          </motion.div>
        ) : (
          <RelatedMoviesSection
            key={section.key}
            items={section.items}
            title={section.title}
          />
        ),
      )}
    </div>
  );
}

function TvSeasonsDeferred({ secondaryDataPromise, seasons = [] }) {
  const secondaryMovie = use(secondaryDataPromise);

  return (
    <TvSeasonsSection
      seasons={seasons}
      seasonDetails={secondaryMovie?.seasonDetails || []}
      baseDelay={TIMELINES.CAST_SECTION_BASE_DELAY + 0.50}
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
    <div className="mt-10 flex flex-col gap-10 lg:mt-12 lg:gap-12">
      {computed.cast?.length > 0 || computed.crew?.length > 0 ? (
        <CastSection cast={computed.cast} crew={computed.crew} baseDelay={TIMELINES.CAST_SECTION_BASE_DELAY} />
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
  reviewState,
  secondaryDataPromise,
  setReviewState,
}) {
  const { certification, creators, director, genres, rating, runtimeText, tags, writers, year } =
    computed;
  const mediaTitle =
    movie.title || movie.original_title || movie.name || movie.original_name || 'Untitled';

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
        mediaType={mediaType}
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
          <div className="mt-6 flex w-full flex-col items-start gap-6 sm:mt-10 sm:gap-8 lg:mt-16 lg:flex-row lg:items-stretch lg:gap-10">
            <motion.div
              {...sidebarColumnVariants}
              className="w-full shrink-0 self-start lg:w-[400px] lg:self-stretch"
            >
              <div className="lg:sticky lg:top-6">
                <Sidebar
                  item={movie}
                  certification={certification}
                  creators={creators}
                  director={director}
                  genres={genres}
                  topContent={<CollectionActions media={{ ...movie, entityType: mediaType }} />}
                  tags={tags}
                  writers={writers}
                />
              </div>
            </motion.div>

            <motion.div
              {...mainContentColumnVariants}
              className="flex w-full min-w-0 flex-col lg:self-stretch"
            >
              <div className="flex w-full flex-col">
                <BlurryText
                  as="h1"
                  by="character"
                  delay={0.15}
                  duration={0.75}
                  stagger={0.038}
                  className="font-zuume max-w-full text-6xl leading-none font-bold [overflow-wrap:anywhere] uppercase sm:text-7xl lg:text-8xl"
                >
                  {mediaTitle}
                </BlurryText>

                {movie.tagline ? (
                  <BlurryText
                    as="p"
                    by="character"
                    delay={0.50}
                    duration={0.65}
                    stagger={0.025}
                    className="mt-4 text-[11px] font-semibold tracking-widest text-black/80 uppercase sm:text-sm"
                  >
                    {movie.tagline}
                  </BlurryText>
                ) : null}

                {movie.overview ? (
                  <motion.div {...heroOverviewVariants} className="mt-3 flex w-full flex-col">
                    <p className="max-w-[70ch] text-left text-[15px] leading-6 text-black/70 sm:text-base sm:leading-7">
                      {movie.overview}
                    </p>
                  </motion.div>
                ) : null}

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
              </div>
            </motion.div>
          </div>

          <motion.div {...scrollReviewsSectionVariants} className="w-full">
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
          </motion.div>
        </div>
        <NavHeightSpacer />
      </PageGradientShell>
    </>
  );
}
