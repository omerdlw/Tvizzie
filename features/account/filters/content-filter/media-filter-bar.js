'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { MEDIA_SORT_GROUPS, resolveMediaSortOption } from '@/features/account/filtering';
import { cn } from '@/core/utils';

import {
  DefaultMenuItem,
  FilterPopover,
  OptionSection,
  ResetButton,
  SearchChip,
  UI,
  VisibilityGroup,
  resolveOptionLabel,
} from './primitives';

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
