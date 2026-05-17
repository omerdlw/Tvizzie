'use client';

import { useMemo } from 'react';

import { cn } from '@/core/utils';
import { FilterSelect } from '../components';
import { MEDIA_SORT_GROUPS } from './options';

function resolveSelectedVisibilityValue(selectedFlags = new Set()) {
  const iterator = selectedFlags.values();
  const first = iterator.next();
  return first.done ? 'all' : first.value;
}

function buildSortOptions() {
  return MEDIA_SORT_GROUPS.flatMap((group) =>
    group.options.map((option) => ({
      label: `${group.label}: ${option.label}`,
      value: option.value,
    }))
  );
}

export default function AccountMediaFilterBar({
  className = '',
  decadeOptions = [],
  filters,
  genreOptions = [],
  onChange,
  onReset,
  visibilityOptions = [],
}) {
  const selectedEyeFlags = filters?.eyeFlags instanceof Set ? filters.eyeFlags : new Set();
  const selectedVisibility = resolveSelectedVisibilityValue(selectedEyeFlags);
  const sortOptions = useMemo(() => buildSortOptions(), []);
  const canReset =
    typeof onReset === 'function' &&
    (Boolean(filters?.query) ||
      (filters?.decade ?? 'all') !== 'all' ||
      (filters?.genre ?? 'all') !== 'all' ||
      (filters?.sort ?? 'release_desc') !== 'release_desc' ||
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
        <input
          type="text"
          value={typeof filters?.query === 'string' ? filters.query : ''}
          onChange={(event) => onChange({ query: event.target.value })}
          placeholder="Search titles"
          className="h-10 min-w-0 flex-1 border border-white/10 bg-black px-4 text-sm text-white/70 outline-none placeholder:text-white/50 focus:border-white/20"
        />

        <FilterSelect
          value={filters?.decade ?? 'all'}
          onChange={(event) => onChange({ decade: event.target.value })}
          options={decadeOptions}
          labelPrefix="Decade"
        />

        <FilterSelect
          value={filters?.genre ?? 'all'}
          onChange={(event) => onChange({ genre: event.target.value })}
          options={genreOptions}
          labelPrefix="Genre"
        />

        <FilterSelect
          value={filters?.sort ?? 'release_desc'}
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
