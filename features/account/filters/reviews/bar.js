import { useMemo } from 'react';
import { REVIEW_SORT_MODE } from '@/features/reviews/review-data';
import { cn } from '@/core/utils';
import { FilterSelect } from '../components';
import { REVIEW_SORT_OPTIONS, REVIEW_VISIBILITY_OPTIONS } from '../filter-options';

const RATING_STEP_OPTIONS = Object.freeze(
  Array.from({ length: 10 }, (_, index) => {
    const value = Number(((index + 1) * 0.5).toFixed(1));
    return {
      label: `${value} stars`,
      value,
    };
  })
);

const RATING_MODE_OPTIONS = [
  { value: 'any', label: 'Any' },
  { value: 'none', label: 'No rating' },
  { value: 'range', label: 'Range' },
];

function resolveSelectedVisibilityValue(selectedFlags = new Set()) {
  const iterator = selectedFlags.values();
  const first = iterator.next();
  return first.done ? 'all' : first.value;
}

export default function AccountReviewFilterBar({
  className = '',
  filters,
  onChange,
  onReset,
  showRatingFilter = true,
  sortOptions = REVIEW_SORT_OPTIONS,
  visibilityOptions = REVIEW_VISIBILITY_OPTIONS,
  yearOptions = [],
}) {
  const selectedEyeFlags = filters?.eyeFlags instanceof Set ? filters.eyeFlags : new Set();
  const selectedVisibility = resolveSelectedVisibilityValue(selectedEyeFlags);
  const ratingMode = filters?.ratingMode ?? 'any';
  const canReset =
    typeof onReset === 'function' &&
    ((showRatingFilter && ratingMode !== 'any') ||
      (filters?.year ?? 'all') !== 'all' ||
      (filters?.sort ?? REVIEW_SORT_MODE.NEWEST) !== REVIEW_SORT_MODE.NEWEST ||
      selectedEyeFlags.size > 0);

  const visibilityOptionsFormatted = useMemo(() => {
    return [
      { value: 'all', label: 'Any' },
      ...visibilityOptions.map((opt) => ({ value: opt.key, label: opt.label })),
    ];
  }, [visibilityOptions]);

  return (
    <div className={cn('w-full', className)}>
      <div className="flex w-full flex-col gap-2 lg:flex-row">
        {showRatingFilter ? (
          <FilterSelect
            value={ratingMode}
            onChange={(event) => onChange({ ratingMode: event.target.value })}
            options={RATING_MODE_OPTIONS}
            labelPrefix="Rating"
          />
        ) : null}

        {showRatingFilter && ratingMode === 'range' ? (
          <>
            <FilterSelect
              value={String(filters?.minRating ?? 0.5)}
              onChange={(event) => onChange({ minRating: Number(event.target.value) })}
              options={RATING_STEP_OPTIONS}
              labelPrefix="Min"
            />

            <FilterSelect
              value={String(filters?.maxRating ?? 5)}
              onChange={(event) => onChange({ maxRating: Number(event.target.value) })}
              options={RATING_STEP_OPTIONS}
              labelPrefix="Max"
            />
          </>
        ) : null}

        <FilterSelect
          value={filters?.year ?? 'all'}
          onChange={(event) => onChange({ year: event.target.value })}
          options={yearOptions}
          labelPrefix="Diary Year"
        />

        <FilterSelect
          value={filters?.sort ?? REVIEW_SORT_MODE.NEWEST}
          onChange={(event) => onChange({ sort: event.target.value })}
          options={sortOptions}
        />

        {visibilityOptions.length > 0 && (
          <FilterSelect
            value={selectedVisibility}
            onChange={(event) =>
              onChange({ eyeFlags: event.target.value === 'all' ? new Set() : new Set([event.target.value]) })
            }
            options={visibilityOptionsFormatted}
            labelPrefix="Visibility"
          />
        )}

        {canReset ? (
          <button
            type="button"
            onClick={onReset}
            className="h-10 shrink-0 border border-white/10 bg-black px-4 text-xs font-semibold tracking-widest text-white/50 uppercase hover:text-white/70"
          >
            Reset
          </button>
        ) : null}
      </div>
    </div>
  );
}
