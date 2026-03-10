'use client'

import { useEffect, useRef } from 'react'
import { Suspense } from 'react'

import { usePathname } from 'next/navigation'

import { AnimatePresence, motion } from 'framer-motion'

import { Z_INDEX } from '@/lib/constants'
import {
  useControlsActions,
  useControlsState,
} from '@/modules/controls/context'

import { CONFIG } from './config'

export default function Controls() {
  const { leftControls, rightControls, isOpen } = useControlsState()
  const { setControlsHeight } = useControlsActions()
  const containerRef = useRef(null)
  const pathname = usePathname()

  const hasControls = leftControls || rightControls

  useEffect(() => {
    if (containerRef.current && isOpen) {
      const height = containerRef.current.offsetHeight
      setControlsHeight(height)
    } else if (!isOpen) {
      setControlsHeight(0)
    }
  }, [isOpen, leftControls, rightControls, setControlsHeight])

  return (
    <div
      className={`${CONFIG.STYLES.CONTAINER} ${
        isOpen
          ? 'pointer-events-auto opacity-100'
          : 'pointer-events-none opacity-0 md:pointer-events-none md:opacity-100'
      }`}
      style={{ zIndex: Z_INDEX.CONTROLS }}
      ref={containerRef}
    >
      <AnimatePresence mode="wait">
        {hasControls && (
          <motion.div
            className={CONFIG.STYLES.INNER_CONTAINER}
            transition={CONFIG.ANIMATION}
            initial={CONFIG.VARIANTS.initial}
            animate={CONFIG.VARIANTS.animate}
            exit={CONFIG.VARIANTS.exit}
            key={pathname}
          >
            <div className={CONFIG.STYLES.LEFT_CONTAINER}>
              <Suspense>{leftControls}</Suspense>
            </div>
            <div className={CONFIG.STYLES.SPACER}></div>
            <div className={CONFIG.STYLES.RIGHT_CONTAINER}>
              <Suspense>{rightControls}</Suspense>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
