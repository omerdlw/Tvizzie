import { REVIEW_SORT_MODE } from '@/features/reviews/review-data';
import { cn } from '@/core/utils';
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
} from '../content-filter-primitives';
import { RATING_MODE_OPTIONS, REVIEW_SORT_OPTIONS, REVIEW_VISIBILITY_OPTIONS } from '../filter-options';

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
  const ratingLabel = buildRatingLabel(filters);
  const yearLabel = resolveOptionLabel(yearOptions, filters?.year, 'Any year');
  const sortLabel = resolveOptionLabel(sortOptions, filters?.sort, 'When Reviewed (Newest)');
  const isDefaultSort = filters?.sort === REVIEW_SORT_MODE.NEWEST;
  const canReset =
    typeof onReset === 'function' &&
    ((showRatingFilter && (filters?.ratingMode ?? 'any') !== 'any') ||
      (filters?.year ?? 'all') !== 'all' ||
      (filters?.sort ?? REVIEW_SORT_MODE.NEWEST) !== REVIEW_SORT_MODE.NEWEST ||
      selectedEyeFlags.size > 0);

  return (
    <div className={cn(UI.bar, className)}>
      <div className={UI.main}>
        <div className={UI.inner}>
          {showRatingFilter ? (
            <FilterPopover label={`Rating: ${ratingLabel}`} active={filters?.ratingMode !== 'any'}>
              <OptionSection
                options={RATING_MODE_OPTIONS}
                value={filters?.ratingMode}
                onChange={(value) => onChange({ ratingMode: value })}
              />
              <RatingRangeEditor filters={filters} onChange={onChange} />
            </FilterPopover>
          ) : null}

          <FilterPopover label={`Diary year: ${yearLabel}`} active={filters?.year !== 'all'}>
            <OptionSection
              options={yearOptions}
              value={filters?.year}
              onChange={(value) => onChange({ year: value })}
            />
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
        </div>

        {canReset ? <ResetButton onClick={onReset} /> : null}
      </div>
      <div className={UI.rule} />
    </div>
  );
}
