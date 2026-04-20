'use client';

import { motion } from 'framer-motion';
import { ANIMATION_STAGGER } from '@/core/animation';

const STAGGER_CONTAINER_VARIANTS = {
  visible: {
    transition: {
      staggerChildren: ANIMATION_STAGGER.CASCADE,
      delayChildren: ANIMATION_STAGGER.GROUP,
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
