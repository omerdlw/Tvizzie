'use client'

import { motion } from 'framer-motion'

const FADE_LEFT_VARIANTS = {
  visible: {
    opacity: 1,
    x: 0,
    transitionEnd: { transform: 'none', willChange: 'auto' },
  },
  hidden: { opacity: 0, x: -32 },
}

export function FadeLeft({
  children,
  className = '',
  delay = 0,
  duration = 0.7,
}) {
  return (
    <motion.div
      transition={{ duration, ease: [0.25, 0.1, 0.25, 1], delay }}
      variants={FADE_LEFT_VARIANTS}
      className={className}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  )
}
