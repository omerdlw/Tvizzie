'use client'

import { useState } from 'react'

const MAX_LINES = 4

export default function PersonBio({ biography }) {
  const [expanded, setExpanded] = useState(false)

  if (!biography) return null

  const isLong = biography.length > 400

  return (
    <div className="flex w-full flex-col gap-2">
      <p
        className="text-justify text-sm leading-relaxed text-white/70 transition-all duration-[var(--motion-duration-normal)]"
        style={
          !expanded && isLong
            ? {
                WebkitLineClamp: MAX_LINES,
                WebkitBoxOrient: 'vertical',
                display: '-webkit-box',
                overflow: 'hidden',
              }
            : undefined
        }
      >
        {biography}
      </p>

      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="self-start cursor-pointer text-xs tracking-wide text-white/50 hover:underline transition-colors hover:text-white"
        >
          {expanded ? 'Show Less' : 'Read More'}
        </button>
      )}
    </div>
  )
}
