'use client';

import { AnimatePresence, motion } from 'motion/react';
import { Button } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';
import SegmentedControl from '@/ui/components/segmented-control';
import { getNavActionClass, NAV_ACTION_STYLES } from './constants';
import { NAV_FADE_TRANSITION, textCrossfadeVariants } from '@/modules/nav';

const AWARDS_VIEW_MODE_ITEMS = [
  { key: 'projects', label: 'By Project', icon: 'solar:clapperboard-play-bold' },
  { key: 'timeline', label: 'Timeline', icon: 'solar:calendar-mark-bold' },
  { key: 'organizations', label: 'Organizations', icon: 'solar:diploma-verified-bold' },
];

export default function PersonAction({
  activeView,
  setActiveView,
  awardsViewMode = 'projects',
  setAwardsViewMode,
}) {
  const toggle = (view) => setActiveView(activeView === view ? 'main' : view);

  if (activeView === 'awards') {
    return (
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key="awards"
          variants={textCrossfadeVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={NAV_FADE_TRANSITION}
          className="flex w-full"
        >
          <SegmentedControl
            items={AWARDS_VIEW_MODE_ITEMS}
            value={awardsViewMode}
            onChange={setAwardsViewMode}
            fullWidth
            className="w-full p-0! ring-0!"
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={activeView === 'timeline' ? 'timeline' : 'main'}
        variants={textCrossfadeVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={NAV_FADE_TRANSITION}
        className={NAV_ACTION_STYLES.row}
      >
        <Button
          type="button"
          onClick={() => toggle('timeline')}
          className={getNavActionClass({
            className: 'flex-1',
            isActive: activeView === 'timeline',
          })}
        >
          <span className="flex items-center justify-center gap-2.5">
            {activeView === 'timeline' ? (
              <>
                <Icon icon="solar:arrow-left-bold" size={NAV_ACTION_STYLES.icon} />
                Back
              </>
            ) : (
              <>
                <Icon icon="solar:sort-by-time-bold" size={NAV_ACTION_STYLES.icon} />
                Timeline
              </>
            )}
          </span>
        </Button>
        <Button
          type="button"
          onClick={() => toggle('awards')}
          className={getNavActionClass({
            className: 'flex-1',
            isActive: activeView === 'awards',
          })}
        >
          <span className="flex items-center justify-center gap-2.5">
            <Icon icon="solar:cup-star-bold" size={NAV_ACTION_STYLES.icon} />
            Awards
          </span>
        </Button>
      </motion.div>
    </AnimatePresence>
  );
}
