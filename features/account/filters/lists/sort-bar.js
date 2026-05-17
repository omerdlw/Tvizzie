import { LIST_SORT_OPTIONS } from './query';
import { cn } from '@/core/utils';

export default function AccountListSortBar({ className = '', sort = 'updated_desc', onChange, onReset }) {
  const canReset = typeof onReset === 'function' && sort !== 'updated_desc';

  return (
    <div className={cn('w-full', className)}>
      <div className="flex w-full flex-col gap-2 lg:flex-row">
        <select
          value={sort}
          onChange={(event) => onChange?.(event.target.value)}
          className="h-10 min-w-0 flex-1 border border-white/10 bg-black px-3 text-sm text-white/70 outline-none focus:border-white/20"
        >
          {LIST_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value} className="bg-black text-white">
              {option.label}
            </option>
          ))}
        </select>

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
