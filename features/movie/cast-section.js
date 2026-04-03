'use client'

import { useState } from 'react'

import Image from 'next/image'
import Link from 'next/link'

import { TMDB_IMG } from '@/core/constants'
import Icon from '@/ui/icon'

const MAX_VISIBLE = 6

function PersonCard({
  person,
  imagePriority = false,
  imageFetchPriority,
}) {
  const [hasError, setHasError] = useState(false)
  const imageSrc =
    person.profile_path && !hasError
      ? `${TMDB_IMG}/w185${person.profile_path}`
      : null

  return (
    <Link
      href={`/person/${person.id}`}
      onDragStart={(event) => event.preventDefault()}
      className="surface-muted group flex items-center gap-2 p-1 pr-4 backdrop-blur-sm! rounded-[16px] transition-all duration-(--motion-duration-normal)"
    >
      <div className="relative h-20 w-16 shrink-0 overflow-hidden">
        {imageSrc ? (
          <Image
            fill
            alt={person.name}
            src={imageSrc}
            sizes="64px"
            priority={imagePriority}
            fetchPriority={imageFetchPriority}
            quality={72}
            draggable={false}
            className="object-cover rounded-[12px]"
            onError={() => setHasError(true)}
          />
        ) : (
          <div className="center h-full w-full">
            <Icon icon="solar:user-bold" size={20} className="text-white/50" />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-semibold text-white">{person.name}</span>
        <span className="truncate text-xs text-white/70">{person.character}</span>
      </div>
    </Link>
  )
}

export default function CastSection({ cast, headerAction = null }) {
  const [expanded, setExpanded] = useState(false)
  const castItems = cast || []
  const hasOverflow = castItems.length > MAX_VISIBLE
  const visibleCast = expanded ? castItems : castItems.slice(0, MAX_VISIBLE)

  if (!castItems.length) {
    return null
  }

  return (
    <section className="relative flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-semibold tracking-widest text-white/50 uppercase">
          Top billed cast
        </h2>
        {(headerAction || hasOverflow) && (
          <div className="flex items-center gap-3">
            {headerAction}
            {hasOverflow && (
              <button
                type="button"
                onClick={() => setExpanded((value) => !value)}
                className="text-[11px] font-semibold tracking-widest text-white/50 uppercase transition-colors hover:text-white/70"
              >
                {expanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {visibleCast.map((member, index) => (
            <PersonCard
                key={index}
                person={member}
                imagePriority={index < 4}
                imageFetchPriority={index < 4 ? 'high' : undefined}
              />
          ))}
      </div>
    </section>
  )
}
