'use client';

import { REVIEW_SORT_OPTIONS } from '@/features/reviews/utils';
import { getNavActionClass, NAV_ACTION_STYLES } from '@/core/modules/nav/actions/styles';
import { Select } from '@/ui/elements';
import Icon from '@/ui/icon';

export default function MovieAction({
  mode = 'watch',
  isActive = false,
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
          menu: 'overflow-hidden border border-black/10 bg-white p-1 bottom-0',
          optionsList: 'flex flex-col gap-1',
          option:
            'cursor-pointer p-3 text-xs font-semibold tracking-wide text-black/70 uppercase outline-none data-[highlighted]:bg-black/5 data-[highlighted]:text-black',
          optionActive: 'bg-black/5 text-black',
          indicator: 'ml-auto text-black',
          icon: 'text-black/50',
        }}
        aria-label="Sort reviews"
      />
    );
  }

  const icon = isActive ? 'solar:arrow-left-bold' : 'solar:tv-bold';
  const label = isActive ? 'Back' : 'Where to watch?';

  return (
    <button
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle?.();
      }}
      className={getNavActionClass({
        className,
        isActive,
      })}
      type="button"
    >
      <Icon icon={icon} size={NAV_ACTION_STYLES.icon} />
      <span className="truncate">{label}</span>
    </button>
  );
}
