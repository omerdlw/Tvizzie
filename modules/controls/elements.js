'use client'

import { AnimatePresence, motion } from 'framer-motion'

import { DURATION, Z_INDEX } from '@/lib/constants'
import {
  useControlsActions,
  useControlsState,
} from '@/modules/controls/context'
import Icon from '@/ui/icon'

export function MobileControlsToggle({ navHeight = 80 }) {
  const { isOpen, hasControls, controlsHeight } = useControlsState()
  const { toggleControls } = useControlsActions()

  if (!hasControls) return null

  const bottomPosition = isOpen ? 16 + controlsHeight + 16 : 16 + navHeight + 32

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 transition-all duration-300 md:hidden"
      style={{ bottom: `${bottomPosition}px`, zIndex: Z_INDEX.NAV }}
    >
      <motion.button
        className="center size-12 cursor-pointer border border-white/10 bg-black/40 backdrop-blur-sm transition-colors hover:bg-white/10 active:scale-95"
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleControls}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isOpen ? (
            <motion.div
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: DURATION.FAST }}
              key="close"
            >
              <Icon
                icon="material-symbols:close-rounded"
                width={24}
                height={24}
              />
            </motion.div>
          ) : (
            <motion.div
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: DURATION.FAST }}
              key="open"
            >
              <Icon icon="solar:tuning-3-bold" height={24} width={24} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  )
}
