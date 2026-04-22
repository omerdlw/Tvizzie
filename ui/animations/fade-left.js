'use client';

import { motion } from 'framer-motion';
import { ANIMATION_DURATIONS, ANIMATION_EASINGS } from '@/core/animation';

const FADE_LEFT_VARIANTS = {
  visible: {
    opacity: 1,
    x: 0,
    transitionEnd: { transform: 'none', willChange: 'auto' },
  },
  hidden: { opacity: 0, x: -32 },
};

export function FadeLeft({ children, className = '', delay = 0, duration = ANIMATION_DURATIONS.SLOWER, once = true }) {
  return (
    <motion.div
      transition={{ duration, ease: ANIMATION_EASINGS.STANDARD, delay }}
      variants={FADE_LEFT_VARIANTS}
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount: 'some' }}
    >
      {children}
    </motion.div>
  );
}
