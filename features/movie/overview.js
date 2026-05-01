'use client';

import { useMemo, useState } from 'react';

const MIN_LENGTH_FOR_COLLAPSE = 260;

export default function MovieOverview({ overview, maxLines = 4 }) {
  const [expanded, setExpanded] = useState(false);

  if (!overview) {
    return null;
  }

  const isLong = overview.length > MIN_LENGTH_FOR_COLLAPSE;
  const resolvedMaxLines = useMemo(() => Math.max(2, Math.floor(maxLines || 4)), [maxLines]);

  return (
    <div className="flex w-full flex-col items-start gap-3">
      <p
        className="movie-detail-reading-measure text-black-soft text-sm leading-6 text-pretty transition-all duration-300 sm:text-base sm:leading-7"
        style={
          !expanded && isLong
            ? {
                WebkitLineClamp: resolvedMaxLines,
                WebkitBoxOrient: 'vertical',
                display: '-webkit-box',
                overflow: 'hidden',
              }
            : undefined
        }
      >
        {overview}
      </p>

      {isLong ? (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="text-black-muted text-xs font-semibold tracking-widest uppercase transition-colors hover:text-black"
        >
          {expanded ? 'Show Less' : 'Read More'}
        </button>
      ) : null}
    </div>
  );
}
