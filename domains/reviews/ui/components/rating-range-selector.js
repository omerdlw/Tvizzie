'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

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

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeScore(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0.5;
  return clamp(Math.ceil(numeric * 2) / 2, 0.5, 5);
}

function buildCommittedRange(minValue, maxValue) {
  const normMin = normalizeScore(minValue);
  const normMax = normalizeScore(maxValue);

  if (normMin === normMax) {
    return { displayFrom: 0, displayTo: normMax, max: normMax, min: normMin };
  }

  const min = Math.min(normMin, normMax);
  const max = Math.max(normMin, normMax);
  return { displayFrom: min, displayTo: max, max, min };
}

function buildDraggedRange(startValue, currentValue) {
  const start = normalizeScore(startValue);
  const curr = normalizeScore(currentValue);
  const min = Math.min(start, curr);
  const max = Math.max(start, curr);

  return { displayFrom: min, displayTo: max, max, min };
}

function resolveFillPercent(starIndex, range) {
  const overlap = Math.max(
    0,
    Math.min(starIndex, range.displayTo) - Math.max(starIndex - 1, range.displayFrom),
  );
  return overlap * 100;
}

function scoreFromPointerEvent(event, element) {
  const rect = element.getBoundingClientRect();
  const relativeX = clamp(event.clientX - rect.left, 0, rect.width || 1);
  const stepIndex = clamp(Math.ceil((relativeX / (rect.width || 1)) * 10), 1, 10);
  return stepIndex / 2;
}

function Star({ fillPercent, starIndex }) {
  const clipId = `rating-range-fill-${starIndex}-${Math.round(fillPercent)}`;
  const clipWidth = (fillPercent / 100) * 24;

  return (
    <svg viewBox="0 0 24 24" className="h-10 w-10 sm:h-12 sm:w-12" aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y="0" width={clipWidth} height="24" />
        </clipPath>
      </defs>
      <path d={STAR_PATH} className="fill-white/15" />
      {fillPercent > 0 && <path d={STAR_PATH} className="fill-info" clipPath={`url(#${clipId})`} />}
    </svg>
  );
}

export default function RatingRangeSelector({ maxValue = 5, minValue = 0.5, onChange }) {
  const containerRef = useRef(null);
  const [dragStart, setDragStart] = useState(null);
  const [previewRange, setPreviewRange] = useState(null);

  const committedRange = useMemo(
    () => buildCommittedRange(minValue, maxValue),
    [maxValue, minValue],
  );
  const activeRange = previewRange || committedRange;

  const commitRange = useCallback(
    (nextRange) => {
      onChange?.({
        maxRating: nextRange.max,
        minRating: nextRange.min,
        ratingMode: 'range',
      });
    },
    [onChange],
  );

  const handlePointerDown = useCallback((event) => {
    if (!containerRef.current) return;

    const score = scoreFromPointerEvent(event, containerRef.current);
    const range = buildDraggedRange(score, score);

    setDragStart(score);
    setPreviewRange(range);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (event) => {
      if (dragStart === null || !containerRef.current) return;
      const score = scoreFromPointerEvent(event, containerRef.current);
      setPreviewRange(buildDraggedRange(dragStart, score));
    },
    [dragStart],
  );

  const handlePointerUp = useCallback(
    (event) => {
      if (dragStart === null || !containerRef.current) return;

      const score = scoreFromPointerEvent(event, containerRef.current);
      const range = buildDraggedRange(dragStart, score);

      commitRange(range);
      setDragStart(null);
      setPreviewRange(null);
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    },
    [commitRange, dragStart],
  );

  return (
    <div className="space-y-2.5">
      <div
        ref={containerRef}
        className="flex touch-none items-center gap-1.5 select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          setDragStart(null);
          setPreviewRange(null);
        }}
      >
        {Array.from({ length: STAR_COUNT }, (_, index) => {
          const starIndex = index + 1;
          return (
            <Star
              key={starIndex}
              fillPercent={resolveFillPercent(starIndex, activeRange)}
              starIndex={starIndex}
            />
          );
        })}
      </div>

      <p className="text-xs font-semibold text-white/40 uppercase">
        {activeRange.min === activeRange.max
          ? `${activeRange.max} stars`
          : `${activeRange.min}-${activeRange.max} stars`}
      </p>
    </div>
  );
}
