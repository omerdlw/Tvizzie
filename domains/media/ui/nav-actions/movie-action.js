'use client';

import { REVIEW_SORT_OPTIONS } from '@/domains/reviews/shared/review-data';
import { getNavActionClass, NAV_ACTION_STYLES } from '@/ui/primitives/navigation-action-styles';
import { Select } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';

export default function MovieAction({
  mode = 'watch',
  isActive = false,
  isAuthenticated = false,
  hasExistingReview = false,
  onToggle,
  sortMode,
  onSortChange,
  className = 'flex-1 min-w-0 whitespace-nowrap',
}) {
  if (mode === 'sort') {
    return (
      <Select
        value={sortMode}
        onChange={onSortChange}
        options={REVIEW_SORT_OPTIONS}
        side="top"
        align="center"
        sideOffset={10}
        classNames={{
          trigger: `${getNavActionClass({
            className,
            isActive: false,
          })} justify-between`,
          value: 'truncate',
          menu: 'overflow-hidden border border-white/10 bg-black p-1 bottom-0',
          optionsList: 'flex flex-col gap-1',
          option:
            'cursor-pointer p-3 text-xs font-semibold tracking-wide text-white/70 uppercase outline-none data-[highlighted]:bg-white/5 data-[highlighted]:text-white',
          optionActive: 'bg-white/5 text-white',
          indicator: 'ml-auto text-white',
          icon: 'text-white/50',
        }}
        aria-label="Sort reviews"
      />
    );
  }

  const defaultIcon = isAuthenticated ? 'solar:pen-new-square-bold' : 'solar:tv-bold';
  const defaultLabel = isAuthenticated
    ? hasExistingReview
      ? 'Edit Review'
      : 'Add Review'
    : 'Where to watch?';

  const icon = isActive ? 'solar:arrow-left-bold' : defaultIcon;
  const label = isActive ? 'Back' : defaultLabel;

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle?.();
      }}
      className={getNavActionClass({
        className,
        isActive,
      })}
    >
      <span className="flex items-center gap-2 truncate">
        <Icon icon={icon} size={NAV_ACTION_STYLES.icon} />
        <span className="truncate">{label}</span>
      </span>
    </button>
  );
}
