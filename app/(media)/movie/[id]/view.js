import { Suspense, use } from 'react'

import dynamic from 'next/dynamic'

import CollectionActions from '@/features/movie/collection-actions'
import RecommendationCard from '@/features/movie/recommendation-card'
import Sidebar from '@/features/movie/sidebar'
import MediaSocialProof from '@/features/movie/social-proof'
import {
  getGalleryImages,
  getMovieComputedData,
} from '@/features/movie/utils'
import { PageGradientShell } from '@/features/layout/page-gradient-backdrop'
import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/lib/constants'
import { FadeLeft, FadeUp } from '@/ui/animations'
import Icon from '@/ui/icon'

import Registry from './registry'

const CastSection = dynamic(() => import('@/features/movie/cast-section'))
const GallerySection = dynamic(() => import('@/features/movie/gallery-section'))
const ImagesSection = dynamic(() => import('@/features/movie/images-section'))
const VideosSection = dynamic(() => import('@/features/movie/videos-section'))
const MediaReviews = dynamic(() => import('@/features/reviews'))
const Carousel = dynamic(() => import('@/features/shared/carousel'))

function DeferredSectionsFallback() {
  return (
    <div className="mt-10 flex h-40 items-center justify-center">
      <Icon
        icon="solar:spinner-bold"
        size={24}
        className="animate-spin text-white"
      />
    </div>
  )
}

function RelatedMoviesSection({ items, title }) {
  if (!items?.length) {
    return null
  }

  return (
    <FadeUp className="mt-10 flex flex-col gap-3">
      <h2 className="text-[11px] font-semibold tracking-widest text-white/50 uppercase">
        {title}
      </h2>
      <Carousel
        gap="gap-3"
        itemClassName="w-[calc((100%-12px)/2)] sm:w-[calc((100%-24px)/3)] md:w-[calc((100%-36px)/4)]"
      >
        {items.map((item, index) => (
          <RecommendationCard
            key={item.id}
            movie={item}
            imagePriority={index < 4}
            imageFetchPriority={index < 4 ? 'high' : undefined}
          />
        ))}
      </Carousel>
    </FadeUp>
  )
}

function MovieSecondaryContent({ movie, secondaryDataPromise }) {
  const secondaryMovie = use(secondaryDataPromise)
  const mergedMovie = {
    ...movie,
    ...secondaryMovie,
  }
  const deferredComputed = getMovieComputedData(mergedMovie)
  const galleryImages = getGalleryImages(mergedMovie.images)

  return (
    <>
      <FadeUp className="mt-10">
        <CastSection cast={deferredComputed.cast || []} />
      </FadeUp>

      {galleryImages.length > 0 && (
        <FadeUp className="mt-10">
          <GallerySection images={galleryImages} />
        </FadeUp>
      )}

      {mergedMovie.images && (
        <FadeUp className="mt-10">
          <ImagesSection images={mergedMovie.images} />
        </FadeUp>
      )}

      {mergedMovie.videos?.results?.length > 0 && (
        <FadeUp className="mt-10">
          <VideosSection videos={mergedMovie.videos.results} />
        </FadeUp>
      )}

      <RelatedMoviesSection
        items={deferredComputed.recommendations}
        title="More like this"
      />
      <RelatedMoviesSection
        items={deferredComputed.similar}
        title="Similar movies"
      />
    </>
  )
}

export default function MovieView({
  backgroundImage,
  computed,
  movie,
  reviewState,
  secondaryDataPromise,
  setReviewState,
}) {
  const {
    certification,
    director,
    rating,
    runtimeText,
    writers,
    year,
  } = computed

  return (
    <>
      <Registry
        backgroundImage={backgroundImage}
        rating={rating}
        movie={movie}
        reviewState={reviewState}
        runtimeText={runtimeText}
        year={year}
      />

      <PageGradientShell>
        <div
          className={`relative mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col gap-8 px-3 pb-12 sm:px-4 md:px-6`}
        >
          <div className="mt-8 flex w-full flex-col items-start gap-6 sm:mt-12 lg:mt-20 lg:flex-row lg:gap-12">
            <div className="w-full shrink-0 self-start lg:sticky lg:top-6 lg:w-[400px]">
              <FadeLeft>
                <Sidebar
                  item={movie}
                  certification={certification}
                  director={director}
                  topContent={
                    <CollectionActions media={{ ...movie, entityType: 'movie' }} />
                  }
                  writers={writers}
                />
              </FadeLeft>
            </div>

            <div className="flex w-full min-w-0 flex-col">
              <div className="flex w-full flex-col">
                <FadeUp delay={0.05}>
                  <div className="flex items-end justify-between gap-3">
                    <h1 className="font-zuume text-7xl font-bold uppercase sm:text-8xl">
                      {movie.title}
                    </h1>
                    <MediaSocialProof media={{ ...movie, entityType: 'movie' }} />
                  </div>
                </FadeUp>
                {movie.tagline && (
                  <FadeUp
                    delay={0.1}
                    className="mt-4 text-sm font-semibold tracking-widest text-white uppercase"
                  >
                    {movie.tagline}
                  </FadeUp>
                )}

                {movie.overview && (
                  <FadeUp delay={0.15} className="mt-4 text-base leading-7 text-white/70">
                    {movie.overview}
                  </FadeUp>
                )}

                <Suspense fallback={<DeferredSectionsFallback />}>
                  <MovieSecondaryContent
                    movie={movie}
                    secondaryDataPromise={secondaryDataPromise}
                  />
                </Suspense>
              </div>
            </div>
          </div>

          <MediaReviews
            entityId={movie.id}
            entityType="movie"
            title={movie.title}
            posterPath={movie.poster_path}
            backdropPath={movie.backdrop_path}
            onReviewStateChange={setReviewState}
          />
        </div>
      </PageGradientShell>
    </>
  )
}
