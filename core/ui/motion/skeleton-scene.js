'use client';

import { motion, useReducedMotion } from 'framer-motion';

const TRANSITION = Object.freeze({
  duration: 0.28,
  ease: [0.16, 1, 0.3, 1],
});

export default function SkeletonScene({ children, className }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, transition: { duration: 0.16, ease: 'easeOut' } }}
      transition={TRANSITION}
    >
      {children}
    </motion.div>
  );
}
