'use client'

import { useEffect, useMemo, useState } from 'react'

import Link from 'next/link'

import { motion } from 'framer-motion'

import { DURATION, EASING } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { TmdbService } from '@/services/tmdb/tmdb.service'

import MediaThumb from './media-thumb'
import { Spinner } from '@/ui/spinner/index'

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

function isWinType(type = '') {
  const normalizedType = String(type).trim().toLowerCase()

  return (
    normalizedType.includes('win') ||
    normalizedType.includes('winner') ||
    normalizedType.includes('kazan')
  )
}

function sortAwardsByYear(left, right) {
  if (left[0] === '—') {
    return 1
  }

  if (right[0] === '—') {
    return -1
  }

  return Number(right[0]) - Number(left[0])
}

function buildAwardsTimeline(organizations = []) {
  const awards = organizations.flatMap((organization) =>
    (organization.years || []).flatMap((yearGroup) =>
      (yearGroup.categories || []).map((category, index) => ({
        key: `${organization.id}-${yearGroup.year}-${index}-${category.projectId || category.project || category.category}`,
        year: yearGroup.year || '—',
        organization: organization.title,
        type: category.type || 'Nominee',
        category: category.category || 'Award',
        project: category.project || null,
        projectId: category.projectId || null,
        poster: category.poster || null,
      }))
    )
  )

  const grouped = awards.reduce((accumulator, award) => {
    if (!accumulator[award.year]) {
      accumulator[award.year] = []
    }

    accumulator[award.year].push(award)
    return accumulator
  }, {})

  return Object.entries(grouped)
    .sort(sortAwardsByYear)
    .map(([year, entries]) => [
      year,
      entries.sort((left, right) => {
        const rankDifference =
          Number(!isWinType(left.type)) - Number(!isWinType(right.type))

        if (rankDifference !== 0) {
          return rankDifference
        }

        return (
          left.organization.localeCompare(right.organization) ||
          left.category.localeCompare(right.category)
        )
      }),
    ])
}

function AwardsState({ message, variant = 'empty' }) {
  return (
    <div className="flex w-full justify-center py-20">
      <p className={cn('text-sm font-medium text-white', variant === 'error' && 'text-white/70')}>
        {message}
      </p>
    </div>
  )
}

export default function PersonAwards({ personId }) {
  const [awardsData, setAwardsData] = useState(null)
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState(null)

  useEffect(() => {
    let isCurrent = true

    setStatus('loading')
    setErrorMessage(null)

    void (async () => {
      try {
        const response = await TmdbService.getPersonAwards(personId)

        if (!isCurrent) {
          return
        }

        if (response?.error || !response?.data) {
          setAwardsData(null)
          setErrorMessage('Awards are temporarily unavailable')
          setStatus('error')
          return
        }

        setAwardsData(response.data)
        setStatus('ready')
      } catch {
        if (isCurrent) {
          setAwardsData(null)
          setErrorMessage('Awards are temporarily unavailable')
          setStatus('error')
        }
      }
    })()

    return () => {
      isCurrent = false
    }
  }, [personId])

  const awardsTimeline = useMemo(
    () => buildAwardsTimeline(awardsData?.organizations || []),
    [awardsData]
  )

  if (status === 'loading') {
    return (
      <div className="flex w-full justify-center mt-20">
        <Spinner size={50} />
      </div>
    )
  }

  if (status === 'error') {
    return <AwardsState message={errorMessage} variant="error" />
  }

  if (!awardsTimeline.length) {
    return <AwardsState message="No awards information found" />
  }

  const stats = awardsData?.stats

  return (
    <motion.div
      className="flex w-full max-w-4xl flex-col gap-10"
      variants={STAGGER}
      initial="hidden"
      animate="visible"
    >
      <div className="flex items-end justify-between border-b border-white/10">
        <h2 className="font-serif text-3xl font-light tracking-wide text-white uppercase">
          Awards
        </h2>
        {(stats?.totalWins > 0 || stats?.totalNominations > 0) && (
          <div className="text-sm font-semibold text-white/70">
            {stats.totalNominations} Nominations
            {stats.totalWins > 0 && `, ${stats.totalWins} Wins`}
          </div>
        )}
      </div>

      <div className="flex w-full max-w-3xl flex-col">
        {awardsTimeline.map(([year, entries]) => (
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
              {entries.map((entry) => {
                const isInteractive = Boolean(entry.projectId)
                const title = entry.project || entry.category
                const detail = entry.project
                  ? `${entry.organization} / ${entry.type} · ${entry.category}`
                  : `${entry.organization} / ${entry.type}`

                const rowClassName = cn(
                  "group flex items-end gap-3 p-1 transition-colors border border-transparent",
                  isInteractive ? 'group hover:border-white/10' : 'cursor-default'
                )

                const content = (
                  <>
                    <MediaThumb
                      poster={entry.poster}
                      alt={title}
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-lg font-bold text-white uppercase">
                          {title}
                        </span>
                      </div>

                      <span className="truncate text-sm text-white">
                        {detail}
                      </span>
                    </div>
                  </>
                )

                if (isInteractive) {
                  return (
                    <Link
                      key={entry.key}
                      href={`/movie/${entry.projectId}`}
                      className={rowClassName}
                    >
                      {content}
                    </Link>
                  )
                }

                return (
                  <div key={entry.key} className={rowClassName}>
                    {content}
                  </div>
                )
              })}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
