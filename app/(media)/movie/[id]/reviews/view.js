import NavHeightSpacer from '@/features/app-shell/nav-height-spacer';
import { PageGradientShell } from '@/ui/elements/page-gradient-shell';
import { TextAnimate } from '@/ui/animations/text-animate';
import CollectionActions from '@/features/movie/collection-actions';
import { MovieGridFrame, MovieGridSidebarBoundary } from '@/features/movie/grid-animation';
import { MovieSidebarPrimary } from '@/features/movie/sidebar';
import MediaReviews from '@/features/reviews/media-reviews';
import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/core/constants';
import {
  MovieClipReveal,
  MovieHeroReveal,
  MOVIE_ROUTE_TIMING,
  MovieSectionReveal,
  MovieSidebarReveal,
} from '../motion';

import Registry from '../registry';

function ReviewsSidebarActions({ movie }) {
  return (
    <div className="movie-reviews-sidebar-actions">
      <CollectionActions media={{ ...movie, entityType: 'movie' }} />
    </div>
  );
}

export default function View({ computed, movie, reviewState, setReviewState }) {
  const { runtimeText, year } = computed;

  return (
    <>
      <Registry movie={movie} rating={null} runtimeText={runtimeText} reviewState={reviewState} year={year} />

      <PageGradientShell className="overflow-hidden" contentClassName="movie-detail-grid-content">
        <MovieGridFrame
          className={`overflow-anchor-none mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col gap-0 px-0`}
        >
          <section className="movie-detail-grid-section movie-detail-grid-primary movie-detail-grid-primary-layout movie-reviews-primary-layout items-stretch border-t-0">
            <div className="movie-detail-grid-sidebar relative w-full shrink-0">
              <div className="h-full lg:sticky lg:top-0">
                <MovieSidebarReveal delay={MOVIE_ROUTE_TIMING.reviewsPage.sidebar}>
                  <MovieSidebarPrimary item={movie} topContent={<ReviewsSidebarActions movie={movie} />} />
                </MovieSidebarReveal>
              </div>
              <MovieGridSidebarBoundary />
            </div>

            <div className="movie-detail-grid-main flex w-full min-w-0 flex-col">
              <div className="flex w-full flex-col py-7 sm:py-8 lg:py-12">
                <div className="movie-detail-shell-inset mb-6">
                  <MovieHeroReveal delay={MOVIE_ROUTE_TIMING.reviewsPage.title}>
                    <MovieClipReveal animateOnView={false} delay={0.08} className="min-w-0">
                      <TextAnimate
                        animation="cinematicSoft"
                        by="word"
                        delay={MOVIE_ROUTE_TIMING.reviewsPage.title}
                        duration={MOVIE_ROUTE_TIMING.reviewsPage.titleDuration}
                        startOnView={false}
                        className="font-zuume max-w-full text-6xl leading-none font-bold uppercase sm:text-7xl lg:text-8xl"
                      >
                        {movie.title}
                      </TextAnimate>
                    </MovieClipReveal>
                  </MovieHeroReveal>
                </div>

                <MovieSectionReveal delay={MOVIE_ROUTE_TIMING.reviewsPage.reviews}>
                  <MediaReviews
                    entityId={movie.id}
                    entityType="movie"
                    title={movie.title}
                    headerTitle="All Reviews"
                    sectionClassName="movie-reviews-panel mt-1 md:mt-2"
                    showBackdropGradient={false}
                    useQuerySortMode={true}
                    useQueryUserFilter={true}
                    posterPath={movie.poster_path}
                    backdropPath={movie.backdrop_path}
                    onReviewStateChange={setReviewState}
                  />
                </MovieSectionReveal>
              </div>
            </div>
          </section>

          <NavHeightSpacer className="w-full" />
        </MovieGridFrame>
      </PageGradientShell>
    </>
  );
}
