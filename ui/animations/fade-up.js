'use client';

import { motion } from 'framer-motion';
import { ANIMATION_DURATIONS, ANIMATION_EASINGS } from '@/core/animation';

const FADE_UP_VARIANTS = {
  visible: {
    opacity: 1,
    y: 0,
    transitionEnd: { transform: 'none', willChange: 'auto' },
  },
  hidden: { opacity: 0, y: 24 },
};

export function FadeUp({ children, className = '', delay = 0, duration = ANIMATION_DURATIONS.SLOW, once = true }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount: 'some' }}
      transition={{ duration, ease: ANIMATION_EASINGS.STANDARD, delay }}
      variants={FADE_UP_VARIANTS}
      className={className}
    >
      {children}
    </motion.div>
  );
}
