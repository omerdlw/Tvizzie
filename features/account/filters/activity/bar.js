import { cn } from '@/core/utils';
import { FilterSelect } from '../components';
import { ACTIVITY_SORT_OPTIONS } from '../filter-options';

export default function AccountActivityFilterBar({ className = '', filters, onChange, onReset, subjectOptions = [] }) {
  const canReset =
    typeof onReset === 'function' &&
    ((filters?.subject ?? 'all') !== 'all' || (filters?.sort ?? 'newest') !== 'newest');

  return (
    <div className={cn('w-full', className)}>
      <div className="flex w-full flex-col gap-2 lg:flex-row">
        <FilterSelect
          value={filters?.subject ?? 'all'}
          onChange={(event) => onChange({ subject: event.target.value })}
          options={subjectOptions}
          labelPrefix="Content"
        />

        <FilterSelect
          value={filters?.sort ?? 'newest'}
          onChange={(event) => onChange({ sort: event.target.value })}
          options={ACTIVITY_SORT_OPTIONS}
        />

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
