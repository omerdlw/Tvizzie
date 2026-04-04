'use client';

import { motion } from 'framer-motion';

import { DURATION } from '@/core/constants';

const STAGGER_CONTAINER_VARIANTS = {
  visible: {
    transition: {
      staggerChildren: DURATION.VERY_FAST,
      delayChildren: DURATION.QUICK,
    },
  },
  hidden: {},
};

export function StaggerContainer({ children, className = '' }) {
  return (
    <motion.div variants={STAGGER_CONTAINER_VARIANTS} className={className} initial="hidden" animate="visible">
      {children}
    </motion.div>
  );
}
