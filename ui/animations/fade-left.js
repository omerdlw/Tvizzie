'use client'

import { motion } from 'framer-motion'

import { DURATION, EASING } from '@/lib/constants'

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
  duration = DURATION.SLOWER,
}) {
  return (
    <motion.div
      transition={{ duration, ease: EASING.STANDARD, delay }}
      variants={FADE_LEFT_VARIANTS}
      className={className}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  )
}
