'use client';

import { motion } from 'framer-motion';

import { NOTIFICATION_CONTENT_MOTION, getNotificationActionMotion } from '@/core/modules/motion';
import { normalizeFeedbackText } from '@/core/utils/feedback';
import { cn } from '@/core/utils/classnames';

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
        'pointer-events-auto w-full border-[1.5px] border-black/10 bg-white/90 shadow-sm backdrop-blur-lg',
        dismissible && 'touch-pan-y',
        config.colorClass
      )}
      {...NOTIFICATION_CONTENT_MOTION}
    >
      <div className="flex flex-col gap-3 p-4">
        <div className="space-y-1">
          <p className="text-sm leading-5 font-semibold text-black">{primaryText}</p>
          {secondaryText ? <p className="text-sm leading-5 text-black/70">{secondaryText}</p> : null}
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
                className="min-h-10 flex-1 border border-black/5 bg-black/5 px-3 text-sm font-semibold text-black transition-colors hover:border-black/10 hover:bg-black/10"
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
