'use client';

import { useEffect, useState } from 'react';
import { NavHeightSpacer } from '@/modules/nav';
import CollectionActions from '@/domains/media/ui/components/collection-actions';
import Sidebar from '@/domains/media/ui/components/sidebar';
import MediaReviews from '@/domains/reviews/ui/sections/media-reviews';
import {
  createMovieBackdropImageUrl,
  getPreferredMovieBackground,
} from '@/domains/media/utils/media-data';
import { getMediaBackgroundPreferenceFilePath } from '@/domains/media/utils/background-preferences';
import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/shared';
import MediaRegistry from '@/domains/media/ui/registry';

function createReviewState() {
  return {
    isActive: false,
    isSubmitting: false,
    ownReview: null,
    submitReview: null,
  };
}

export default function MediaReviewsView({
  computed,
  mediaType = 'movie',
  movie,
  secondaryDataPromise,
}) {
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
    <>
      <MediaRegistry
        mediaType={mediaType}
        movie={movie}
        backgroundImage={backgroundImage}
        rating={null}
        runtimeText={runtimeText}
        reviewState={reviewState}
        year={year}
      />


        <div
          className={`relative z-10 mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col px-4 sm:px-6 lg:px-8 pb-16 [overflow-anchor:none]`}
        >
          <div className="relative flex w-full flex-col items-start gap-8 lg:flex-row lg:items-start lg:gap-10 xl:gap-12 pt-6 sm:pt-8 lg:pt-10">
            <div className="order-1 w-full shrink-0 lg:w-80 xl:w-96 lg:sticky lg:top-6">
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
              <div className="relative flex w-full flex-col mb-6 sm:mb-8">
                <h1 className="font-zuume line-clamp-2 max-w-full overflow-hidden text-7xl leading-none font-bold [overflow-wrap:anywhere] uppercase sm:text-8xl lg:text-9xl">
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

              <div className="w-full">
                <MediaReviews
                  entityId={movie.id}
                  entityType={mediaType}
                  title={mediaTitle}
                  headerTitle="All Reviews"
                  sectionClassName="mt-1 md:mt-2"
                  showBackdropGradient={false}
                  useQuerySortMode={true}
                  useQueryUserFilter={true}
                  posterPath={movie.poster_path}
                  backdropPath={movie.backdrop_path}
                  onReviewStateChange={setReviewState}
                />
              </div>
            </div>
          </div>
        </div>
        <NavHeightSpacer />

    </>
  );
}
