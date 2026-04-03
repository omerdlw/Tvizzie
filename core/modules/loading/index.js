'use client'

import { AnimatePresence, motion } from 'framer-motion'

import { DURATION, EASING } from '@/core/constants'
import { useIsFullscreenStateActive } from '@/ui/states/fullscreen-state'
import { Spinner } from '@/ui/loadings/spinner'

import { useLoadingState } from './context'

export { useLoadingActions, LoadingProvider, useLoadingState } from './context'

function LoadingContent({ skeleton }) {
  if (skeleton) return skeleton
  return <Spinner size={50} />
}

export function LoadingOverlay() {
  const { isLoading, skeleton } = useLoadingState()
  const isFullscreenStateActive = useIsFullscreenStateActive()

  return (
    <AnimatePresence>
      {isLoading && !isFullscreenStateActive && (
        <motion.div
          className="center fixed inset-0 h-screen w-screen "
          initial={{}}
          animate={{}}
          exit={{}}
          transition={{
            duration: DURATION.NORMAL,
            ease: EASING.EASE_IN_OUT,
          }}
        >
          <LoadingContent skeleton={skeleton} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
