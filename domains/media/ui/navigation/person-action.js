'use client';

import { motion, AnimatePresence } from 'framer-motion';
import SocialLinks from '@/domains/media/ui/person/social-links';
import Icon from '@/ui/primitives/icon';
import { getNavActionClass, NAV_ACTION_STYLES } from '@/ui/primitives/navigation-action-styles';

export default function PersonAction({ activeView, setActiveView, externalIds }) {
  const toggle = (view) => setActiveView(activeView === view ? 'main' : view);

  return (
    <div className="flex flex-col gap-2">
      <div className={NAV_ACTION_STYLES.row}>
        <motion.button
          type="button"
          whileHover={{ scale: 1.012 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 450, damping: 26 }}
          onClick={() => toggle('timeline')}
          className={getNavActionClass({
            className: 'flex-1',
            isActive: activeView === 'timeline',
          })}
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={activeView === 'timeline' ? 'back' : 'timeline'}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.24, 1] }}
              className="flex items-center justify-center gap-2"
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
            </motion.span>
          </AnimatePresence>
        </motion.button>

        <motion.button
          type="button"
          whileHover={{ scale: 1.012 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 450, damping: 26 }}
          onClick={() => toggle('awards')}
          className={getNavActionClass({
            className: 'flex-1',
            isActive: activeView === 'awards',
          })}
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={activeView === 'awards' ? 'back' : 'awards'}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.24, 1] }}
              className="flex items-center justify-center gap-2"
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
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>

      {externalIds ? (
        <SocialLinks
          externalIds={externalIds}
          className="w-full justify-center rounded-2xl"
        />
      ) : null}
    </div>
  );
}
