'use client'

import { motion } from 'framer-motion'

import { DURATION, EASING } from '@/lib/constants'

const FADE_UP_VARIANTS = {
  visible: {
    opacity: 1,
    y: 0,
    transitionEnd: { transform: 'none', willChange: 'auto' },
  },
  hidden: { opacity: 0, y: 24 },
}

export function FadeUp({
  children,
  className = '',
  delay = 0,
  duration = DURATION.SLOW,
}) {
  return (
    <motion.div
      transition={{ duration, ease: EASING.STANDARD, delay }}
      variants={FADE_UP_VARIANTS}
      className={className}
    >
      {children}
    </motion.div>
  )
}
