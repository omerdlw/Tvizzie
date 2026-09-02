'use client';

import { AnimatePresence, motion } from 'motion/react';
import { REVIEW_SORT_OPTIONS } from '@/domains/reviews/utils/constants';
import { getNavActionClass, NAV_ACTION_STYLES } from './constants';
import { Button, Select } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';
import { NAV_FADE_TRANSITION, textCrossfadeVariants } from '@/modules/nav';

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
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key="sort-reviews"
          variants={textCrossfadeVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={NAV_FADE_TRANSITION}
          className="w-full"
        >
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
              menu: 'overflow-hidden ring-1 ring-inset ring-white/10 bg-black p-1 bottom-0',
              optionsList: 'flex flex-col gap-1',
              option:
                'cursor-pointer p-3 text-xs font-semibold text-white/70 uppercase outline-none data-[highlighted]:bg-white/5 data-[highlighted]:text-white',
              optionActive: 'bg-white/5 text-white',
              indicator: 'ml-auto text-white',
              icon: 'text-white/50',
            }}
            aria-label="Sort reviews"
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  const icon = isAuthenticated ? 'solar:pen-new-square-bold' : 'solar:tv-bold';
  const label = isAuthenticated
    ? hasExistingReview
      ? 'Edit Review'
      : 'Add Review'
    : 'Where to watch?';

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={`movie-action-${label}`}
        variants={textCrossfadeVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={NAV_FADE_TRANSITION}
        className="w-full"
      >
        <Button
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
          <span className="flex items-center gap-2.5 truncate">
            <Icon icon={icon} size={NAV_ACTION_STYLES.icon} />
            <span className="truncate">{label}</span>
          </span>
        </Button>
      </motion.div>
    </AnimatePresence>
  );
}
