'use client';

import { getNavActionClass, NAV_ACTION_STYLES } from '@/core/modules/nav/actions/styles';
import Icon from '@/ui/icon';

export default function MovieAction({ isActive = false, onToggle, className = 'flex-1 min-w-0 whitespace-nowrap' }) {
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
