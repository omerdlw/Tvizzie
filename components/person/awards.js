'use client'

import { useEffect, useState } from 'react'

import Image from 'next/image'
import Link from 'next/link'

import { motion } from 'framer-motion'

import { TmdbService } from '@/services/tmdb.service'
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

export default function PersonAwards({ personId }) {
  const [awardsData, setAwardsData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAwards = async () => {
      const { data } = await TmdbService.getPersonAwards(personId)
      setAwardsData(data)
      setLoading(false)
    }
    fetchAwards()
  }, [personId])

  if (loading) {
    return (
      <div className="flex w-full justify-center py-20">
        <Icon icon="line-md:loading-loop" size={32} className="text-white/50" />
      </div>
    )
  }

  if (!awardsData || !awardsData.organizations?.length) {
    return (
      <div className="flex w-full justify-center py-20">
        <p className="text-sm font-medium text-white/40">
          No awards information found.
        </p>
      </div>
    )
  }

  const { organizations, stats } = awardsData

  return (
    <motion.div
      className="flex w-full max-w-4xl flex-col gap-10"
      variants={STAGGER}
      initial="hidden"
      animate="visible"
    >
      <div className="flex items-end justify-between border-b border-white/10 pb-4">
        <h2 className="font-serif text-3xl font-light tracking-tight text-white uppercase">
          Awards
        </h2>
        {(stats?.totalWins > 0 || stats?.totalNominations > 0) && (
          <div className="text-sm font-semibold text-white/60">
            {stats.totalNominations} Nominations
            {stats.totalWins > 0 && `, ${stats.totalWins} Wins`}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-12">
        {organizations.map((org) => (
          <motion.div
            key={org.id}
            variants={FADE_UP}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex flex-col gap-4"
          >
            {/* Org Header */}
            <div className="flex items-center gap-4">
              {org.logo ? (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/5 p-2">
                  <Image
                    src={org.logo}
                    alt={org.title}
                    width={48}
                    height={48}
                    className="object-contain"
                    unoptimized
                  />
                </div>
              ) : null}
              <h3 className="text-xl font-bold text-white/90">{org.title}</h3>
            </div>

            {/* Org Layout - Minimal */}
            <div className="relative mt-2 flex flex-col gap-4 border-l border-white/10 pl-4 sm:pl-8">
              {/* Decorative dot */}
              <div className="absolute top-2 left-[-5px] h-2 w-2 rounded-full bg-white/20" />

              {org.years.map((yearGroup, yIndex) => (
                <div
                  key={`${org.id}-${yearGroup.year}-${yIndex}`}
                  className="flex flex-col gap-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-serif text-lg font-bold text-white/90">
                      {yearGroup.year}
                    </span>
                    <div className="h-px flex-1 bg-linear-to-r from-white/10 to-transparent" />
                  </div>

                  <div className="flex flex-col gap-3 pl-2 sm:pl-4">
                    {yearGroup.categories.map((cat, cIndex) => {
                      const isWin =
                        cat.type.toLowerCase().includes('win') ||
                        cat.type.toLowerCase().includes('kazan')

                      const projectHref = cat.projectId
                        ? `/${cat.mediaType}/detail/${cat.projectId}`
                        : '#'

                      return (
                        <div
                          key={cIndex}
                          className="flex flex-col gap-2 rounded-xl p-3 transition-colors hover:bg-white/5 sm:flex-row sm:items-baseline sm:gap-4"
                        >
                          <div className="w-24 shrink-0">
                            <span
                              className={`rounded-md px-2 py-1 text-[10px] font-bold tracking-widest uppercase ${isWin ? 'bg-yellow-500/10 text-yellow-500 ring-1 ring-yellow-500/20' : 'bg-white/5 text-white/50 ring-1 ring-white/10'} `}
                            >
                              {cat.type}
                            </span>
                          </div>

                          <div className="flex min-w-0 flex-1 flex-col">
                            <h4 className="text-[15px] leading-snug font-medium text-white/90">
                              {cat.category}
                            </h4>
                            {cat.project && (
                              <Link
                                href={projectHref}
                                className="mt-1 inline-block w-fit truncate text-[13px] font-medium text-white/50 transition-colors hover:text-white"
                              >
                                {cat.project}
                              </Link>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
