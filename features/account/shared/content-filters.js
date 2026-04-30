'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';

import { REVIEW_SORT_MODE } from '@/features/reviews/utils';
import RatingRangeSelector from '@/features/reviews/parts/rating-range-selector';
import { LIST_SORT_OPTIONS, MEDIA_SORT_GROUPS, resolveMediaSortOption } from '@/features/account/filtering';
import { useDebounce } from '@/core/hooks/use-debounce';
import { cn } from '@/core/utils';
import Icon from '@/ui/icon';

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

const UI = {
  bar: 'flex w-full flex-nowrap flex-auto items-center gap-2 overflow-x-auto border-b border-black/10 pb-5 scrollbar-none',
  trigger:
    'inline-flex h-9 w-auto flex-auto shrink-0 items-center gap-1.5  border border-black/10 bg-white px-3 text-[11px] font-semibold uppercase tracking-wide text-black/70 transition-colors hover:border-black/20 hover:bg-black/5',
  triggerActive: 'border-info/70 bg-info/20 text-info',
  iconButton:
    'inline-flex h-9 w-9 shrink-0  items-center justify-center border border-black/10 bg-white text-black/70 transition-colors hover:border-black/20 hover:bg-black/5',
  resetButton:
    'ml-auto inline-flex h-9 shrink-0  items-center border border-black/10 bg-white px-3 text-[11px] font-semibold uppercase tracking-wide text-black/70 transition-colors hover:border-black/20 hover:bg-black/5',
  menu: 'z-50 overflow-y-auto overscroll-contain  border border-black/10 bg-white p-1 shadow-lg',
  sectionLabel: 'px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-black/50',
  menuItem:
    'flex w-full items-center justify-between  px-3 py-2 text-left text-sm text-black/80 transition-colors hover:bg-black/5',
  menuItemActive: 'bg-black/5 font-medium text-black',
  divider: 'border-t border-black/10',
  inputWrap:
    'flex h-9 min-w-0 flex-1 items-center gap-3  border border-black/10 bg-white px-3 transition-colors focus-within:border-black/20',
  input: 'min-w-0 flex-1 bg-transparent text-sm text-black outline-none placeholder:text-black/50',
  select:
    'h-8 w-full  border border-black/10 bg-white px-2 text-sm text-black outline-none transition-colors focus:border-black/20',
  helperText: 'px-1 text-[10px] text-black/50',
  visibilityItem:
    'flex w-full items-center justify-between  px-3 py-2 text-left text-sm text-black/80 transition-colors hover:bg-black/5',
  visibilityItemActive: 'bg-black/5 font-medium text-black',
  dot: 'h-2.5 w-2.5 border border-black/20',
  dotActive: 'bg-black',
  dotInactive: 'bg-black/20',
};

function resolveOptionLabel(options = [], value, fallback = 'Any') {
  return options.find((option) => option.value === value)?.label || fallback;
}

function buildRatingLabel(filters = {}) {
  if (filters.ratingMode === 'none') return 'No rating';
  if (filters.ratingMode === 'range') {
    return filters.minRating === filters.maxRating
      ? `${filters.maxRating} stars`
      : `${filters.minRating}-${filters.maxRating}`;
  }
  return 'Any rating';
}

function SectionLabel({ children }) {
  return <p className={UI.sectionLabel}>{children}</p>;
}

function ResetButton({ onClick }) {
  return (
    <button type="button" onClick={onClick} className={UI.resetButton}>
      Reset
    </button>
  );
}

const FilterPopoverContext = createContext({
  close: () => {},
});

function FilterMenuItem({ active = false, children, onClick }) {
  const { close } = useContext(FilterPopoverContext);

  return (
    <button
      type="button"
      onClick={() => {
        onClick?.();
        close();
      }}
      className={cn(UI.menuItem, active && UI.menuItemActive)}
    >
      <span>{children}</span>
      {active ? <Icon icon="material-symbols:check-rounded" size={16} className="text-black" /> : null}
    </button>
  );
}

function DefaultMenuItem({ active = false, label = 'Default', onClick }) {
  return (
    <div className="space-y-1 pb-1">
      <FilterMenuItem active={active} onClick={onClick}>
        {label}
      </FilterMenuItem>
    </div>
  );
}

function FilterPopover({ label, active = false, children }) {
  const [isOpen, setIsOpen] = useState(false);
  const contextValue = useMemo(
    () => ({
      close: () => setIsOpen(false),
    }),
    []
  );

  return (
    <PopoverPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button type="button" className={cn(UI.trigger, active && UI.triggerActive)}>
          <span>{label}</span>
          <Icon icon="solar:alt-arrow-down-linear" size={14} />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          avoidCollisions={false}
          side="bottom"
          sideOffset={8}
          className={UI.menu}
          style={{
            maxHeight: '60dvh',
            minWidth: 'var(--radix-popover-trigger-width)',
          }}
        >
          <FilterPopoverContext.Provider value={contextValue}>
            <div>{children}</div>
          </FilterPopoverContext.Provider>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

function OptionSection({ title = '', options, value, onChange }) {
  return (
    <div className="space-y-1 pb-1">
      {title ? <SectionLabel>{title}</SectionLabel> : null}
      {options.map((option) => (
        <FilterMenuItem key={option.value} active={value === option.value} onClick={() => onChange(option.value)}>
          {option.label}
        </FilterMenuItem>
      ))}
    </div>
  );
}

function RatingRangeEditor({ filters, onChange }) {
  return (
    <div className={cn(UI.divider, 'mt-1 space-y-2 px-2 pt-3')}>
      <div className="space-y-1">
        <span className="block text-[10px] font-semibold tracking-wide text-black/50 uppercase">Rating (or range)</span>
        <div className="border border-black/10 bg-white px-2 py-2">
          <RatingRangeSelector maxValue={filters.maxRating} minValue={filters.minRating} onChange={onChange} />
        </div>
      </div>

      <p className={UI.helperText}>Click to pick one rating, or drag across the stars to choose a range.</p>
    </div>
  );
}

function VisibilityGroup({ title = '', options = [], selectedFlags, onToggle }) {
  const { close } = useContext(FilterPopoverContext);

  return (
    <div className="space-y-1">
      {title ? <SectionLabel>{title}</SectionLabel> : null}

      {options.length === 0 ? (
        <p className="px-2 py-2 text-xs text-black/50">No visibility filters available.</p>
      ) : (
        options.map((option) => {
          const active = selectedFlags.has(option.key);

          return (
            <button
              key={option.key}
              type="button"
              onClick={() => {
                onToggle(option.key);
                close();
              }}
              className={cn(UI.visibilityItem, active && UI.visibilityItemActive)}
            >
              <span>{option.label}</span>
              <span className={cn(UI.dot, active ? UI.dotActive : UI.dotInactive)} />
            </button>
          );
        })
      )}
    </div>
  );
}

function SearchChip({ value, open, onOpen, onClose, onChange, inputRef }) {
  const [localQuery, setLocalQuery] = useState(value);
  const debouncedQuery = useDebounce(localQuery, 400);

  useEffect(() => {
    if (debouncedQuery !== localQuery || debouncedQuery === value) {
      return;
    }

    onChange(debouncedQuery);
  }, [debouncedQuery, localQuery, onChange, value]);

  useEffect(() => {
    if (!open) setLocalQuery('');
  }, [open]);

  useEffect(() => {
    setLocalQuery(value);
  }, [value]);

  const handleClose = useCallback(() => {
    setLocalQuery('');
    onChange('');
    onClose();
  }, [onChange, onClose]);

  if (!open) {
    return (
      <button type="button" aria-label="Search titles" onClick={onOpen} className={UI.iconButton}>
        <Icon icon="solar:magnifer-linear" size={16} />
      </button>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <label className={UI.inputWrap}>
        <Icon icon="solar:magnifer-linear" size={18} className="shrink-0 text-black/50" />
        <input
          ref={inputRef}
          type="text"
          value={localQuery}
          onChange={(event) => setLocalQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') handleClose();
          }}
          placeholder="Search titles"
          className={UI.input}
        />
      </label>

      <button type="button" onClick={handleClose} className={UI.resetButton}>
        Close
      </button>
    </div>
  );
}

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

  useEffect(() => {
    if (searchQuery) setIsSearchOpen(true);
  }, [searchQuery]);

  useEffect(() => {
    if (isSearchOpen) searchInputRef.current?.focus();
  }, [isSearchOpen]);

  return (
    <div className={cn(UI.bar, className)}>
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

          {typeof onReset === 'function' ? <ResetButton onClick={onReset} /> : null}
        </>
      )}
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

  return (
    <div className={cn(UI.bar, className)}>
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

export function AccountActivityFilterBar({ className = '', filters, onChange, onReset, subjectOptions = [] }) {
  const subjectLabel = resolveOptionLabel(subjectOptions, filters?.subject, 'Any content');
  const sortLabel = resolveOptionLabel(ACTIVITY_SORT_OPTIONS, filters?.sort, 'Newest First');
  const isDefaultSort = filters?.sort === 'newest';

  return (
    <div className={cn(UI.bar, className)}>
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

      {typeof onReset === 'function' ? <ResetButton onClick={onReset} /> : null}
    </div>
  );
}

export function AccountListSortBar({ className = '', sort = 'updated_desc', onChange, onReset }) {
  const sortLabel = resolveOptionLabel(LIST_SORT_OPTIONS, sort, 'Recently Updated');
  const isDefaultSort = sort === 'updated_desc';

  return (
    <div className={cn(UI.bar, className)}>
      <FilterPopover label={`${sortLabel}`} active={sort !== 'updated_desc'}>
        <DefaultMenuItem
          active={isDefaultSort}
          label="Default sort: Recently updated"
          onClick={() => onChange?.('updated_desc')}
        />

        <OptionSection options={LIST_SORT_OPTIONS} value={sort} onChange={(value) => onChange?.(value)} />
      </FilterPopover>

      {typeof onReset === 'function' ? <ResetButton onClick={onReset} /> : null}
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

  return (
    <div className={cn(UI.bar, className)}>
      <FilterPopover label={`Genre: ${genreLabel}`} active={filters?.genre !== 'all'}>
        <OptionSection options={genreOptions} value={filters?.genre} onChange={(value) => onChange({ genre: value })} />
      </FilterPopover>

      <FilterPopover label={`Decade: ${decadeLabel}`} active={filters?.decade !== 'all'}>
        <OptionSection
          options={decadeOptions}
          value={filters?.decade}
          onChange={(value) => onChange({ decade: value })}
        />
      </FilterPopover>

      <FilterPopover label={`Release year: ${yearLabel}`} active={filters?.year !== 'all'}>
        <OptionSection options={yearOptions} value={filters?.year} onChange={(value) => onChange({ year: value })} />
      </FilterPopover>

      {typeof onReset === 'function' ? <ResetButton onClick={onReset} /> : null}
    </div>
  );
}
