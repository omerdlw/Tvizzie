'use client'

import { useCallback, useMemo, useState } from 'react'

import { AnimatePresence, motion } from 'framer-motion'

import ConfirmationModal from '@/components/modals/confirmation-modal'
import ImagePreviewModal from '@/components/modals/image-preview'
import PersonAction from '@/components/nav-actions/person-action'
import SearchAction from '@/components/nav-actions/search-action'
import PersonAwards from '@/components/person/awards'
import PersonBio from '@/components/person/bio'
import FilmographyCard from '@/components/person/filmography-card'
import PersonGallery from '@/components/person/gallery'
import PersonHero from '@/components/person/hero'
import SocialLinks from '@/components/person/social-links'
import PersonTimeline from '@/components/person/timeline'
import Carousel from '@/components/shared/carousel'
import { useRegistry } from '@/lib/hooks'
import { formatDate } from '@/lib/utils'
import { useModal } from '@/modules/modal/context'
import { useNavHeight } from '@/modules/nav/hooks'
import { FadeUp, StaggerContainer } from '@/ui/animations'
import Icon from '@/ui/icon'

const TMDB_IMG = 'https://image.tmdb.org/t/p'
const MAX_KNOWN_FOR = 10
const MAX_FILMOGRAPHY = 30

function calculateAge(birthday, deathday) {
  if (!birthday) return null
  const birth = new Date(birthday)
  const end = deathday ? new Date(deathday) : new Date()
  let age = end.getFullYear() - birth.getFullYear()
  const monthDiff = end.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && end.getDate() < birth.getDate())) {
    age--
  }
  return age
}

function StatPill({ icon, children }) {
  return (
    <div className="flex items-center gap-2 rounded-[16px] bg-white/5 px-4 py-2.5 text-sm text-white/70 border border-white/10 backdrop-blur-sm">
      <Icon icon={icon} size={16} className="shrink-0 text-white/50" />
      {children}
    </div>
  )
}

function FilmographyTabs({ activeTab, onTabChange, movieCount, tvCount }) {
  const tabs = [
    { key: 'movie', label: 'Movies', count: movieCount },
    { key: 'tv', label: 'TV Shows', count: tvCount },
  ]

  return (
    <div className="flex items-center gap-1 rounded-[12px] bg-white/5 p-0.5 ring-1 ring-white/10 backdrop-blur-lg">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`cursor-pointer rounded-[10px] px-3 py-1 text-xs font-medium transition-all duration-200 ${activeTab === tab.key
              ? 'bg-white/15 text-white'
              : 'text-white/50 hover:text-white/70'
            }`}
        >
          {tab.label}
          {tab.count > 0 && (
            <span className="ml-1.5 text-[10px] text-white/30">
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

export default function PersonDetailClient({ person }) {
  const [filmographyTab, setFilmographyTab] = useState('movie')
  const [activeView, setActiveView] = useState('profile')
  const { navHeight } = useNavHeight()
  const { openModal } = useModal()
  const [isSearching, setIsSearching] = useState(false)

  const age = useMemo(
    () => calculateAge(person?.birthday, person?.deathday),
    [person]
  )

  const randomBackdrop = useMemo(() => {
    const credits = person?.combined_credits?.cast || []
    const withBackdrop = credits.filter((c) => c.backdrop_path)
    if (!withBackdrop.length) return null
    return withBackdrop[Math.floor(Math.random() * withBackdrop.length)]
      .backdrop_path
  }, [person])

  useRegistry({
    nav: {
      title: person?.name,
      icon: person?.profile_path
        ? `${TMDB_IMG}/original${person.profile_path}`
        : undefined,
      isLoading: false,
      actions: [
        {
          key: 'search-overlay',
          icon: isSearching
            ? 'solar:close-circle-bold'
            : 'solar:magnifer-linear',
          order: 30,
          onClick: (e) => {
            e.stopPropagation()
            setIsSearching((prev) => !prev)
          },
        },
      ],
      action: isSearching ? (
        <SearchAction />
      ) : (
        <PersonAction
          key={activeView}
          activeView={activeView}
          setActiveView={setActiveView}
        />
      ),
    },
    background: {
      overlay: true,
      overlayOpacity: 0.7,
      noiseStyle: {
        opacity: 0.5,
      },
      image: randomBackdrop
        ? `${TMDB_IMG}/original${randomBackdrop}`
        : undefined,
    },
    loading: { isLoading: false },
    modal: {
      PREVIEW_MODAL: ImagePreviewModal,
      CONFIRMATION_MODAL: ConfirmationModal,
    },
  })

  const knownFor = useMemo(() => {
    const credits = person?.combined_credits?.cast || []
    return [...credits]
      .filter((c) => c.poster_path && c.vote_count > 50)
      .sort(
        (a, b) => b.vote_average * b.vote_count - a.vote_average * a.vote_count
      )
      .slice(0, MAX_KNOWN_FOR)
  }, [person])

  const movieCredits = useMemo(() => {
    const cast = person?.movie_credits?.cast || []
    return [...cast]
      .filter((c) => c.poster_path)
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, MAX_FILMOGRAPHY)
      .map((c) => ({ ...c, media_type: 'movie' }))
  }, [person])

  const tvCredits = useMemo(() => {
    const cast = person?.tv_credits?.cast || []
    return [...cast]
      .filter((c) => c.poster_path)
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, MAX_FILMOGRAPHY)
      .map((c) => ({ ...c, media_type: 'tv' }))
  }, [person])

  const activeFilmography =
    filmographyTab === 'movie' ? movieCredits : tvCredits

  const handleTabChange = useCallback((tab) => {
    setFilmographyTab(tab)
  }, [])

  if (!person) return null

  return (
    <div className="relative mx-auto flex h-auto w-full max-w-6xl flex-col items-center gap-4 p-3 select-none sm:p-4 md:p-6">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-linear-to-t from-black via-black/40 to-transparent" />

      <StaggerContainer className="mt-24 flex w-full flex-col items-center gap-10">
        <FadeUp>
          <PersonHero person={person} />
        </FadeUp>

        <FadeUp className="flex flex-wrap items-center justify-center gap-3">
          {person.birthday && (
            <StatPill icon="solar:calendar-bold">
              {formatDate(person.birthday)}
              {age !== null && (
                <span className="ml-1 text-white/40">
                  ({age}
                  {person.deathday ? '' : ' yrs'})
                </span>
              )}
            </StatPill>
          )}
          {person.deathday && (
            <StatPill icon="solar:calendar-mark-bold">
              † {formatDate(person.deathday)}
            </StatPill>
          )}
          {person.place_of_birth && (
            <StatPill icon="solar:map-point-bold">
              {person.place_of_birth}
            </StatPill>
          )}
        </FadeUp>

        <FadeUp className="flex justify-center">
          <SocialLinks externalIds={person.external_ids} />
        </FadeUp>

        <AnimatePresence mode="wait">
          {activeView === 'timeline' ? (
            <motion.div
              key="timeline"
              className="flex w-full flex-col items-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{
                opacity: 1,
                y: 0,
                transitionEnd: { transform: 'none' },
              }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <PersonTimeline person={person} />
            </motion.div>
          ) : activeView === 'awards' ? (
            <motion.div
              key="awards"
              className="flex w-full flex-col items-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{
                opacity: 1,
                y: 0,
                transitionEnd: { transform: 'none' },
              }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <PersonAwards personId={person.id} />
            </motion.div>
          ) : (
            <motion.div
              key="profile"
              className="flex w-full flex-col items-center gap-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{
                opacity: 1,
                y: 0,
                transitionEnd: { transform: 'none' },
              }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <div className="w-full max-w-3xl">
                <PersonBio biography={person.biography} />
              </div>

              {knownFor.length > 0 && (
                <div className="-m-1 flex w-full flex-col gap-4">
                  <h2 className="ml-1 text-xs font-semibold tracking-widest text-white/50 uppercase">
                    Known For
                  </h2>
                  <Carousel gap="gap-3">
                    {knownFor.map((credit) => (
                      <FilmographyCard
                        key={`${credit.media_type}-${credit.id}-${credit.credit_id}`}
                        credit={credit}
                      />
                    ))}
                  </Carousel>
                </div>
              )}

              {(movieCredits.length > 0 || tvCredits.length > 0) && (
                <div className="-m-1 flex w-full flex-col gap-4">
                  <div className="ml-1 flex items-center gap-4">
                    <h2 className="text-xs font-semibold tracking-widest text-white/50 uppercase">
                      Filmography
                    </h2>
                    <FilmographyTabs
                      activeTab={filmographyTab}
                      onTabChange={handleTabChange}
                      movieCount={movieCredits.length}
                      tvCount={tvCredits.length}
                    />
                  </div>
                  <Carousel gap="gap-3" key={filmographyTab}>
                    {activeFilmography.map((credit) => (
                      <FilmographyCard
                        key={`${credit.media_type}-${credit.id}-${credit.credit_id}`}
                        credit={credit}
                      />
                    ))}
                  </Carousel>
                </div>
              )}

              <div className="-m-1 w-full">
                <PersonGallery images={person.images} openModal={openModal} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </StaggerContainer>
      <div className="shrink-0" style={{ height: navHeight }} />
    </div>
  )
}
