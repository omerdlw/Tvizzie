import { LIST_SORT_OPTIONS } from '@/features/account/filters';
import { cn } from '@/core/utils';
import { DefaultMenuItem, FilterPopover, OptionSection, ResetButton, UI, resolveOptionLabel } from '../content-filter-primitives';

export default function AccountListSortBar({ className = '', sort = 'updated_desc', onChange, onReset }) {
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
