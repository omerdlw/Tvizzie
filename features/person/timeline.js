'use client'

import { useMemo } from 'react'

import Link from 'next/link'

import { motion } from 'framer-motion'

import { DURATION, EASING } from '@/lib/constants'

import MediaThumb from './media-thumb'
import { getTimelineCredits } from './utils'

const FADE_UP = {
  hidden: { y: 16 },
  visible: { y: 0 },
}

const STAGGER = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: DURATION.CASCADE,
      delayChildren: DURATION.STAGGER,
    },
  },
}

function groupByYear(credits) {
  const grouped = {}

  credits.forEach((credit) => {
    const year = credit.release_date ? credit.release_date.slice(0, 4) : '—'

    if (!grouped[year]) {
      grouped[year] = []
    }

    grouped[year].push(credit)
  })

  return Object.entries(grouped).sort(([firstYear], [secondYear]) => {
    if (firstYear === '—') return 1
    if (secondYear === '—') return -1
    return Number(secondYear) - Number(firstYear)
  })
}

function getCreditLabel(credit) {
  if (credit.character) {
    return `as ${credit.character}`
  }

  if (credit.job) {
    return credit.job
  }

  if (credit.department) {
    return credit.department
  }

  return null
}

export default function PersonTimeline({ person }) {
  const timeline = useMemo(
    () => groupByYear(getTimelineCredits(person)),
    [person]
  )

  if (!timeline.length) return null

  return (
    <motion.div
      className="flex w-full max-w-3xl flex-col"
      variants={STAGGER}
      initial="hidden"
      animate="visible"
    >
      {timeline.map(([year, credits]) => (
        <motion.div
          key={year}
          variants={FADE_UP}
          transition={{ duration: DURATION.MEDIUM, ease: EASING.STANDARD }}
        >
          <div className="mb-2 mt-6 flex items-center gap-3">
            <span className="w-12 shrink-0 text-right text-sm font-bold text-white">
              {year}
            </span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <div className="ml-16 flex flex-col">
            {credits.map((credit) => {
              const title = credit.title || credit.original_title || 'Untitled'
              const creditLabel = getCreditLabel(credit)

              return (
                <Link
                  key={`${credit.credit_id || credit.id}-${credit.media_type}`}
                  href={`/movie/${credit.id}`}
                  className="group flex items-end gap-3 p-1 transition-colors border border-transparent hover:border-white/10"
                >
                  <MediaThumb poster={credit.poster_path} alt={title} />

                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-lg font-bold text-white uppercase">
                        {title}
                      </span>
                    </div>

                    {creditLabel && (
                      <span className="truncate text-sm text-white">
                        {creditLabel}
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
