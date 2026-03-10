'use client'

import { motion } from 'framer-motion'

const STAGGER_CONTAINER_VARIANTS = {
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
  hidden: {},
}

export function StaggerContainer({ children, className = '' }) {
  return (
    <motion.div
      variants={STAGGER_CONTAINER_VARIANTS}
      className={className}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  )
}
