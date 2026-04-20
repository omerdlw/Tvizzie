'use client';

import { motion, useReducedMotion } from 'framer-motion';

import { ANIMATION_DURATIONS, ANIMATION_EASINGS, ANIMATION_VIEWPORTS, buildRevealMotion } from '@/core/animation';

export const HOME_ROUTE_MOTION = Object.freeze({
  orchestration: Object.freeze({
    heroDelay: 0.04,
    sectionStep: 0.04,
    cardStep: 0.015,
  }),
  scroll: Object.freeze({
    sectionViewport: ANIMATION_VIEWPORTS.relaxed,
  }),
  sharedElements: Object.freeze({
    heroImage: Object.freeze({
      transition: Object.freeze({
        duration: 0.78,
        ease: ANIMATION_EASINGS.EMPHASIZED,
      }),
    }),
    heroContent: Object.freeze({
      transition: Object.freeze({
        duration: 0.52,
        ease: ANIMATION_EASINGS.ACCENT,
      }),
    }),
    pager: Object.freeze({
      transition: Object.freeze({
        duration: 0.34,
        ease: ANIMATION_EASINGS.ACCENT,
      }),
    }),
  }),
});

export const HOME_HERO_IMAGE_TRANSITION = HOME_ROUTE_MOTION.sharedElements.heroImage.transition;
export const HOME_HERO_CONTENT_TRANSITION = HOME_ROUTE_MOTION.sharedElements.heroContent.transition;
export const HOME_HERO_PAGER_TRANSITION = HOME_ROUTE_MOTION.sharedElements.pager.transition;

export function HomeSectionReveal({
  children,
  className = '',
  delay = 0,
  distance = 18,
  scale = 0.985,
  once = true,
}) {
  const reduceMotion = useReducedMotion();
  const motionProps = buildRevealMotion({
    delay,
    distance,
    duration: ANIMATION_DURATIONS.MEDIUM,
    ease: ANIMATION_EASINGS.STANDARD,
    reduceMotion,
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
