'use client';

import { REVIEW_SORT_MODE } from '@/features/reviews/utils';
import { cn } from '@/core/utils';

import { RATING_MODE_OPTIONS, REVIEW_SORT_OPTIONS, REVIEW_VISIBILITY_OPTIONS } from './options';
import {
  DefaultMenuItem,
  FilterPopover,
  OptionSection,
  RatingRangeEditor,
  ResetButton,
  UI,
  VisibilityGroup,
  buildRatingLabel,
  resolveOptionLabel,
} from './primitives';

export function AccountReviewFilterBar({
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
  const ratingLabel = buildRatingLabel(filters);
  const yearLabel = resolveOptionLabel(yearOptions, filters?.year, 'Any year');
  const sortLabel = resolveOptionLabel(sortOptions, filters?.sort, 'When Reviewed (Newest)');
  const isDefaultSort = filters?.sort === REVIEW_SORT_MODE.NEWEST;
  const isRangeMode = filters?.ratingMode === 'range';

  const handleRatingModeChange = (value) => {
    if (value === 'range') {
      onChange({
        ratingMode: 'range',
      });
      return;
    }

    onChange({
      maxRating: 5,
      minRating: 0.5,
      ratingMode: value,
    });
  };

  return (
    <div className={cn(UI.bar, className)}>
      {showRatingFilter ? (
        <FilterPopover label={`Rating: ${ratingLabel}`} active={filters?.ratingMode !== 'any'}>
          <OptionSection
            options={RATING_MODE_OPTIONS}
            value={filters?.ratingMode}
            onChange={handleRatingModeChange}
          />
          {isRangeMode ? <RatingRangeEditor filters={filters} onChange={onChange} /> : null}
        </FilterPopover>
      ) : null}

      <FilterPopover label={`Diary year: ${yearLabel}`} active={filters?.year !== 'all'}>
        <OptionSection options={yearOptions} value={filters?.year} onChange={(value) => onChange({ year: value })} />
      </FilterPopover>

      <FilterPopover label={`${sortLabel}`} active={filters?.sort !== REVIEW_SORT_MODE.NEWEST}>
        <DefaultMenuItem
          active={isDefaultSort}
          label="Default sort: When reviewed, newest first"
          onClick={() => onChange({ sort: REVIEW_SORT_MODE.NEWEST })}
        />

        <OptionSection options={sortOptions} value={filters?.sort} onChange={(value) => onChange({ sort: value })} />
      </FilterPopover>

      {visibilityOptions.length > 0 ? (
        <FilterPopover label="Visibility" active={selectedEyeFlags.size > 0}>
          <VisibilityGroup
            options={visibilityOptions}
            selectedFlags={selectedEyeFlags}
            onToggle={(key) => {
              const nextFlags = new Set(selectedEyeFlags);

              if (nextFlags.has(key)) nextFlags.delete(key);
              else nextFlags.add(key);

              onChange({ eyeFlags: nextFlags });
            }}
          />
        </FilterPopover>
      ) : null}

      {typeof onReset === 'function' ? <ResetButton onClick={onReset} /> : null}
    </div>
  );
}
