'use client';

import { motion } from 'framer-motion';

import { ANIMATION_DURATIONS, ANIMATION_EASINGS, ANIMATION_VIEWPORTS, buildRevealMotion } from '@/core/animation';

export const HOME_ROUTE_MOTION = Object.freeze({
  orchestration: Object.freeze({
    sectionStep: 0.04,
    cardStep: 0.015,
  }),
  scroll: Object.freeze({
    sectionViewport: ANIMATION_VIEWPORTS.relaxed,
  }),
});

export function HomeSectionReveal({
  children,
  className = '',
  delay = 0,
  distance = 18,
  scale = 0.985,
  once = true,
}) {
  const motionProps = buildRevealMotion({
    delay,
    distance,
    duration: ANIMATION_DURATIONS.MEDIUM,
    ease: ANIMATION_EASINGS.STANDARD,
    scale,
  });

  return (
    <motion.div
      className={className}
      initial={motionProps.initial}
      whileInView={motionProps.animate}
      viewport={{ ...HOME_ROUTE_MOTION.scroll.sectionViewport, once }}
      transition={motionProps.transition}
      style={motionProps.style}
    >
      {children}
    </motion.div>
  );
}
