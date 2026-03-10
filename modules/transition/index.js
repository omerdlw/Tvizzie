'use client'

import { useEffect } from 'react'

import { usePathname } from 'next/navigation'

import { AnimatePresence, motion } from 'framer-motion'

import { useTransitionActions } from './context'
import { getPreset } from './presets'

export {
  TransitionProvider,
  useTransitionState,
  useTransitionActions,
} from './context'
export {
  TRANSITION_PRESETS,
  getPreset,
  getBackgroundAnimation,
  DEFAULT_PRESET,
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
  const config = getPreset(preset)

  useEffect(() => {
    setPreset(preset)
  }, [preset, setPreset])

  return (
    <motion.div
      key={pathname}
      initial={config.initial}
      animate={{
        ...config.animate,
        transition: config.transition,
      }}
      exit={{
        ...config.exit,
        transition: {
          ...config.transition,
          duration: (config.transition?.duration ?? 0.5) * 0.6,
        },
      }}
      onAnimationStart={() => startTransition()}
      onAnimationComplete={() => endTransition()}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  )
}
