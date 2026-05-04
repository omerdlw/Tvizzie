'use client';

import { useCallback, useState } from 'react';

const STAR_COUNT = 5;

const STAR_PATH = [
  'M12.74 3.98',
  'L14.26 8.05 Q14.47 8.60 15.06 8.63',
  'L19.40 8.82 Q21.51 8.91 19.85 10.23',
  'L16.45 12.93 Q15.99 13.30 16.15 13.87',
  'L17.31 18.05 Q17.88 20.09 16.12 18.92',
  'L12.49 16.53 Q12 16.20 11.51 16.53',
  'L7.88 18.92 Q6.12 20.09 6.69 18.05',
  'L7.85 13.87 Q8.01 13.30 7.55 12.93',
  'L4.15 10.23 Q2.49 8.91 4.60 8.82',
  'L8.94 8.63 Q9.53 8.60 9.74 8.05',
  'L11.26 3.98 Q12 2 12.74 3.98Z',
].join(' ');

function getFillPercent(starIndex, activeValue) {
  if (activeValue === null) return 0;
  if (activeValue >= starIndex) return 100;
  if (activeValue >= starIndex - 0.5) return 50;
  return 0;
}

function Star({ starIndex, activeValue, isHovering, onHoverLeft, onHoverRight, onSelectLeft, onSelectRight }) {
  const fillPercent = getFillPercent(starIndex, activeValue);

  const clipId = `star-clip-${starIndex}`;
  const fillWidth = (fillPercent / 100) * 24;

  return (
    <div className="relative h-10 w-10 sm:h-12 sm:w-12">
      <svg viewBox="0 0 24 24" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <clipPath id={clipId}>
            <rect x="0" y="0" width={fillWidth} height="24" />
          </clipPath>
        </defs>

        <path d={STAR_PATH} className="fill-white/10" />

        {fillPercent > 0 && (
          <path
            d={STAR_PATH}
            className={isHovering ? 'fill-success transition-colors' : 'fill-success transition-colors'}
            clipPath={`url(#${clipId})`}
          />
        )}
      </svg>

      <button
        type="button"
        aria-label={`${starIndex - 0.5} stars`}
        className="absolute inset-y-0 left-0 w-1/2 cursor-pointer"
        onMouseEnter={onHoverLeft}
        onFocus={onHoverLeft}
        onClick={onSelectLeft}
      />
      <button
        type="button"
        aria-label={`${starIndex} stars`}
        className="absolute inset-y-0 right-0 w-1/2 cursor-pointer"
        onMouseEnter={onHoverRight}
        onFocus={onHoverRight}
        onClick={onSelectRight}
      />
    </div>
  );
}

export default function RatingSelector({ value, onChange }) {
  const [hoverValue, setHoverValue] = useState(null);
  const selectedValue = typeof value === 'number' ? value : null;
  const activeValue = hoverValue ?? selectedValue;

  const handleSelect = useCallback(
    (score) => {
      if (typeof onChange !== 'function') return;
      onChange(selectedValue === score ? null : score);
    },
    [onChange, selectedValue]
  );

  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex items-center gap-1.5"
        onMouseLeave={() => setHoverValue(null)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setHoverValue(null);
          }
        }}
      >
        {Array.from({ length: STAR_COUNT }, (_, index) => {
          const starIndex = index + 1;

          return (
            <Star
              key={starIndex}
              starIndex={starIndex}
              activeValue={activeValue}
              isHovering={hoverValue !== null}
              onHoverLeft={() => setHoverValue(starIndex - 0.5)}
              onHoverRight={() => setHoverValue(starIndex)}
              onSelectLeft={() => handleSelect(starIndex - 0.5)}
              onSelectRight={() => handleSelect(starIndex)}
            />
          );
        })}
      </div>
    </div>
  );
}
