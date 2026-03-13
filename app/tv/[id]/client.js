'use client'

import { useCallback, useMemo, useState } from 'react'

import Image from 'next/image'

import { AnimatePresence, motion } from 'framer-motion'

import { STYLES as PAGE_STYLES } from '@/app/constants'
import Carousel from '@/components/shared/carousel'
import CastSection from '@/components/shared/cast-section'
import CollectionActions from '@/components/shared/collection-actions'
import MediaComments from '@/components/shared/comments'
import ImagesSection from '@/components/shared/images-section'
import Sidebar from '@/components/shared/sidebar'
import VideosSection from '@/components/shared/videos-section'
import EpisodeCard from '@/components/tv/episode-card'
import {
  RATING_LEGEND_ITEMS,
  getRatingSwatchClass,
  getRatingToneClass,
} from '@/components/tv/ratings'
import TvRecommendationCard from '@/components/tv/recommendation-card'
import SeasonCard from '@/components/tv/season-card'
import { TvRegistry } from '@/components/tv/tv-registry'
import { DURATION, EASING, TMDB_IMG } from '@/lib/constants'
import { formatVotes } from '@/lib/utils'
import { TmdbService } from '@/services/tmdb.service'
import { FadeLeft, FadeUp, StaggerContainer } from '@/ui/animations'
import { Tooltip } from '@/ui/elements'
import Icon from '@/ui/icon'

const SECTION_TRANSITION = {
  duration: DURATION.SLOW,
  ease: EASING.STANDARD,
}
const STYLES = Object.freeze({
  sectionTitle: 'text-xs font-semibold tracking-widest text-white/50 uppercase',
})

const SWAP_VARIANTS = {
  enter: { opacity: 0, x: 40 },
  center: {
    opacity: 1,
    x: 0,
    transitionEnd: { transform: 'none', willChange: 'auto' },
  },
  exit: { opacity: 0, x: -40 },
}

export default function TvDetailClient({ show, imdbRatings, computed }) {
  const [selectedSeason, setSelectedSeason] = useState(null)
  const [episodes, setEpisodes] = useState([])
  const [episodesLoading, setEpisodesLoading] = useState(false)
  const [activeView, setActiveView] = useState('tv-page')

  const {
    creators,
    cast,
    recommendations,
    similar,
    keywords,
    certification,
    yearRange,
    genres,
    rating,
    imdbId,
    imdbVotes,
    numberOfSeasons,
    numberOfEpisodes,
  } = computed

  const seasons = useMemo(
    () => (show?.seasons || []).filter((s) => s.season_number > 0),
    [show]
  )

  const handleSeasonClick = useCallback(
    async (season) => {
      setSelectedSeason(season)
      setEpisodesLoading(true)
      try {
        const response = await TmdbService.getSeasonDetail(
          show.id,
          season.season_number
        )
        setEpisodes(response.data?.episodes || [])
      } catch {
        setEpisodes([])
      }
      setEpisodesLoading(false)
    },
    [show.id]
  )

  const handleBackToSeasons = useCallback(() => {
    setSelectedSeason(null)
    setEpisodes([])
  }, [])

  const [reviewState, setReviewState] = useState({
    isActive: false,
    isSubmitting: false,
    ownComment: false,
    submitReview: null,
  })

  return (
    <>
      <TvRegistry
        show={show}
        yearRange={yearRange}
        numberOfSeasons={numberOfSeasons}
        numberOfEpisodes={numberOfEpisodes}
        rating={rating}
        activeView={activeView}
        setActiveView={setActiveView}
        reviewState={reviewState}
      />

      <div className={PAGE_STYLES.layout.detailShellAnimated}>
        <div className={PAGE_STYLES.layout.backdrop} />
        <div
          id={activeView === 'ratings' ? 'ratings-capture-area' : undefined}
          className={PAGE_STYLES.layout.detailSplit}
        >
          <FadeLeft className={`${PAGE_STYLES.layout.sidebar} shrink-0`}>
            {activeView === 'ratings' ? (
              <div className="hidden min-w-[200px] flex-col gap-4 lg:flex">
                <div className="relative mb-4 h-[600px] w-[400px] shrink-0 overflow-hidden rounded-[20px] ring-1 ring-white/10">
                  <Image
                    src={`${TMDB_IMG}/original${show.poster_path}`}
                    alt={show.name}
                    fill
                    priority
                    className="object-cover"
                    sizes="400px"
                  />
                </div>
                {RATING_LEGEND_ITEMS.map((item) => (
                  <div key={item.key} className="flex items-center gap-3">
                    <div
                      className={`size-4 rounded-[4px] ${item.swatchClass}`}
                    />
                    <span className="text-xs font-bold tracking-widest text-white/40 uppercase">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <Sidebar
                item={show}
                creators={creators}
                certification={certification}
                topContent={
                  <CollectionActions media={{ ...show, entityType: 'tv' }} />
                }
              />
            )}
          </FadeLeft>

          <StaggerContainer className={PAGE_STYLES.layout.content}>
            <AnimatePresence mode="wait">
              {activeView === 'ratings' ? (
                <motion.div
                  key="ratings"
                  className="flex w-full flex-col"
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={{
                    hidden: { opacity: 0, x: 20 },
                    visible: {
                      opacity: 1,
                      x: 0,
                      transition: SECTION_TRANSITION,
                      transitionEnd: { transform: 'none', willChange: 'auto' },
                    },
                    exit: {
                      opacity: 0,
                      x: -20,
                      transition: SECTION_TRANSITION,
                    },
                  }}
                >
                  <div className="flex w-full flex-col">
                    <div className="relative mb-4 aspect-2/3 w-full overflow-hidden rounded-[20px] ring-1 ring-white/10 lg:hidden">
                      <Image
                        src={`${TMDB_IMG}/original${show.poster_path}`}
                        alt={show.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 1024px) 100vw, 400px"
                      />
                    </div>
                    <div className="scrollbar-hide flex w-full overflow-x-auto">
                      <div className="flex w-full flex-col gap-1 md:gap-2">
                        <div className="flex w-full gap-1 pl-10 md:gap-2">
                          {imdbRatings?.map((_, i) => (
                            <div
                              key={i}
                              className="flex aspect-square max-w-[56px] min-w-[28px] flex-1 items-center justify-center text-[10px] font-black tracking-tighter text-white/30 uppercase md:text-xs"
                            >
                              S{i + 1}
                            </div>
                          ))}
                        </div>

                        {Array.from({
                          length: Math.max(
                            ...(imdbRatings?.map((s) => s.episodes.length) || [
                              0,
                            ])
                          ),
                        }).map((_, epIdx) => (
                          <div
                            key={epIdx}
                            className="flex w-full items-center gap-1 md:gap-2"
                          >
                            <div className="flex w-10 shrink-0 items-center justify-end pr-2 text-[10px] font-black tracking-tighter text-white/20 uppercase md:pr-3 md:text-[11px]">
                              E{epIdx + 1}
                            </div>
                            <div className="flex w-full gap-1 md:gap-2">
                              {imdbRatings?.map((season, sIdx) => {
                                const episode = season.episodes[epIdx]
                                if (!episode)
                                  return (
                                    <div
                                      key={sIdx}
                                      className="aspect-square max-w-[56px] min-w-[28px] flex-1"
                                    />
                                  )

                                const rt = episode.vote_average
                                const ratingColor = getRatingToneClass(rt)

                                return (
                                  <div
                                    key={sIdx}
                                    className="aspect-square max-w-[56px] min-w-[28px] flex-1"
                                  >
                                    <Tooltip
                                      className="px-2"
                                      text={`${episode.episode_number}. ${episode.name}`}
                                    >
                                      <div
                                        className={`flex h-full w-full cursor-default items-center justify-center rounded-[20%] text-xs font-black transition-all hover:scale-110 sm:text-sm md:text-base ${ratingColor}`}
                                      >
                                        {rt > 0 ? rt.toFixed(1) : '-'}
                                      </div>
                                    </Tooltip>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ))}

                        {/* Average Row */}
                        <div className="mt-2 flex w-full items-center gap-1 md:mt-4 md:gap-2">
                          <div className="flex w-10 shrink-0 items-center justify-end pr-2 text-[10px] font-black tracking-tighter text-white/40 uppercase md:pr-3 md:text-[11px]">
                            AVG.
                          </div>
                          <div className="flex w-full gap-1 md:gap-2">
                            {imdbRatings?.map((season, sIdx) => {
                              const validEpisodes = season.episodes.filter(
                                (e) => e.vote_average > 0
                              )
                              const MathAvg =
                                validEpisodes.length > 0
                                  ? validEpisodes.reduce(
                                      (acc, curr) => acc + curr.vote_average,
                                      0
                                    ) / validEpisodes.length
                                  : 0

                              const ratingColor = getRatingToneClass(MathAvg)
                              const ratingSwatch = getRatingSwatchClass(MathAvg)

                              return (
                                <div
                                  key={sIdx}
                                  className="flex max-w-[56px] min-w-[28px] flex-1 flex-col items-center gap-1 md:gap-1.5"
                                >
                                  <div
                                    className={`flex aspect-square w-full cursor-default items-center justify-center rounded-[20%] text-xs font-black transition-all hover:scale-110 sm:text-sm md:text-base ${ratingColor}`}
                                  >
                                    {MathAvg > 0 ? MathAvg.toFixed(1) : '-'}
                                  </div>
                                  <div
                                    className={`h-1 w-[60%] rounded-full ${ratingSwatch}`}
                                  />
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="profile"
                  className="flex w-full flex-col"
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={{
                    hidden: { opacity: 0, x: 20 },
                    visible: {
                      opacity: 1,
                      x: 0,
                      transition: {
                        ...SECTION_TRANSITION,
                        staggerChildren: DURATION.VERY_FAST,
                        delayChildren: DURATION.QUICK,
                      },
                      transitionEnd: { transform: 'none', willChange: 'auto' },
                    },
                    exit: {
                      opacity: 0,
                      x: -20,
                      transition: SECTION_TRANSITION,
                    },
                  }}
                >
                  <div className="flex w-full flex-col">
                    <FadeUp>
                      <h1 className="font-zuume text-5xl font-bold uppercase sm:text-6xl md:text-7xl lg:text-8xl">
                        {show.name}
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
                          <Icon
                            icon="cib:imdb"
                            size={28}
                            className="text-warning"
                          />
                        </a>
                      )}
                      {rating && (
                        <span className="text-warning flex items-center gap-1.5 text-sm font-semibold">
                          <Icon
                            className="text-warning"
                            icon="solar:star-bold"
                            size={14}
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
                            <div
                              key={genre}
                              className={PAGE_STYLES.chip.subtle}
                            >
                              {genre}
                            </div>
                          ))}
                        </div>
                      )}
                    </FadeUp>

                    {keywords.length > 0 && (
                      <FadeUp className="mt-4 flex flex-wrap items-center gap-2">
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

                    {show.tagline && (
                      <FadeUp className="mt-4 text-justify text-sm font-semibold text-white/80 uppercase">
                        {show.tagline}
                      </FadeUp>
                    )}

                    <FadeUp className="mt-4 text-justify text-white/70">
                      {show.overview}
                    </FadeUp>

                    {seasons.length > 0 && (
                      <FadeUp className={PAGE_STYLES.layout.section}>
                        <div className="mr-1 ml-1 flex items-center justify-between">
                          <h2 className={STYLES.sectionTitle}>
                            {selectedSeason ? selectedSeason.name : 'Seasons'}
                          </h2>
                          {selectedSeason && (
                            <button
                              onClick={handleBackToSeasons}
                              className="flex items-center gap-1.5 text-xs font-semibold tracking-widest text-white/40 uppercase transition-colors hover:text-white/70"
                            >
                              <Icon
                                icon="solar:alt-arrow-left-bold"
                                size={14}
                              />
                              Back
                            </button>
                          )}
                        </div>

                        <AnimatePresence mode="wait">
                          {!selectedSeason ? (
                            <motion.div
                              key="seasons"
                              variants={SWAP_VARIANTS}
                              initial="enter"
                              animate="center"
                              exit="exit"
                              transition={{
                                duration: DURATION.NORMAL,
                                ease: EASING.STANDARD,
                              }}
                            >
                              <Carousel gap="gap-3">
                                {seasons.map((season) => (
                                  <SeasonCard
                                    key={season.id}
                                    season={season}
                                    onClick={handleSeasonClick}
                                  />
                                ))}
                              </Carousel>
                            </motion.div>
                          ) : (
                            <motion.div
                              key={`episodes-${selectedSeason.season_number}`}
                              variants={SWAP_VARIANTS}
                              initial="enter"
                              animate="center"
                              exit="exit"
                              transition={{
                                duration: DURATION.NORMAL,
                                ease: EASING.STANDARD,
                              }}
                            >
                              {episodesLoading ? (
                                <div className="flex h-40 items-center justify-center">
                                  <Icon
                                    icon="solar:spinner-bold"
                                    size={24}
                                    className="animate-spin text-white/30"
                                  />
                                </div>
                              ) : (
                                <Carousel gap="gap-3">
                                  {episodes.map((episode) => (
                                    <EpisodeCard
                                      key={episode.id}
                                      episode={episode}
                                    />
                                  ))}
                                </Carousel>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </FadeUp>
                    )}

                    <FadeUp className="mt-10">
                      <CastSection cast={cast} />
                    </FadeUp>

                    <FadeUp className="mt-10">
                      <ImagesSection images={show.images} />
                    </FadeUp>

                    <FadeUp className="mt-10">
                      <VideosSection videos={show.videos?.results} />
                    </FadeUp>

                    {recommendations.length > 0 && (
                      <FadeUp className={PAGE_STYLES.layout.section}>
                        <h2 className={STYLES.sectionTitle}>More like this</h2>
                        <Carousel gap="gap-4">
                          {recommendations.map((item) => (
                            <TvRecommendationCard key={item.id} show={item} />
                          ))}
                        </Carousel>
                      </FadeUp>
                    )}

                    {similar.length > 0 && (
                      <FadeUp className={PAGE_STYLES.layout.section}>
                        <h2 className={STYLES.sectionTitle}>Similar Shows</h2>
                        <Carousel gap="gap-4">
                          {similar.map((item) => (
                            <TvRecommendationCard key={item.id} show={item} />
                          ))}
                        </Carousel>
                      </FadeUp>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </StaggerContainer>
        </div>
        <MediaComments
          entityId={show.id}
          entityType="tv"
          title={show.name}
          posterPath={show.poster_path}
          backdropPath={show.backdrop_path}
          onReviewStateChange={setReviewState}
        />
      </div>
    </>
  )
}
