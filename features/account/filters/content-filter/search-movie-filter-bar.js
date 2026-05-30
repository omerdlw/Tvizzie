'use client';

import { cn } from '@/core/utils';

import { FilterPopover, OptionSection, ResetButton, UI, resolveOptionLabel } from './primitives';

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
