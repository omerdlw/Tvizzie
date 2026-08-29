'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { useDebounce } from '@/shared';
import { cn } from '@/ui/class-names';
import RatingRangeSelector from '@/domains/reviews/ui/components/rating-range-selector';
import { Button, Input } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';
export const UI = {
  bar: 'flex w-full flex-wrap items-center gap-2',
  trigger:
    'inline-flex min-h-9 max-w-full items-center gap-2 rounded-xl ring-1 ring-inset ring-white/5 bg-white/5 px-3 text-left text-xs font-medium text-white/70 transition-colors hover:ring-white/10 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40',
  triggerActive: 'ring-white/10 bg-white/10 text-white',
  iconButton:
    'size-9 shrink-0 rounded-xl ring-1 ring-inset ring-white/5 bg-white/5 text-white/70 transition-colors hover:ring-white/10 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40',
  resetButton:
    'ml-auto min-h-9 rounded-xl ring-1 ring-inset ring-transparent px-3 text-xs font-medium text-white/40 transition-colors hover:ring-white/10 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40',
  menu: 'z-50 max-h-[60dvh] min-w-[var(--radix-popover-trigger-width)] overflow-y-auto overscroll-contain rounded-2xl ring-1 ring-inset ring-white/10 bg-black/80 p-1.5 shadow-xl backdrop-blur-xl',
  sectionLabel: 'px-2.5 pb-1 pt-2 text-xs font-semibold uppercase text-white/40',
  menuItem:
    'flex min-h-9 w-full items-center justify-between gap-3 rounded-lg px-2.5 text-left text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white/40',
  menuItemActive: 'bg-white/10 font-medium text-white hover:bg-white/15',
  divider: 'mt-2 border-t border-white/10 pt-2',
  inputWrap:
    'flex h-9 min-w-[180px] flex-1 items-center gap-2 rounded-xl ring-1 ring-inset ring-white/10 bg-white/5 px-3 text-white/40 focus-within:bg-white/10',
  input: 'min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40',
  helperText: 'px-2.5 py-2 text-xs leading-5 text-white/40',
  visibilityItem:
    'flex min-h-9 w-full items-center justify-between gap-3 rounded-lg px-2.5 text-left text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white',
  visibilityItemActive: 'bg-white/10 font-medium text-white hover:bg-white/15',
  dot: 'size-2 rounded-full ring-1 ring-inset ring-white/10',
  dotActive: 'bg-white',
  dotInactive: 'bg-white/5',
};
export function resolveOptionLabel(options = [], value, fallback = 'Any') {
  return options.find((option) => option.value === value)?.label || fallback;
}
export function buildRatingLabel(filters = {}) {
  if (filters.ratingMode === 'none') return 'No rating';
  if (filters.ratingMode === 'range') {
    return filters.minRating === filters.maxRating
      ? `${filters.maxRating} stars`
      : `${filters.minRating}-${filters.maxRating}`;
  }
  return 'Any rating';
}
export function SectionLabel({ children }) {
  return <p className={UI.sectionLabel}>{children}</p>;
}
export function ResetButton({ onClick }) {
  return (
    <Button type="button" onClick={onClick} className={UI.resetButton}>
      Reset
    </Button>
  );
}
const FilterPopoverContext = createContext({
  close: () => {},
});
export function FilterMenuItem({ active = false, children, onClick }) {
  const { close } = useContext(FilterPopoverContext);
  return (
    <Button
      type="button"
      onClick={() => {
        onClick?.();
        close();
      }}
      className={cn(UI.menuItem, active && UI.menuItemActive)}
    >
      <span>{children}</span>
      {active ? (
        <Icon icon="material-symbols:check-rounded" size={16} className="text-white" />
      ) : null}
    </Button>
  );
}
export function DefaultMenuItem({ active = false, label = 'Default', onClick }) {
  return (
    <div className="space-y-1">
      <FilterMenuItem active={active} onClick={onClick}>
        {label}
      </FilterMenuItem>
    </div>
  );
}
export function FilterPopover({ label, active = false, children }) {
  const [isOpen, setIsOpen] = useState(false);
  const contextValue = useMemo(
    () => ({
      close: () => setIsOpen(false),
    }),
    [],
  );
  return (
    <PopoverPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      <PopoverPrimitive.Trigger asChild>
        <Button type="button" className={cn(UI.trigger, active && UI.triggerActive)}>
          <span>{label}</span>
          <Icon icon="solar:alt-arrow-down-linear" size={14} />
        </Button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          avoidCollisions={false}
          side="bottom"
          sideOffset={8}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          className={UI.menu}
          style={{ maxHeight: '60dvh', minWidth: 'var(--radix-popover-trigger-width)' }}
        >
          <FilterPopoverContext.Provider value={contextValue}>
            <div className="space-y-1">{children}</div>
          </FilterPopoverContext.Provider>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
export function OptionSection({ title = '', options, value, onChange }) {
  return (
    <div className="space-y-1">
      {title ? <SectionLabel>{title}</SectionLabel> : null}
      {options.map((option) => (
        <FilterMenuItem
          key={option.value}
          active={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </FilterMenuItem>
      ))}
    </div>
  );
}
export function RatingRangeEditor({ filters, onChange }) {
  return (
    <div className={cn(UI.divider, 'space-y-2')}>
      <div className="space-y-1">
        <span className="block px-2.5 text-xs font-semibold text-white/40 uppercase">
          Rating (or range)
        </span>
        <div className="rounded-xl ring-1 ring-inset ring-white/10 bg-black/50 px-2 py-2">
          <RatingRangeSelector
            maxValue={filters.maxRating}
            minValue={filters.minRating}
            onChange={onChange}
          />
        </div>
      </div>

      <p className={UI.helperText}>
        Click to pick one rating, or drag across the stars to choose a range.
      </p>
    </div>
  );
}
export function VisibilityGroup({ title = '', options = [], selectedFlags, onToggle }) {
  const { close } = useContext(FilterPopoverContext);
  return (
    <div className="space-y-1">
      {title ? <SectionLabel>{title}</SectionLabel> : null}

      {options.length === 0 ? (
        <p className={UI.helperText}>No visibility filters available.</p>
      ) : (
        options.map((option) => {
          const active = selectedFlags.has(option.key);
          return (
            <Button
              key={option.key}
              type="button"
              onClick={() => {
                onToggle(option.key);
                close();
              }}
              className={cn(UI.visibilityItem, active && UI.visibilityItemActive)}
            >
              <span>{option.label}</span>
              <span className={cn(UI.dot, active ? UI.dotActive : UI.dotInactive)} />
            </Button>
          );
        })
      )}
    </div>
  );
}
export function SearchChip({ value, open, onOpen, onClose, onChange, inputRef }) {
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
    return (
      <Button type="button" aria-label="Search titles" onClick={onOpen} className={UI.iconButton}>
        <Icon icon="solar:magnifer-linear" size={16} />
      </Button>
    );
  }
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <label className={UI.inputWrap}>
        <Icon icon="solar:magnifer-linear" size={18} className="shrink-0" />
        <Input
          ref={inputRef}
          type="text"
          value={localQuery}
          onChange={(event) => setLocalQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') handleClose();
          }}
          placeholder="Search titles"
          classNames={{ input: UI.input }}
        />
      </label>

      <Button type="button" onClick={handleClose} className={UI.resetButton}>
        Close
      </Button>
    </div>
  );
}
