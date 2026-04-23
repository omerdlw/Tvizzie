import NavHeightSpacer from '@/features/layout/nav-height-spacer';
import { PageGradientShell } from '@/ui/elements/page-gradient-shell';
import { TextAnimate } from '@/ui/animations/text-animate';
import CollectionActions from '@/features/movie/collection-actions';
import Sidebar from '@/features/movie/sidebar';
import MediaReviews from '@/features/reviews';
import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/core/constants';
import { MovieClipReveal, MovieHeroReveal, MOVIE_ROUTE_TIMING, MovieSectionReveal, MovieSidebarReveal } from '../motion';

import Registry from '../registry';

export default function View({ computed, movie, reviewState, setReviewState }) {
  const { certification, director, runtimeText, writers, year } = computed;

  return (
    <>
      <Registry movie={movie} rating={null} runtimeText={runtimeText} reviewState={reviewState} year={year} />

      <PageGradientShell>
        <div
          className={`relative mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col gap-6 px-3 pb-12 [overflow-anchor:none] sm:gap-8 sm:px-4 md:px-6`}
        >
          <div className="mt-6 flex w-full flex-col items-start gap-5 sm:mt-12 sm:gap-6 lg:mt-20 lg:flex-row lg:gap-12">
            <div className="w-full shrink-0 self-start lg:sticky lg:top-6 lg:w-[400px]">
              <MovieSidebarReveal delay={MOVIE_ROUTE_TIMING.reviewsPage.sidebar}>
                <Sidebar
                  item={movie}
                  certification={certification}
                  director={director}
                  topContent={<CollectionActions media={{ ...movie, entityType: 'movie' }} />}
                  writers={writers}
                />
              </MovieSidebarReveal>
            </div>

            <div className="flex w-full min-w-0 flex-col gap-6">
              <MovieHeroReveal delay={MOVIE_ROUTE_TIMING.reviewsPage.title}>
                <MovieClipReveal animateOnView={false} delay={0.08} className="min-w-0">
                  <TextAnimate
                    animation="cinematicSoft"
                    by="word"
                    delay={MOVIE_ROUTE_TIMING.reviewsPage.title}
                    duration={MOVIE_ROUTE_TIMING.reviewsPage.titleDuration}
                    startOnView={false}
                    className="font-zuume text-5xl leading-none font-bold uppercase sm:text-6xl lg:text-7xl"
                  >
                    {movie.title}
                  </TextAnimate>
                </MovieClipReveal>
              </MovieHeroReveal>

              <MovieSectionReveal delay={MOVIE_ROUTE_TIMING.reviewsPage.reviews}>
                <MediaReviews
                  entityId={movie.id}
                  entityType="movie"
                  title={movie.title}
                  headerTitle="All Reviews"
                  sectionClassName="mt-1 md:mt-2"
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
        </div>
        <NavHeightSpacer />
      </PageGradientShell>
    </>
  );
}
