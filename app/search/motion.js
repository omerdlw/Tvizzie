'use client';

import { ANIMATION_DURATIONS, ANIMATION_EASINGS, ANIMATION_STAGGER, ANIMATION_VIEWPORTS, createSurfaceItemMotion } from '@/core/animation';
import { motion, useReducedMotion } from 'framer-motion';

export const SEARCH_ROUTE_MOTION = Object.freeze({
  orchestration: Object.freeze({
    filterDelay: 0.04,
    resultDelay: 0.08,
    itemStagger: ANIMATION_STAGGER.MICRO,
  }),
  scroll: Object.freeze({
    sectionViewport: ANIMATION_VIEWPORTS.dense,
  }),
  sharedElements: Object.freeze({
    resultsPanel: Object.freeze({
      transition: Object.freeze({
        duration: ANIMATION_DURATIONS.NORMAL,
        ease: ANIMATION_EASINGS.SMOOTH,
      }),
    }),
    filters: Object.freeze({
      transition: Object.freeze({
        duration: ANIMATION_DURATIONS.SNAPPY,
        ease: ANIMATION_EASINGS.ACCENT,
      }),
    }),
  }),
});

export function SearchSectionReveal({ children, className = '', delay = 0, distance = 18 }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: distance, scale: 0.988 }}
      animate={
        reduceMotion
          ? { opacity: 1 }
          : {
              opacity: 1,
              y: 0,
              scale: 1,
              transitionEnd: {
                transform: 'none',
                willChange: 'auto',
              },
            }
      }
      transition={
        reduceMotion
          ? { duration: ANIMATION_DURATIONS.REDUCED, ease: ANIMATION_EASINGS.EASE_OUT }
          : {
              opacity: {
                duration: ANIMATION_DURATIONS.NORMAL * 0.65,
                delay,
                ease: ANIMATION_EASINGS.EASE_OUT,
              },
              y: {
                duration: ANIMATION_DURATIONS.NORMAL,
                delay,
                ease: ANIMATION_EASINGS.SMOOTH,
              },
              scale: {
                duration: ANIMATION_DURATIONS.NORMAL,
                delay,
                ease: ANIMATION_EASINGS.SMOOTH,
              },
            }
      }
    >
      {children}
    </motion.div>
  );
}

export function getSearchGridItemMotion({ index = 0, reduceMotion = false } = {}) {
  return createSurfaceItemMotion({
    index,
    reduceMotion,
    distance: 16,
    duration: ANIMATION_DURATIONS.MEDIUM,
    delayStep: SEARCH_ROUTE_MOTION.orchestration.itemStagger,
    groupDelayStep: ANIMATION_STAGGER.MICRO,
    scale: 0.986,
    ease: ANIMATION_EASINGS.ACCENT,
  });
}
