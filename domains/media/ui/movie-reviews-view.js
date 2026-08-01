import { motion } from 'framer-motion';

import NavHeightSpacer from '@/ui/layout/nav-height-spacer';
import { PageGradientShell } from '@/ui/layout/page-gradient-shell';
import CollectionActions from '@/domains/media/ui/collection-actions';
import Sidebar from '@/domains/media/ui/sidebar';
import MediaReviews from '@/domains/reviews/ui/media-reviews';
import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/shared/constants';
import Registry from '@/domains/media/ui/media-registry';
import {
  heroTitleVariants,
  mainContentColumnVariants,
  scrollReviewsSectionVariants,
  sidebarColumnVariants,
} from '@/domains/media/ui/media-animation-config';

export default function View({
  computed,
  mediaType = 'movie',
  movie,
  reviewState,
  setReviewState,
}) {
  const { certification, creators, director, runtimeText, writers, year } = computed;
  const mediaTitle =
    movie.title || movie.original_title || movie.name || movie.original_name || 'Untitled';

  return (
    <>
      <Registry
        mediaType={mediaType}
        movie={movie}
        rating={null}
        runtimeText={runtimeText}
        reviewState={reviewState}
        year={year}
      />

      <PageGradientShell>
        <div
          className={`relative mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col gap-6 px-3 pb-12 [overflow-anchor:none] sm:gap-8 sm:px-4 md:px-6`}
        >
          <div className="mt-6 flex w-full flex-col items-start gap-5 sm:mt-12 sm:gap-6 lg:mt-20 lg:flex-row lg:items-stretch lg:gap-12">
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
                  topContent={<CollectionActions media={{ ...movie, entityType: mediaType }} />}
                  writers={writers}
                />
              </div>
            </motion.div>

            <motion.div
              {...mainContentColumnVariants}
              className="flex w-full min-w-0 flex-col gap-6 lg:self-stretch"
            >
              <motion.div {...heroTitleVariants} className="min-w-0">
                <h1 className="font-zuume text-5xl leading-none font-bold uppercase sm:text-6xl lg:text-7xl">
                  {mediaTitle}
                </h1>
              </motion.div>

              <motion.div {...scrollReviewsSectionVariants} className="w-full">
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
              </motion.div>
            </motion.div>
          </div>
        </div>
        <NavHeightSpacer />
      </PageGradientShell>
    </>
  );
}
