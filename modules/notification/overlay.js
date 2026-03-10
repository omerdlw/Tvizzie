'use client'

import { motion } from 'framer-motion'

import { DURATION } from '@/lib/constants'
import { cn } from '@/lib/utils'
import Icon from '@/ui/icon'

import { NOTIFICATION_CONFIG } from './config'

export function NotificationOverlay({ notification, onDismiss, type }) {
  const defaultConfig = NOTIFICATION_CONFIG[type] || {}
  const config = { ...defaultConfig, ...notification }

  return (
    <motion.div
      exit={{
        transition: { duration: DURATION.FAST },
        scale: 0.95,
        opacity: 0,
        x: 100,
      }}
      transition={{ duration: DURATION.NORMAL, type: 'spring', bounce: 0.3 }}
      onDragEnd={(e, { offset, velocity }) => {
        if (offset.x > 100 || velocity.x > 500) {
          onDismiss()
        }
      }}
      className={cn(
        config.dismissible ? 'cursor-grab touch-pan-y' : '',
        'bg-black/40 backdrop-blur-xl',
        'pointer-events-auto w-full max-w-md min-w-xs',
        'rounded-[30px] border border-white/10',
        config.colorClass
      )}
      whileDrag={{ scale: 1.02, cursor: 'grabbing' }}
      initial={{ opacity: 0, x: 50, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      dragConstraints={{ left: 0, right: 0 }}
      drag={config.dismissible ? 'x' : false}
      dragElastic={{ left: 0, right: 0.5 }}
      layout
    >
      <div className="flex flex-col space-y-2 p-2.5">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'center size-12 shrink-0 rounded-[20px] bg-current/10',
              config.colorClass
            )}
          >
            <Icon icon={config.icon} size={20} />
          </div>
          <div className="min-w-0 flex-1 -space-y-0.5">
            <h3 className={cn('text-sm font-semibold text-current')}>
              {notification.title ||
                (notification.description
                  ? notification.message
                  : config.title)}
            </h3>
            <p className={cn('text-sm opacity-70')}>
              {notification.description ||
                notification.message ||
                config.description}
            </p>
          </div>
        </div>
        {notification.actions && (
          <div className="flex flex-auto items-center gap-2">
            {notification.actions.map((action, index) => (
              <button
                onPointerDown={(e) => e.stopPropagation()}
                className="w-full flex-auto cursor-pointer rounded-[20px] bg-white/10 p-2 text-sm font-semibold transition-colors hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation()
                  action.onClick?.()
                  if (action.dismiss) onDismiss()
                }}
                key={index}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
