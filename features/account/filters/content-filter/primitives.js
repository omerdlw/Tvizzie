'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { useDebounce } from '@/core/hooks/use-debounce';
import { cn } from '@/core/utils';
import RatingRangeSelector from '@/features/reviews/parts/rating-range-selector';
import Icon from '@/ui/icon';
export const UI = {
  bar: 'flex w-full flex-nowrap flex-auto items-center gap-2 overflow-x-auto border-b border-black/10 pb-5 scrollbar-none',
  trigger: "inline-flex h-9 w-auto flex-auto shrink-0 items-center gap-1.5 border border-black/10 bg-white px-3 text-[11px] font-semibold uppercase tracking-wide text-black/70 hover:border-black/20 hover:bg-black/5",
  triggerActive: 'border-info/70 bg-info/20 text-info',
  iconButton: "inline-flex h-9 w-9 shrink-0 items-center justify-center border border-black/10 bg-white text-black/70 hover:border-black/20 hover:bg-black/5",
  resetButton: "ml-auto inline-flex h-9 shrink-0 items-center border border-black/10 bg-white px-3 text-[11px] font-semibold uppercase tracking-wide text-black/70 hover:border-black/20 hover:bg-black/5",
  menu: 'z-50 overflow-y-auto overscroll-contain border border-black/10 bg-white p-1 shadow-lg',
  sectionLabel: 'px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-black/50',
  menuItem: "flex w-full items-center justify-between px-3 py-2 text-left text-sm text-black/80 hover:bg-black/5",
  menuItemActive: 'bg-black/5 font-medium text-black',
  divider: 'border-t border-black/10',
  inputWrap: "flex h-9 min-w-0 flex-1 items-center gap-3 border border-black/10 bg-white px-3 focus-within:border-black/20",
  input: 'min-w-0 flex-1 bg-transparent text-sm text-black outline-none placeholder:text-black/50',
  helperText: 'px-1 text-[10px] text-black/50',
  visibilityItem: "flex w-full items-center justify-between px-3 py-2 text-left text-sm text-black/80 hover:bg-black/5",
  visibilityItemActive: 'bg-black/5 font-medium text-black',
  dot: 'h-2.5 w-2.5 border border-black/20',
  dotActive: 'bg-black',
  dotInactive: 'bg-black/20'
};
export function resolveOptionLabel(options = [], value, fallback = 'Any') {
  return options.find(option => option.value === value)?.label || fallback;
}
export function buildRatingLabel(filters = {}) {
  if (filters.ratingMode === 'none') return 'No rating';
  if (filters.ratingMode === 'range') {
    return filters.minRating === filters.maxRating ? `${filters.maxRating} stars` : `${filters.minRating}-${filters.maxRating}`;
  }
  return 'Any rating';
}
export function SectionLabel({
  children
}) {
  return <p className={UI.sectionLabel}>{children}</p>;
}
export function ResetButton({
  onClick
}) {
  return <button type="button" onClick={onClick} className={UI.resetButton}>
      Reset
    </button>;
}
const FilterPopoverContext = createContext({
  close: () => {}
});
export function FilterMenuItem({
  active = false,
  children,
  onClick
}) {
  const {
    close
  } = useContext(FilterPopoverContext);
  return <button type="button" onClick={() => {
    onClick?.();
    close();
  }} className={cn(UI.menuItem, active && UI.menuItemActive)}>
      <span>{children}</span>
      {active ? <Icon icon="material-symbols:check-rounded" size={16} className="text-black" /> : null}
    </button>;
}
export function DefaultMenuItem({
  active = false,
  label = 'Default',
  onClick
}) {
  return <div className="space-y-1 pb-1">
      <FilterMenuItem active={active} onClick={onClick}>
        {label}
      </FilterMenuItem>
    </div>;
}
export function FilterPopover({
  label,
  active = false,
  children
}) {
  const [isOpen, setIsOpen] = useState(false);
  const contextValue = useMemo(() => ({
    close: () => setIsOpen(false)
  }), []);
  return <PopoverPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button type="button" className={cn(UI.trigger, active && UI.triggerActive)}>
          <span>{label}</span>
          <Icon icon="solar:alt-arrow-down-linear" size={14} />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content align="start" avoidCollisions={false} side="bottom" sideOffset={8} className={UI.menu} style={{
        maxHeight: '60dvh',
        minWidth: 'var(--radix-popover-trigger-width)'
      }}>
          <FilterPopoverContext.Provider value={contextValue}>
            <div>{children}</div>
          </FilterPopoverContext.Provider>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>;
}
export function OptionSection({
  title = '',
  options,
  value,
  onChange
}) {
  return <div className="space-y-1 pb-1">
      {title ? <SectionLabel>{title}</SectionLabel> : null}
      {options.map(option => <FilterMenuItem key={option.value} active={value === option.value} onClick={() => onChange(option.value)}>
          {option.label}
        </FilterMenuItem>)}
    </div>;
}
export function RatingRangeEditor({
  filters,
  onChange
}) {
  return <div className={cn(UI.divider, 'mt-1 space-y-2 px-2 pt-3')}>
      <div className="space-y-1">
        <span className="block text-[10px] font-semibold tracking-wide text-black/50 uppercase">Rating (or range)</span>
        <div className="border border-black/10 bg-white px-2 py-2">
          <RatingRangeSelector maxValue={filters.maxRating} minValue={filters.minRating} onChange={onChange} />
        </div>
      </div>

      <p className={UI.helperText}>Click to pick one rating, or drag across the stars to choose a range.</p>
    </div>;
}
export function VisibilityGroup({
  title = '',
  options = [],
  selectedFlags,
  onToggle
}) {
  const {
    close
  } = useContext(FilterPopoverContext);
  return <div className="space-y-1">
      {title ? <SectionLabel>{title}</SectionLabel> : null}

      {options.length === 0 ? <p className="px-2 py-2 text-xs text-black/50">No visibility filters available.</p> : options.map(option => {
      const active = selectedFlags.has(option.key);
      return <button key={option.key} type="button" onClick={() => {
        onToggle(option.key);
        close();
      }} className={cn(UI.visibilityItem, active && UI.visibilityItemActive)}>
              <span>{option.label}</span>
              <span className={cn(UI.dot, active ? UI.dotActive : UI.dotInactive)} />
            </button>;
    })}
    </div>;
}
export function SearchChip({
  value,
  open,
  onOpen,
  onClose,
  onChange,
  inputRef
}) {
  const [localQuery, setLocalQuery] = useState(value);
  const debouncedQuery = useDebounce(localQuery, 400);
  useEffect(() => {
    if (debouncedQuery !== localQuery || debouncedQuery === value) {
      return;
    }
    onChange(debouncedQuery);
  }, [debouncedQuery, localQuery, onChange, value]);
  useEffect(() => {
    if (!open) setLocalQuery('');
  }, [open]);
  useEffect(() => {
    setLocalQuery(value);
  }, [value]);
  const handleClose = useCallback(() => {
    setLocalQuery('');
    onChange('');
    onClose();
  }, [onChange, onClose]);
  if (!open) {
    return <button type="button" aria-label="Search titles" onClick={onOpen} className={UI.iconButton}>
        <Icon icon="solar:magnifer-linear" size={16} />
      </button>;
  }
  return <div className="flex min-w-0 flex-1 items-center gap-2">
      <label className={UI.inputWrap}>
        <Icon icon="solar:magnifer-linear" size={18} className="shrink-0 text-black/50" />
        <input ref={inputRef} type="text" value={localQuery} onChange={event => setLocalQuery(event.target.value)} onKeyDown={event => {
        if (event.key === 'Escape') handleClose();
      }} placeholder="Search titles" className={UI.input} />
      </label>

      <button type="button" onClick={handleClose} className={UI.resetButton}>
        Close
      </button>
    </div>;
}
