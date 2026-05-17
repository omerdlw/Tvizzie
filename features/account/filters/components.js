'use client';

import { cn } from '@/core/utils';
import Icon from '@/ui/icon';

export function FilterSelect({ value, onChange, options, labelPrefix = '', className }) {
  return (
    <div className={cn('relative h-10 min-w-0 flex-1', className)}>
      <select
        value={value}
        onChange={onChange}
        className="h-full w-full cursor-pointer appearance-none border border-white/10 bg-black pl-4 pr-10 text-sm text-white/70 outline-none transition-colors hover:border-white/20 focus:border-white/20"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-black text-white">
            {labelPrefix ? `${labelPrefix}: ${option.label}` : option.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/40">
        <Icon icon="solar:alt-arrow-down-linear" size={16} />
      </div>
    </div>
  );
}
