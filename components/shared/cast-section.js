'use client'

import { useState } from 'react'

import Image from 'next/image'
import Link from 'next/link'

import { AnimatePresence, motion } from 'framer-motion'

import { DURATION, EASING, TMDB_IMG } from '@/lib/constants'
import Icon from '@/ui/icon'

const MAX_VISIBLE = 6
const STYLES = Object.freeze({
  sectionTitle: 'text-xs font-semibold tracking-widest text-white/50 uppercase',
  sectionAction:
    'cursor-pointer text-xs font-semibold tracking-widest text-white/50 uppercase transition-colors hover:text-white/70',
})

function PersonCard({ person }) {
  const [hasError, setHasError] = useState(false)
  const hasImage = person.profile_path && !hasError

  return (
    <Link
      className="group flex items-center gap-3 rounded-[20px] bg-white/5 p-1 pr-4 ring ring-white/10 backdrop-blur-sm transition-all duration-[var(--motion-duration-normal)] hover:bg-white/10 hover:ring-white/15"
      href={`/person/${person.id}`}
      onDragStart={(e) => e.preventDefault()}
    >
      <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-[16px] bg-white/5">
        {hasImage ? (
          <Image
            className="object-cover"
            src={`${TMDB_IMG}/w185${person.profile_path}`}
            onError={() => setHasError(true)}
            alt={person.name}
            sizes="64px"
            fill
            draggable="false"
          />
        ) : (
          <div className="center h-full w-full">
            <Icon icon="solar:user-bold" size={20} className="text-white/50" />
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-semibold">{person.name}</span>
        <span className="truncate text-xs text-white/50">
          {person.character}
        </span>
      </div>
    </Link>
  )
}

export default function CastSection({ cast }) {
  const [expanded, setExpanded] = useState(false)
  const hasOverflow = cast.length > MAX_VISIBLE
  const visibleCast = expanded ? cast : cast.slice(0, MAX_VISIBLE)

  return (
    <div className="relative flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className={STYLES.sectionTitle}>Top Billed Cast</h2>
        {hasOverflow && (
          <p
            onClick={() => setExpanded((prev) => !prev)}
            className={STYLES.sectionAction}
          >
            {expanded ? 'Show Less' : 'Show More'}
          </p>
        )}
      </div>
      <motion.div layout className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <AnimatePresence>
          {visibleCast.map((member, index) => (
            <motion.div
              key={member.id}
              layout
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
                transitionEnd: { transform: 'none' },
              }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{
                duration: DURATION.FAST,
                ease: EASING.STANDARD,
                delay:
                  index >= MAX_VISIBLE
                    ? (index - MAX_VISIBLE) * DURATION.STAGGER
                    : 0,
              }}
            >
              <PersonCard person={member} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
