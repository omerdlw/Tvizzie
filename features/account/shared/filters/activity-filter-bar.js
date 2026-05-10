import { cn } from '@/core/utils';
import { DefaultMenuItem, FilterPopover, OptionSection, ResetButton, UI, resolveOptionLabel } from '../content-filter-primitives';
import { ACTIVITY_SORT_OPTIONS } from './filter-options';

export default function AccountActivityFilterBar({ className = '', filters, onChange, onReset, subjectOptions = [] }) {
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
