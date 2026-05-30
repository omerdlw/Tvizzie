'use client';

import { cn } from '@/core/utils';

import { ACTIVITY_SORT_OPTIONS } from './options';
import { DefaultMenuItem, FilterPopover, OptionSection, ResetButton, UI, resolveOptionLabel } from './primitives';

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
