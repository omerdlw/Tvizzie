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
        className={`text-justify text-sm leading-relaxed text-white/70 transition-all duration-300 ${!expanded && isLong ? `line-clamp-${MAX_LINES}` : ''}`}
        style={
          !expanded && isLong
            ? {
                WebkitLineClamp: MAX_LINES,
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }
            : undefined
        }
      >
        {biography}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="cursor-pointer self-start text-xs font-semibold tracking-widest text-white/50 uppercase transition-colors hover:text-white/70"
        >
          {expanded ? 'Show Less' : 'Read More'}
        </button>
      )}
    </div>
  )
}
