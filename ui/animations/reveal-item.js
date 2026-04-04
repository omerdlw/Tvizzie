'use client';

import { motion } from 'framer-motion';

import { DURATION, EASING } from '@/core/constants';

export function RevealItem({
  children,
  className = '',
  delay = 0,
  duration = DURATION.MEDIUM,
  distance = 18,
  scale = 0.985,
  once = true,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: distance, scale }}
      whileInView={{
        opacity: 1,
        y: 0,
        scale: 1,
        transitionEnd: { transform: 'none', willChange: 'auto' },
      }}
      viewport={{ once, amount: 'some' }}
      transition={{ duration, ease: EASING.STANDARD, delay }}
      className={className}
      style={{ willChange: 'transform, opacity' }}
    >
      {children}
    </motion.div>
  );
}
