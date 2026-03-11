'use client'

import { useState } from 'react'

import { MovieRegistry } from '@/components/movie/movie-registry'
import RecommendationCard from '@/components/movie/recommendation-card'
import { getMovieComputedData } from '@/components/movie/utils'
import Carousel from '@/components/shared/carousel'
import CastSection from '@/components/shared/cast-section'
import CollectionActions from '@/components/shared/collection-actions'
import MediaComments from '@/components/shared/comments'
import ImagesSection from '@/components/shared/images-section'
import Sidebar from '@/components/shared/sidebar'
import VideosSection from '@/components/shared/videos-section'
import { formatVotes } from '@/lib/utils'
import { FadeLeft, FadeUp, StaggerContainer } from '@/ui/animations'
import Icon from '@/ui/icon'

export default function MovieDetailClient({ movie, rating, imdbVotes }) {
  const [reviewState, setReviewState] = useState({
    isActive: false,
    isSubmitting: false,
    ownComment: false,
    submitReview: null,
  })
  const computed = getMovieComputedData(movie)
  const {
    director,
    writers,
    cast,
    recommendations,
    similar,
    keywords,
    certification,
    year,
    runtimeText,
    genres,
    imdbId,
  } = computed

  return (
    <>
      <MovieRegistry
        movie={movie}
        year={year}
        runtimeText={runtimeText}
        rating={rating}
        reviewState={reviewState}
      />

      <div className="relative mx-auto flex h-auto w-full max-w-6xl flex-col gap-4 p-3 select-none sm:p-4 md:p-6">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-linear-to-t from-black via-black/40 to-transparent" />
        <div className="mt-8 flex h-auto w-full flex-col items-start gap-6 sm:mt-12 lg:mt-20 lg:flex-row lg:gap-12">
          <FadeLeft className="w-full self-start lg:sticky lg:top-6 lg:w-100">
            <Sidebar
              item={movie}
              director={director}
              writers={writers}
              certification={certification}
              topContent={
                <CollectionActions media={{ ...movie, entityType: 'movie' }} />
              }
            />
          </FadeLeft>

          <StaggerContainer className="flex w-full min-w-0 flex-col">
            <FadeUp>
              <h1 className="font-zuume text-5xl font-bold uppercase sm:text-6xl md:text-7xl lg:text-8xl">
                {movie.title}
              </h1>
            </FadeUp>

            <FadeUp className="mt-4 flex flex-wrap items-center gap-3">
              {imdbId && (
                <a
                  href={`https://www.imdb.com/title/${imdbId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center opacity-50 transition-opacity hover:opacity-100"
                  title="View on IMDB"
                >
                  <Icon icon="cib:imdb" size={28} className="text-[#f5c518]" />
                </a>
              )}
              {rating && (
                <span className="flex items-center gap-1.5 text-sm font-semibold text-yellow-400">
                  <Icon
                    icon="solar:star-bold"
                    size={14}
                    className="text-yellow-500"
                  />
                  {rating}
                  {imdbVotes && (
                    <span className="ml-0.5 font-medium text-white/50">
                      ({formatVotes(imdbVotes)})
                    </span>
                  )}
                </span>
              )}
              {genres.length > 0 && (
                <div className="flex items-center gap-2">
                  {rating && <span className="text-white/50">|</span>}
                  {genres.map((genre) => (
                    <span
                      key={genre}
                      className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-white/70 backdrop-blur-sm"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}
            </FadeUp>

            {keywords.length > 0 && (
              <FadeUp className="mt-2 flex flex-wrap items-center gap-2">
                {keywords.map((keyword) => (
                  <span
                    key={keyword.id}
                    className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-white/70 backdrop-blur-sm"
                  >
                    #{keyword.name}
                  </span>
                ))}
              </FadeUp>
            )}

            {movie.tagline && (
              <FadeUp className="mt-4 text-justify text-sm font-semibold text-white/80 uppercase">
                {movie.tagline}
              </FadeUp>
            )}

            <FadeUp className="mt-4 text-justify text-white/70">
              {movie.overview}
            </FadeUp>

            <FadeUp className="mt-10">
              <CastSection cast={cast} />
            </FadeUp>

            <FadeUp className="mt-10">
              <ImagesSection images={movie.images} />
            </FadeUp>

            <FadeUp className="mt-10">
              <VideosSection videos={movie.videos?.results} />
            </FadeUp>

            {recommendations.length > 0 && (
              <FadeUp className="-m-1 mt-10 flex flex-col gap-4">
                <h2 className="text-xs font-semibold tracking-widest text-white/50 uppercase">
                  More like this
                </h2>
                <Carousel gap="gap-4">
                  {recommendations.map((recommendation) => (
                    <RecommendationCard
                      key={recommendation.id}
                      movie={recommendation}
                    />
                  ))}
                </Carousel>
              </FadeUp>
            )}

            {similar.length > 0 && (
              <FadeUp className="-m-1 mt-10 flex flex-col gap-4">
                <h2 className="text-xs font-semibold tracking-widest text-white/50 uppercase">
                  Similar Movies
                </h2>
                <Carousel gap="gap-4">
                  {similar.map((item) => (
                    <RecommendationCard key={item.id} movie={item} />
                  ))}
                </Carousel>
              </FadeUp>
            )}
          </StaggerContainer>
        </div>
        <MediaComments
          entityId={movie.id}
          entityType="movie"
          title={movie.title}
          posterPath={movie.poster_path}
          backdropPath={movie.backdrop_path}
          onReviewStateChange={setReviewState}
        />
      </div>
    </>
  )
}
