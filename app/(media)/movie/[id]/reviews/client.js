'use client';

import { useEffect, useState } from 'react';
import NavHeightSpacer from '@/ui/layout/nav-height-spacer';
import { PageGradientShell } from '@/ui/layout/page-gradient-shell';
import CollectionActions from '@/domains/media/ui/components/collection-actions';
import Sidebar from '@/domains/media/ui/components/sidebar';
import MediaReviews from '@/domains/reviews/ui/sections/media-reviews';
import {
  createMovieBackdropImageUrl,
  getPreferredMovieBackground,
} from '@/domains/media/services/media-data';
import { getMediaBackgroundPreferenceFilePath } from '@/domains/media/utils/background-preferences';
import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/shared/constants';
import Registry from '@/app/(media)/registry';
import { MediaRouteMotionProvider, MediaRouteReveal } from '@/app/(media)/motion';
import MediaGridFrame from '@/domains/media/ui/layouts/media-grid-frame';
import { GridCrosshair } from '@/ui/layout/grid-crosshair';

function createReviewState() {
  return {
    isActive: false,
    isSubmitting: false,
    ownReview: false,
    submitReview: null,
  };
}

export default function Client({ computed, mediaType = 'movie', movie, secondaryDataPromise }) {
  const [reviewState, setReviewState] = useState(createReviewState);
  const [backgroundImage, setBackgroundImage] = useState(() =>
    createMovieBackdropImageUrl(movie?.backdrop_path),
  );

  useEffect(() => {
    let isActive = true;
    const fallbackBackgroundImage = createMovieBackdropImageUrl(movie?.backdrop_path);
    const preferredFilePath = getMediaBackgroundPreferenceFilePath(mediaType, movie?.id);
    const preferredBackgroundImage = createMovieBackdropImageUrl(preferredFilePath);

    setBackgroundImage(preferredBackgroundImage || fallbackBackgroundImage || null);

    void Promise.resolve(secondaryDataPromise)
      .then((secondaryMovie) => {
        if (!isActive) return;

        const autoBackgroundImage = getPreferredMovieBackground(secondaryMovie?.images);
        setBackgroundImage(
          preferredBackgroundImage || autoBackgroundImage || fallbackBackgroundImage || null,
        );
      })
      .catch(() => {
        if (isActive) {
          setBackgroundImage(preferredBackgroundImage || fallbackBackgroundImage || null);
        }
      });

    return () => {
      isActive = false;
    };
  }, [mediaType, movie?.backdrop_path, movie?.id, secondaryDataPromise]);

  return (
    <View
      computed={computed}
      mediaType={mediaType}
      movie={movie}
      backgroundImage={backgroundImage}
      secondaryDataPromise={secondaryDataPromise}
      reviewState={reviewState}
      setReviewState={setReviewState}
    />
  );
}

function View({
  backgroundImage,
  computed,
  mediaType = 'movie',
  movie,
  reviewState,
  secondaryDataPromise,
  setReviewState,
}) {
  const { certification, creators, director, genres, runtimeText, tags, writers, year } = computed;
  const mediaTitle =
    movie.title || movie.original_title || movie.name || movie.original_name || 'Untitled';

  return (
    <MediaRouteMotionProvider routeKey={`${mediaType}-${movie.id}-reviews`}>
      <Registry
        mediaType={mediaType}
        movie={movie}
        backgroundImage={backgroundImage}
        rating={null}
        runtimeText={runtimeText}
        reviewState={reviewState}
        year={year}
      />

      <PageGradientShell>
        <MediaGridFrame showSidebarBorder />
        <div
          className={`relative z-10 mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col pb-12 [overflow-anchor:none]`}
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
                topContent={<CollectionActions media={{ ...movie, entityType: mediaType }} />}
                writers={writers}
              />
            </div>

            <div className="order-2 flex w-full min-w-0 flex-col lg:flex-1">
              <div className="relative flex w-full flex-col p-6">
                <MediaRouteReveal stage="hero.title">
                  <h1 className="font-zuume line-clamp-2 max-w-full overflow-hidden text-6xl leading-none font-bold [overflow-wrap:anywhere] uppercase sm:text-7xl lg:text-8xl">
                    {mediaTitle}
                  </h1>
                </MediaRouteReveal>

                {movie.tagline ? (
                  <MediaRouteReveal stage="hero.tagline">
                    <p className="mt-4 text-[11px] font-semibold tracking-widest text-white/80 uppercase sm:text-sm">
                      {movie.tagline}
                    </p>
                  </MediaRouteReveal>
                ) : null}

                {movie.overview ? (
                  <MediaRouteReveal stage="hero.overview">
                    <div className="mt-3 flex w-full flex-col">
                      <p className="max-w-[70ch] text-left text-[15px] leading-6 text-white/70 sm:text-base sm:leading-7">
                        {movie.overview}
                      </p>
                    </div>
                  </MediaRouteReveal>
                ) : null}
                <div className="pointer-events-none absolute bottom-0 left-px right-px h-px bg-white/10 backdrop-blur-sm">
                  <GridCrosshair side="left" />
                  <GridCrosshair side="right" />
                </div>
              </div>

              <MediaRouteReveal className="w-full" stage="sections.reviews">
                <MediaReviews
                  entityId={movie.id}
                  entityType={mediaType}
                  title={mediaTitle}
                  headerTitle="All Reviews"
                  sectionClassName="mt-1 md:mt-2"
                  dividerPositionClassName="left-px right-px"
                  showBackdropGradient={false}
                  useQuerySortMode={true}
                  useQueryUserFilter={true}
                  posterPath={movie.poster_path}
                  backdropPath={movie.backdrop_path}
                  onReviewStateChange={setReviewState}
                  motionStage="items.reviews"
                  motionDeferred
                />
              </MediaRouteReveal>
            </div>
          </div>
        </div>
        <NavHeightSpacer />
      </PageGradientShell>
    </MediaRouteMotionProvider>
  );
}
