'use client';

import { motion } from 'framer-motion';

import { normalizeFeedbackText } from '@/core/utils';
import { cn } from '@/core/utils';

import { NOTIFICATION_CONFIG } from './config';

const DRAG_DISMISS_OFFSET = 100;
const DRAG_DISMISS_VELOCITY = 500;

export function NotificationOverlay({ notification, onDismiss }) {
  const config = {
    ...(NOTIFICATION_CONFIG[notification.type] || {}),
    ...notification,
  };

  const dismissible = config.dismissible === true;
  const message = normalizeFeedbackText(config.message);
  const description = normalizeFeedbackText(config.description);
  const primaryText = message || description;
  const secondaryText = message && description ? description : '';
  const actions = Array.isArray(config.actions) ? config.actions.filter(Boolean) : [];

  if (!primaryText) {
    return null;
  }

  return (
    <motion.div
      layout
      drag={dismissible ? 'x' : false}
      dragElastic={{ left: 0, right: 0.5 }}
      dragConstraints={{ left: 0, right: 0 }}
      whileDrag={{ scale: 1.02, cursor: 'grabbing' }}
      onDragEnd={(e, { offset, velocity }) => {
        if (offset.x > DRAG_DISMISS_OFFSET || velocity.x > DRAG_DISMISS_VELOCITY) {
          onDismiss();
        }
      }}
      initial={{ y: 12, opacity: 0, scale: 0.98 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{
        y: 12,
        opacity: 0,
        scale: 0.95,
        transition: { duration: 0.2 },
      }}
      transition={{ type: 'spring', bounce: 0.3, duration: 0.3 }}
      className={cn(
        'pointer-events-auto w-full rounded-[20px] border-[1.5px] border-black/10 backdrop-blur-lg',
        dismissible && 'cursor-grab touch-pan-y',
        config.colorClass
      )}
    >
      <div className="flex flex-col gap-3 p-4">
        <div className="space-y-1">
          <p className="text-sm leading-5 font-semibold">{primaryText}</p>
          {secondaryText ? <p className="text-sm leading-5 text-black/70">{secondaryText}</p> : null}
        </div>
        {actions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {actions.map((action, index) => (
              <button
                key={action.label || index}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick?.();
                  if (action.dismiss) onDismiss();
                }}
                type="button"
                className="min-h-10 flex-1 rounded-[14px] border border-black/5 bg-black/5 px-3 text-sm font-semibold transition-colors hover:border-black/10 hover:bg-black/10"
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
