'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { REVIEW_SORT_OPTIONS } from '@/domains/reviews/ui/review-data';
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

  const defaultIcon = isAuthenticated ? 'solar:pen-new-square-bold' : 'solar:tv-bold';
  const defaultLabel = isAuthenticated
    ? hasExistingReview
      ? 'Edit Review'
      : 'Add Review'
    : 'Where to watch?';

  const icon = isActive ? 'solar:arrow-left-bold' : defaultIcon;
  const label = isActive ? 'Back' : defaultLabel;

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.012 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 450, damping: 26 }}
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
      <AnimatePresence mode="wait">
        <motion.span
          key={`${icon}-${label}`}
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -3 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.24, 1] }}
          className="flex items-center gap-2 truncate"
        >
          <Icon icon={icon} size={NAV_ACTION_STYLES.icon} />
          <span className="truncate">{label}</span>
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
