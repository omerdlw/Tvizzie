'use client';

import { motion } from 'framer-motion';
import { ANIMATION_DURATIONS, ANIMATION_EASINGS, buildRevealMotion } from '@/core/animation';

export function RevealItem({
  children,
  className = '',
  delay = 0,
  duration = ANIMATION_DURATIONS.MEDIUM,
  distance = 18,
  scale = 0.985,
  once = true,
}) {
  const motionProps = buildRevealMotion({
    delay,
    distance,
    duration,
    ease: ANIMATION_EASINGS.STANDARD,
    scale,
  });

  return (
    <motion.div
      initial={motionProps.initial}
      whileInView={motionProps.animate}
      viewport={{ once, amount: 'some' }}
      transition={motionProps.transition}
      className={className}
      style={motionProps.style}
    >
      {children}
    </motion.div>
  );
}
