'use client';

import { useState } from 'react';

const MAX_LINES = 4;

export default function PersonBio({ biography }) {
  const [expanded, setExpanded] = useState(false);

  if (!biography) return null;

  const isLong = biography.length > 400;

  return (
    <div className="flex w-full flex-col gap-2">
      <p
        className="text-pretty text-sm leading-relaxed text-black/70 transition-all duration-[var(--motion-duration-normal)]"
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
          className="cursor-pointer self-start text-[11px] font-semibold tracking-widest text-black/60 uppercase transition-colors hover:text-black"
        >
          {expanded ? 'Show Less' : 'Read More'}
        </button>
      )}
    </div>
  );
}
