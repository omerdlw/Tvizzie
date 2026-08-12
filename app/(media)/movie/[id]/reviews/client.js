'use client';

import { useState } from 'react';
import NavHeightSpacer from '@/ui/layout/nav-height-spacer';
import { PageGradientShell } from '@/ui/layout/page-gradient-shell';
import CollectionActions from '@/domains/media/ui/components/collection-actions';
import Sidebar from '@/domains/media/ui/components/sidebar';
import MediaReviews from '@/domains/reviews/ui/sections/media-reviews';
import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/shared/constants';
import Registry from '@/app/(media)/registry';
import { MediaRouteMotionProvider, MediaRouteReveal } from '@/app/(media)/motion';
import MediaGridFrame from '@/domains/media/ui/layouts/media-grid-frame';

function createReviewState() {
  return {
    isActive: false,
    isSubmitting: false,
    ownReview: false,
    submitReview: null,
  };
}

export default function Client({ computed, mediaType = 'movie', movie }) {
  const [reviewState, setReviewState] = useState(createReviewState);

  return (
    <View
      computed={computed}
      mediaType={mediaType}
      movie={movie}
      reviewState={reviewState}
      setReviewState={setReviewState}
    />
  );
}

function View({ computed, mediaType = 'movie', movie, reviewState, setReviewState }) {
  const { certification, creators, director, genres, runtimeText, tags, writers, year } = computed;
  const mediaTitle =
    movie.title || movie.original_title || movie.name || movie.original_name || 'Untitled';

  return (
    <MediaRouteMotionProvider routeKey={`${mediaType}-${movie.id}-reviews`}>
      <Registry
        mediaType={mediaType}
        movie={movie}
        rating={null}
        runtimeText={runtimeText}
        reviewState={reviewState}
        year={year}
      />

      <PageGradientShell>
        <MediaGridFrame />
        <div
          className={`relative z-10 mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col gap-6 px-3 pb-12 [overflow-anchor:none] sm:gap-8 sm:px-4 md:px-6`}
        >
          <div className="mt-6 flex w-full flex-col items-start gap-5 sm:mt-12 sm:gap-6 lg:mt-20 lg:flex-row lg:items-stretch lg:gap-12">
            <div className="w-full shrink-0 self-start lg:w-[400px] lg:self-stretch">
              <div className="lg:sticky lg:top-6">
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
            </div>

            <div className="flex w-full min-w-0 flex-col gap-6 lg:self-stretch">
              <div className="min-w-0">
                <MediaRouteReveal stage="hero.title">
                  <h1 className="font-zuume text-5xl leading-none font-bold uppercase sm:text-6xl lg:text-7xl">
                    {mediaTitle}
                  </h1>
                </MediaRouteReveal>
              </div>

              <MediaRouteReveal className="w-full" stage="sections.reviews">
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
