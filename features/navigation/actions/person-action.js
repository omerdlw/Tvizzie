'use client';

import Icon from '@/ui/icon';
import { getNavActionClass, NAV_ACTION_STYLES } from '@/features/navigation/actions/model';
import { motion } from 'framer-motion';
import { NAV_ACTION_SPRING } from '@/core/modules/motion';

export default function PersonAction({ activeView, setActiveView }) {
  const toggle = (view) => setActiveView(activeView === view ? 'main' : view);

  return (
    <div className={NAV_ACTION_STYLES.row}>
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        transition={NAV_ACTION_SPRING}
        onClick={() => toggle('timeline')}
        className={getNavActionClass({
          className: 'flex-1',
          isActive: activeView === 'timeline',
        })}
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
        whileTap={{ scale: 0.98 }}
        transition={NAV_ACTION_SPRING}
        onClick={() => toggle('awards')}
        className={getNavActionClass({
          className: 'flex-1',
          isActive: activeView === 'awards',
        })}
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
    </div>
  );
}
