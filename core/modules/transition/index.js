'use client'

import { useEffect, useMemo } from 'react'

import { usePathname } from 'next/navigation'

import { AnimatePresence, motion } from 'framer-motion'

import { DURATION } from '@/core/constants'

import { useTransitionActions } from './context'
import { getPreset } from './presets'

export {
  useTransitionActions,
  TransitionProvider,
  useTransitionState,
} from './context'

export {
  getBackgroundAnimation,
  TRANSITION_PRESETS,
  DEFAULT_PRESET,
  getPreset,
} from './presets'

export function TransitionWrapper({ children }) {
  return <AnimatePresence mode="popLayout">{children}</AnimatePresence>
}

export function Transition({
  children,
  preset = 'slideUp',
  className = '',
  style = {},
}) {
  const pathname = usePathname()
  const { setPreset, startTransition, endTransition } = useTransitionActions()

  const config = useMemo(() => getPreset(preset), [preset])

  useEffect(() => {
    setPreset(preset)
  }, [preset, setPreset])

  const exitDuration =
    (config.transition?.duration ?? DURATION.MODERATE) * DURATION.RATIO.EXIT

  return (
    <motion.div
      initial={config.initial}
      animate={{
        ...config.animate,
        transition: config.transition,
      }}
      exit={{
        ...config.exit,
        transition: {
          ...config.transition,
          duration: exitDuration,
        },
      }}
      onAnimationStart={startTransition}
      onAnimationComplete={endTransition}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  )
}
