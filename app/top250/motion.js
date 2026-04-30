import { motion } from 'framer-motion';

import {
  ANIMATION_DURATIONS,
  ANIMATION_EASINGS,
  ANIMATION_STAGGER,
  ANIMATION_VIEWPORTS,
  buildRevealMotion,
  createSurfaceItemMotion,
} from '@/core/animation';

export const TOP250_ROUTE_MOTION = Object.freeze({
  orchestration: Object.freeze({
    heroDelay: 0.04,
    summaryDelay: 0.1,
    gridDelay: 0.16,
    itemStagger: ANIMATION_STAGGER.MICRO,
  }),
  scroll: Object.freeze({
    sectionViewport: ANIMATION_VIEWPORTS.dense,
  }),
});

export function Top250SectionReveal({ children, className = '', delay = 0, distance = 18 }) {
  const reveal = buildRevealMotion({
    delay,
    distance,
    duration: ANIMATION_DURATIONS.MEDIUM,
    ease: ANIMATION_EASINGS.SMOOTH,
    scale: 0.988,
  });

  return (
    <motion.div
      className={className}
      initial={reveal.initial}
      animate={reveal.animate}
      transition={reveal.transition}
      style={reveal.style}
    >
      {children}
    </motion.div>
  );
}

export function getTop250GridItemMotion({ index = 0 } = {}) {
  return createSurfaceItemMotion({
    index,
    distance: 16,
    duration: ANIMATION_DURATIONS.MEDIUM,
    delayStep: TOP250_ROUTE_MOTION.orchestration.itemStagger,
    groupDelayStep: ANIMATION_STAGGER.MICRO,
    scale: 0.986,
    ease: ANIMATION_EASINGS.ACCENT,
  });
}
