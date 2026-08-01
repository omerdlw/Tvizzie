import { Suspense, use } from 'react';
import { motion } from 'framer-motion';

import NavHeightSpacer from '@/features/app-shell/nav-height-spacer';
import { PageGradientShell } from '@/ui/elements/page-gradient-shell';
import { BlurryText } from '@/ui/animations/blurry-text';
import CastSection from '@/features/media/cast-section';
import CollectionActions from '@/features/media/collection-actions';
import GallerySection from '@/features/media/gallery-section';
import ImagesSection from '@/features/media/images-section';
import RecommendationCard from '@/features/media/recommendation-card';
import Sidebar from '@/features/media/sidebar';
import MediaSocialProof from '@/features/media/social-proof';
import { getGalleryImages, getMovieComputedData } from '@/features/media/utils';
import VideosSection from '@/features/media/videos-section';
import MediaReviews from '@/features/reviews/media-reviews';
import TvSeasonsSection from '@/features/media/seasons-section';
import Carousel from '@/ui/media/carousel';
import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/core/constants';
import Registry from './registry';
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
  sidebarColumnVariants,
} from '@/features/media/motion';

function RelatedMoviesSection({ items, title }) {
  if (!items?.length) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 44, scale: 0.96, filter: 'blur(20px)' }}
      whileInView={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      viewport={SCROLL_VIEWPORT_CONFIG}
      transition={{ duration: 1.5, ease: EASINGS.LUXURY }}
    >
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
    <div className="mt-12 flex flex-col gap-12">
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
    <div className="mt-12 flex flex-col gap-12">
      {sections.map((section) =>
        section.key === 'videos' ? (
          <motion.div
            key={section.key}
            initial={{ opacity: 0, y: 44, scale: 0.96, filter: 'blur(20px)' }}
            whileInView={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            viewport={SCROLL_VIEWPORT_CONFIG}
            transition={{ duration: 1.5, ease: EASINGS.LUXURY }}
          >
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
    <>
      {computed.cast?.length > 0 || computed.crew?.length > 0 ? (
        <div className="mt-10">
          <CastSection cast={computed.cast} crew={computed.crew} baseDelay={TIMELINES.CAST_SECTION_BASE_DELAY} />
        </div>
      ) : null}

      {mediaType === 'tv' ? (
        <Suspense fallback={null}>
          <div className="mt-10">
            <TvSeasonsDeferred
              secondaryDataPromise={secondaryDataPromise}
              seasons={movie.seasons || []}
            />
          </div>
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
    </>
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
                <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
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

                  <motion.div {...heroSocialProofVariants}>
                    <MediaSocialProof media={{ ...movie, entityType: mediaType }} />
                  </motion.div>
                </div>

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
                    <p className="max-w-[70ch] text-justify text-[15px] leading-6 text-black/70 sm:text-base sm:leading-7">
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
