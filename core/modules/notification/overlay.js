'use client';

import { motion } from 'framer-motion';

import { NOTIFICATION_CONTENT_MOTION, getNotificationActionMotion } from '@/core/modules/motion';
import { normalizeFeedbackText } from '@/core/utils';
import { cn } from '@/core/utils';

import { NOTIFICATION_CONFIG } from './config';

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
    <motion.section
      className={cn(
        'pointer-events-auto w-full border border-white/10 backdrop-blur-lg',
        dismissible && 'touch-pan-y',
        config.colorClass
      )}
      {...NOTIFICATION_CONTENT_MOTION}
    >
      <div className="flex flex-col gap-3 p-4">
        <div className="space-y-1">
          <p className="text-sm leading-5 font-semibold">{primaryText}</p>
          {secondaryText ? <p className="text-sm leading-5 text-white/70">{secondaryText}</p> : null}
        </div>
        {actions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {actions.map((action, index) => (
              <motion.button
                key={action.label || index}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick?.();
                  if (action.dismiss) onDismiss();
                }}
                type="button"
                className="min-h-10 flex-1 border border-white/10 bg-white/10 px-3 text-sm font-semibold hover:border-white/15 hover:bg-white/10"
                {...getNotificationActionMotion(index)}
              >
                {action.label}
              </motion.button>
            ))}
          </div>
        ) : null}
      </div>
    </motion.section>
  );
}
