'use client';

import { motion } from 'framer-motion';

import Icon from '@/ui/icon';
import { getNavActionClass, NAV_ACTION_STYLES } from '@/core/modules/nav/actions/styles';
import { FEATURE_NAV_ACTION_BUTTON_MOTION, FEATURE_NAV_ACTION_ROW_MOTION } from '@/features/motion';

export default function PersonAction({ activeView, setActiveView }) {
  const toggle = (view) => setActiveView(activeView === view ? 'main' : view);

  return (
    <motion.div className={NAV_ACTION_STYLES.row} {...FEATURE_NAV_ACTION_ROW_MOTION}>
      <motion.button
        type="button"
        onClick={() => toggle('timeline')}
        className={getNavActionClass({
          className: 'flex-1',
          isActive: activeView === 'timeline',
        })}
        {...FEATURE_NAV_ACTION_BUTTON_MOTION}
      >
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
      </motion.button>

      <motion.button
        type="button"
        onClick={() => toggle('awards')}
        className={getNavActionClass({
          className: 'flex-1',
          isActive: activeView === 'awards',
        })}
        {...FEATURE_NAV_ACTION_BUTTON_MOTION}
      >
        {activeView === 'awards' ? (
          <>
            <Icon icon="solar:arrow-left-bold" size={NAV_ACTION_STYLES.icon} />
            Back
          </>
        ) : (
          <>
            <Icon icon="solar:cup-star-bold" size={NAV_ACTION_STYLES.icon} />
            Awards
          </>
        )}
      </motion.button>
    </motion.div>
  );
}
