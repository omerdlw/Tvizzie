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
  once = true,
}) {
  return (
    <motion.div
      transition={{ duration, ease: EASING.STANDARD, delay }}
      variants={FADE_LEFT_VARIANTS}
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount: 0.2 }}
      style={{ willChange: 'transform, opacity' }}
    >
      {children}
    </motion.div>
  )
}
