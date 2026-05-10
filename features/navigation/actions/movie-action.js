'use client';

import { motion } from 'framer-motion';

import { REVIEW_SORT_OPTIONS } from '@/features/reviews/utils';
import MediaSocialProof from '@/features/movie/social-proof';
import { getNavActionClass, NAV_ACTION_STYLES } from '@/core/modules/nav/actions/styles';
import { Select } from '@/ui/elements';
import Icon from '@/ui/icon';
import {
  FEATURE_NAV_ACTION_BUTTON_MOTION,
  FEATURE_NAV_ACTION_ROW_MOTION,
} from '@/features/motion';

export default function MovieAction({
  mode = 'watch',
  isActive = false,
  onToggle,
  sortMode,
  onSortChange,
  socialProofMedia = null,
  socialProofViewerId = null,
  socialProofKnownMovieIds = [],
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
          menu: 'nav-action-select-menu bottom-0 overflow-hidden  p-1',
          optionsList: 'flex flex-col gap-1',
          option:
            'nav-action-select-option cursor-pointer  p-3 text-xs font-semibold tracking-wide uppercase outline-none',
          optionActive: 'nav-action-select-option-active',
          indicator: 'ml-auto text-white',
          icon: 'text-white-muted',
        }}
        aria-label="Sort reviews"
      />
    );
  }

  const icon = isActive ? 'solar:arrow-left-bold' : 'solar:tv-bold';
  const label = isActive ? 'Back' : 'Where to watch?';

  return (
    <motion.div className="flex min-w-0 flex-1 flex-col gap-2" {...FEATURE_NAV_ACTION_ROW_MOTION}>
      <motion.button
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
        {...FEATURE_NAV_ACTION_BUTTON_MOTION}
      >
        <Icon icon={icon} size={NAV_ACTION_STYLES.icon} />
        <span className="truncate">{label}</span>
      </motion.button>
      {socialProofMedia ? (
        <MediaSocialProof
          media={socialProofMedia}
          viewerId={socialProofViewerId}
          knownMovieIds={socialProofKnownMovieIds}
          className="mt-0"
        />
      ) : null}
    </motion.div>
  );
}
