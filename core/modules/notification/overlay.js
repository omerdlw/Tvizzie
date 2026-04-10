'use client';

import { motion } from 'framer-motion';

import { DURATION, EASING } from '@/core/constants';
import { cn } from '@/core/utils';

import { NOTIFICATION_CONFIG } from './config';

export function NotificationOverlay({ notification, onDismiss, type }) {
  const config = {
    ...(NOTIFICATION_CONFIG[type] || {}),
    ...notification,
  };

  const dismissible = config.dismissible;

  return (
    <motion.div
      layout
      drag={dismissible ? 'x' : false}
      dragElastic={{ left: 0, right: 0.5 }}
      dragConstraints={{ left: 0, right: 0 }}
      whileDrag={{ scale: 1.02, cursor: 'grabbing' }}
      onDragEnd={(e, { offset, velocity }) => {
        if (offset.x > 100 || velocity.x > 500) {
          onDismiss();
        }
      }}
      initial={{ x: 50, scale: 0.95 }}
      animate={{ x: 0, scale: 1 }}
      exit={{
        x: 100,
        scale: 0.95,
        transition: { duration: DURATION.FAST },
      }}
      transition={EASING.SPRING_CONFIG.NOTIFICATION}
      className={cn(
        'pointer-events-auto w-full max-w-md min-w-xs rounded-[16px] border-[1.5px] border-black/10',
        dismissible && 'cursor-grab touch-pan-y',
        config.colorClass
      )}
    >
      <div className="flex flex-col space-y-2 p-4">
        <p className="text-sm font-semibold">{notification.description || notification.message}</p>
        {notification.actions && (
          <div className="flex gap-2">
            {notification.actions.map((action, index) => (
              <button
                key={index}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick?.();
                  if (action.dismiss) onDismiss();
                }}
                className={
                  'w-full border border-black/5 bg-black/5 text-sm font-semibold transition-colors hover:border-black/10 hover:bg-black/10'
                }
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
