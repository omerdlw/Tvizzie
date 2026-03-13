'use client'

import { AnimatePresence, motion } from 'framer-motion'

import { DURATION, EASING } from '@/lib/constants'
import { Spinner } from '@/ui/spinner'

import { useLoadingState } from './context'

export { useLoadingActions, useLoadingState, LoadingProvider } from './context'

export function LoadingOverlay() {
  const { isLoading, skeleton } = useLoadingState()

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          className="center fixed inset-0 h-screen w-screen bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DURATION.NORMAL, ease: EASING.EASE_IN_OUT }}
        >
          {skeleton || <Spinner size={50} />}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
