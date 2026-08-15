'use client';

import { useNavigationActions } from '@/modules/nav';
import { createPersonBioSurfaceEntry } from '@/domains/media/ui/nav-surfaces/person-bio-surface';

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
    <div className="flex w-full max-w-full min-w-0 flex-col items-center gap-2 text-center">
      <p
        className="w-full max-w-full min-w-0 text-sm leading-relaxed text-pretty [overflow-wrap:anywhere] [word-break:break-word] whitespace-pre-line text-white/70 sm:text-base sm:leading-7"
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
          className="mt-1 cursor-pointer text-[11px] font-semibold tracking-widest text-white/70 uppercase transition-all duration-300 ease-in-out hover:text-white"
        >
          Read More
        </button>
      )}
    </div>
  );
}
