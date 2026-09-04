'use client';

import { useNavigationActions } from '@/modules/nav';
import { createPersonBioSurfaceEntry } from '@/domains/shell/navigation/surfaces/person-bio-surface';
import { Button } from '@/ui/primitives';

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
        className="w-full max-w-full min-w-0 text-base leading-relaxed text-pretty [overflow-wrap:anywhere] [word-break:break-word] whitespace-pre-line text-white/70 sm:text-lg sm:leading-8"
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
        <Button
          type="button"
          onClick={handleReadMore}
          className="mt-2 cursor-pointer text-xs font-semibold text-white/70 uppercase transition-all duration-300 ease-in-out hover:text-white sm:text-sm"
        >
          Read More
        </Button>
      )}
    </div>
  );
}
