'use client';

import { LIST_SORT_OPTIONS } from '@/features/account/filtering';
import { cn } from '@/core/utils';

import { DefaultMenuItem, FilterPopover, OptionSection, ResetButton, UI, resolveOptionLabel } from './primitives';

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
