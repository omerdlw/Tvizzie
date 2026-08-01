'use client';

import { useNavigationActions } from '@/core/modules/nav';
import { createPersonBioSurfaceEntry } from '@/domains/media/ui/surfaces/person-bio-surface';

const MAX_LINES = 4;

export default function PersonBio({ biography, person = null }) {
  const { openSurface } = useNavigationActions();

  if (!biography) return null;
  const isLong = biography.length > 300;

  const handleReadMore = () => {
    openSurface(
      createPersonBioSurfaceEntry({
        biography,
        person,
      }),
    );
  };

  return (
    <div className="flex w-full flex-col items-center gap-2 text-center">
      <p
        className="text-sm leading-relaxed text-pretty text-black/70 sm:text-base sm:leading-7"
        style={
          isLong
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
          onClick={handleReadMore}
          className="cursor-pointer text-[11px] font-semibold tracking-widest text-black/50 uppercase hover:text-black transition-colors"
        >
          Read More
        </button>
      )}
    </div>
  );
}
