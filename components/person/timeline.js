'use client'

import { useMemo } from 'react'

import Link from 'next/link'

import { motion } from 'framer-motion'

import Icon from '@/ui/icon'

const FADE_UP = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
}

const STAGGER = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.03, delayChildren: 0.05 },
  },
}

function groupByYear(credits) {
  const grouped = {}
  credits.forEach((credit) => {
    const isMovie = credit.media_type === 'movie'
    const date = isMovie ? credit.release_date : credit.first_air_date
    const year = date ? date.slice(0, 4) : '—'
    if (!grouped[year]) grouped[year] = []
    grouped[year].push(credit)
  })

  return Object.entries(grouped).sort(([a], [b]) => {
    if (a === '—') return 1
    if (b === '—') return -1
    return Number(b) - Number(a)
  })
}

export default function PersonTimeline({ person }) {
  const timeline = useMemo(() => {
    const cast = person?.combined_credits?.cast || []
    const sorted = [...cast].sort((a, b) => {
      const dateA = a.release_date || a.first_air_date || ''
      const dateB = b.release_date || b.first_air_date || ''
      return dateB.localeCompare(dateA)
    })
    return groupByYear(sorted)
  }, [person])

  if (!timeline.length) return null

  return (
    <motion.div
      className="flex w-full max-w-3xl flex-col"
      variants={STAGGER}
      initial="hidden"
      animate="visible"
    >
      {timeline.map(([year, credits], groupIndex) => (
        <motion.div
          key={year}
          variants={FADE_UP}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {(groupIndex === 0 || timeline[groupIndex - 1][0] !== year) && (
            <div className="mt-6 mb-2 flex items-center gap-4">
              <span className="w-12 shrink-0 text-right text-sm font-bold text-white/50">
                {year}
              </span>
              <div className="h-px flex-1 bg-white/10" />
            </div>
          )}
          <div className="flex flex-col">
            {credits.map((credit) => {
              const isMovie = credit.media_type === 'movie'
              const title = isMovie
                ? credit.title || credit.original_title
                : credit.name || credit.original_name
              const href = isMovie
                ? `/movie/${credit.id}`
                : `/tv/${credit.id}`
              const character = credit.character
              const episodeCount = credit.episode_count
              const mediaIcon = isMovie
                ? 'solar:clapperboard-text-bold'
                : 'solar:tv-bold'

              return (
                <Link
                  key={`${credit.credit_id || credit.id}-${credit.media_type}`}
                  href={href}
                  className="group -mx-2 flex items-start gap-4 rounded-[12px] px-2 py-2.5 transition-colors hover:bg-white/5"
                >
                  <div className="flex w-12 shrink-0 justify-end pt-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-white/20 ring-1 ring-white/10 transition-all group-hover:bg-white/50 group-hover:ring-white/30" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <Icon
                        icon={mediaIcon}
                        size={12}
                        className="shrink-0 text-white/30"
                      />
                      <span className="truncate text-sm font-semibold text-white transition-colors group-hover:text-white">
                        {title}
                      </span>
                    </div>
                    {character && (
                      <span className="ml-5 truncate text-xs text-white/50">
                        as {character}
                        {episodeCount > 0 && ` · ${episodeCount} eps`}
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </motion.div>
      ))}
    </motion.div>
  )
}
