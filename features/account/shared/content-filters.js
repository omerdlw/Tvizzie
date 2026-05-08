'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { REVIEW_SORT_MODE } from '@/features/reviews/utils';
import { LIST_SORT_OPTIONS, MEDIA_SORT_GROUPS, resolveMediaSortOption } from '@/features/account/filtering';
import { cn } from '@/core/utils';
import {
  DefaultMenuItem,
  FilterPopover,
  OptionSection,
  RatingRangeEditor,
  ResetButton,
  SearchChip,
  UI,
  VisibilityGroup,
  buildRatingLabel,
  resolveOptionLabel,
} from './content-filter-primitives';

const REVIEW_SORT_OPTIONS = Object.freeze([
  { label: 'When Reviewed (Newest)', value: REVIEW_SORT_MODE.NEWEST },
  { label: 'When Reviewed (Oldest)', value: REVIEW_SORT_MODE.OLDEST },
  { label: 'Rating (Highest)', value: REVIEW_SORT_MODE.RATING_DESC },
  { label: 'Rating (Lowest)', value: REVIEW_SORT_MODE.RATING_ASC },
  { label: 'Likes (Most)', value: REVIEW_SORT_MODE.LIKES_DESC },
  { label: 'Likes (Least)', value: REVIEW_SORT_MODE.LIKES_ASC },
]);

const RATING_MODE_OPTIONS = Object.freeze([
  { label: 'Any rating', value: 'any' },
  { label: 'No rating', value: 'none' },
]);

const REVIEW_VISIBILITY_OPTIONS = Object.freeze([
  { key: 'hide_ratings_only', label: 'Hide rating-only entries' },
  { key: 'hide_text_reviews', label: 'Hide written reviews' },
]);

const ACTIVITY_SORT_OPTIONS = Object.freeze([
  { label: 'Newest First', value: 'newest' },
  { label: 'Oldest First', value: 'oldest' },
]);

export function AccountMediaFilterBar({
  className = '',
  decadeOptions = [],
  filters,
  genreOptions = [],
  onChange,
  onReset,
  visibilityOptions = [],
}) {
  const searchInputRef = useRef(null);
  const [isSearchOpen, setIsSearchOpen] = useState(Boolean(filters?.query));

  const selectedEyeFlags = filters?.eyeFlags instanceof Set ? filters.eyeFlags : new Set();
  const searchQuery = typeof filters?.query === 'string' ? filters.query : '';
  const decadeLabel = resolveOptionLabel(decadeOptions, filters?.decade, 'Any decade');
  const genreLabel = resolveOptionLabel(genreOptions, filters?.genre, 'Any genre');

  const sortLabel = useMemo(() => {
    const selectedOption = resolveMediaSortOption(filters?.sort);
    return selectedOption
      ? `${selectedOption.groupLabel}: ${selectedOption.label}`
      : 'Release Date: Newest release first';
  }, [filters?.sort]);
  const isDefaultSort = filters?.sort === 'release_desc';
  const canReset =
    typeof onReset === 'function' &&
    (Boolean(searchQuery) ||
      (filters?.decade ?? 'all') !== 'all' ||
      (filters?.genre ?? 'all') !== 'all' ||
      (filters?.sort ?? 'release_desc') !== 'release_desc' ||
      selectedEyeFlags.size > 0);

  useEffect(() => {
    if (searchQuery) setIsSearchOpen(true);
  }, [searchQuery]);

  useEffect(() => {
    if (isSearchOpen) searchInputRef.current?.focus();
  }, [isSearchOpen]);

  return (
    <div className={cn(UI.bar, className)}>
      <div className={UI.main}>
        <div className={UI.inner}>
          <SearchChip
            value={searchQuery}
            open={isSearchOpen}
            onOpen={() => setIsSearchOpen(true)}
            onClose={() => setIsSearchOpen(false)}
            onChange={(query) => onChange({ query })}
            inputRef={searchInputRef}
          />

          {!isSearchOpen && (
            <>
              <FilterPopover label={`Decade: ${decadeLabel}`} active={filters?.decade !== 'all'}>
                <OptionSection
                  options={decadeOptions}
                  value={filters?.decade}
                  onChange={(value) => onChange({ decade: value })}
                />
              </FilterPopover>
              <FilterPopover label={`Genre: ${genreLabel}`} active={filters?.genre !== 'all'}>
                <OptionSection
                  options={genreOptions}
                  value={filters?.genre}
                  onChange={(value) => onChange({ genre: value })}
                />
              </FilterPopover>

              <FilterPopover label={`${sortLabel}`} active={filters?.sort !== 'release_desc'}>
                <DefaultMenuItem
                  active={isDefaultSort}
                  label="Default sort: Release date, newest first"
                  onClick={() => onChange({ sort: 'release_desc' })}
                />

                {MEDIA_SORT_GROUPS.map((group) => (
                  <OptionSection
                    key={group.label}
                    title={group.label}
                    options={group.options}
                    value={filters?.sort}
                    onChange={(value) => onChange({ sort: value })}
                  />
                ))}
              </FilterPopover>

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
            </>
          )}
        </div>

        {canReset ? <ResetButton onClick={onReset} /> : null}
      </div>
      <div className={UI.rule} />
    </div>
  );
}

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

            <OptionSection
              options={sortOptions}
              value={filters?.sort}
              onChange={(value) => onChange({ sort: value })}
            />
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

export function AccountActivityFilterBar({ className = '', filters, onChange, onReset, subjectOptions = [] }) {
  const subjectLabel = resolveOptionLabel(subjectOptions, filters?.subject, 'Any content');
  const sortLabel = resolveOptionLabel(ACTIVITY_SORT_OPTIONS, filters?.sort, 'Newest First');
  const isDefaultSort = filters?.sort === 'newest';
  const canReset =
    typeof onReset === 'function' &&
    ((filters?.subject ?? 'all') !== 'all' || (filters?.sort ?? 'newest') !== 'newest');

  return (
    <div className={cn(UI.bar, className)}>
      <div className={UI.main}>
        <div className={UI.inner}>
          <FilterPopover label={`Content: ${subjectLabel}`} active={filters?.subject !== 'all'}>
            <OptionSection
              options={subjectOptions}
              value={filters?.subject}
              onChange={(value) => onChange({ subject: value })}
            />
          </FilterPopover>

          <FilterPopover label={`${sortLabel}`} active={filters?.sort !== 'newest'}>
            <DefaultMenuItem
              active={isDefaultSort}
              label="Default sort: Newest first"
              onClick={() => onChange({ sort: 'newest' })}
            />

            <OptionSection
              options={ACTIVITY_SORT_OPTIONS}
              value={filters?.sort}
              onChange={(value) => onChange({ sort: value })}
            />
          </FilterPopover>
        </div>

        {canReset ? <ResetButton onClick={onReset} /> : null}
      </div>
      <div className={UI.rule} />
    </div>
  );
}

export function AccountListSortBar({ className = '', sort = 'updated_desc', onChange, onReset }) {
  const sortLabel = resolveOptionLabel(LIST_SORT_OPTIONS, sort, 'Recently Updated');
  const isDefaultSort = sort === 'updated_desc';
  const canReset = typeof onReset === 'function' && sort !== 'updated_desc';

  return (
    <div className={cn(UI.bar, className)}>
      <div className={UI.main}>
        <div className={UI.inner}>
          <FilterPopover label={`${sortLabel}`} active={sort !== 'updated_desc'}>
            <DefaultMenuItem
              active={isDefaultSort}
              label="Default sort: Recently updated"
              onClick={() => onChange?.('updated_desc')}
            />

            <OptionSection options={LIST_SORT_OPTIONS} value={sort} onChange={(value) => onChange?.(value)} />
          </FilterPopover>
        </div>

        {canReset ? <ResetButton onClick={onReset} /> : null}
      </div>
    </div>
  );
}

export function SearchMovieFilterBar({
  className = '',
  decadeOptions = [],
  filters,
  genreOptions = [],
  onChange,
  onReset,
  yearOptions = [],
}) {
  const decadeLabel = resolveOptionLabel(decadeOptions, filters?.decade, 'Any decade');
  const genreLabel = resolveOptionLabel(genreOptions, filters?.genre, 'Any genre');
  const yearLabel = resolveOptionLabel(yearOptions, filters?.year, 'Any year');
  const canReset =
    typeof onReset === 'function' &&
    ((filters?.decade ?? 'all') !== 'all' || (filters?.genre ?? 'all') !== 'all' || (filters?.year ?? 'all') !== 'all');

  return (
    <div className={cn(UI.bar, className)}>
      <div className={UI.main}>
        <div className={UI.inner}>
          <FilterPopover label={`Genre: ${genreLabel}`} active={filters?.genre !== 'all'}>
            <OptionSection
              options={genreOptions}
              value={filters?.genre}
              onChange={(value) => onChange({ genre: value })}
            />
          </FilterPopover>

          <FilterPopover label={`Decade: ${decadeLabel}`} active={filters?.decade !== 'all'}>
            <OptionSection
              options={decadeOptions}
              value={filters?.decade}
              onChange={(value) => onChange({ decade: value })}
            />
          </FilterPopover>

          <FilterPopover label={`Release year: ${yearLabel}`} active={filters?.year !== 'all'}>
            <OptionSection
              options={yearOptions}
              value={filters?.year}
              onChange={(value) => onChange({ year: value })}
            />
          </FilterPopover>
        </div>

        {canReset ? <ResetButton onClick={onReset} /> : null}
      </div>
    </div>
  );
}
