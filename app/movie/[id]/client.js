'use client'

import { useState } from 'react'

import { STYLES as PAGE_STYLES } from '@/app/constants'
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

const STYLES = Object.freeze({
  sectionTitle: 'text-xs font-semibold tracking-widest text-white/50 uppercase',
})

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

      <div className={PAGE_STYLES.layout.detailShell}>
        <div className={PAGE_STYLES.layout.backdrop} />
        <div className={PAGE_STYLES.layout.detailSplit}>
          <FadeLeft className={PAGE_STYLES.layout.sidebar}>
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

          <StaggerContainer className={PAGE_STYLES.layout.content}>
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
                  <Icon icon="cib:imdb" size={28} className="text-warning" />
                </a>
              )}
              {rating && (
                <span className="flex items-center gap-1.5 text-sm font-semibold text-warning">
                  <Icon
                    icon="solar:star-bold"
                    size={14}
                    className="text-warning"
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
                      className={PAGE_STYLES.chip.subtle}
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
                    className={PAGE_STYLES.chip.subtle}
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
              <FadeUp className={PAGE_STYLES.layout.section}>
                <h2 className={STYLES.sectionTitle}>More like this</h2>
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
              <FadeUp className={PAGE_STYLES.layout.section}>
                <h2 className={STYLES.sectionTitle}>Similar Movies</h2>
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
