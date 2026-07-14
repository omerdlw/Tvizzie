'use client';

import { motion } from 'framer-motion';

import { getNotificationActionMotion } from '@/core/modules/motion';
import { normalizeFeedbackText } from '@/core/utils/feedback';
import { cn } from '@/core/utils/classnames';
import Icon from '@/ui/icon';

import { NOTIFICATION_CONFIG } from './config';

export function NotificationOverlay({ notification, onDismiss }) {
  const config = {
    ...(NOTIFICATION_CONFIG[notification.type] || {}),
    ...notification,
  };

  const duration = Number(config.duration);
  const hasAutoDismiss = Number.isFinite(duration) && duration > 0;
  const dismissible = config.dismissible === true && !hasAutoDismiss;
  const message = normalizeFeedbackText(config.message);
  const description = normalizeFeedbackText(config.description);
  const primaryText = message || description;
  const secondaryText = message && description ? description : '';
  const actions = Array.isArray(config.actions) ? config.actions.filter(Boolean) : [];

  if (!primaryText) {
    return null;
  }

  return (
    <section
      className={cn(
        'pointer-events-auto relative w-full rounded-[16px] border backdrop-blur-lg',
        dismissible && 'touch-pan-y',
        config.colorClass,
      )}
    >
      <div className="flex flex-col gap-3 p-4">
        {dismissible ? (
          <motion.button
            type="button"
            aria-label="Dismiss notification"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className="center absolute top-2/4 -translate-y-2/4 right-2.5 size-8 cursor-pointer rounded-[10px] border border-black/5 transition-colors hover:bg-black/5 hover:text-black"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Icon icon="material-symbols:close-rounded" size={14} />
          </motion.button>
        ) : null}

        <div className={cn('space-y-1', dismissible && 'pr-7')}>
          <p className="text-sm leading-5 font-semibold">{primaryText}</p>
          {secondaryText ? (
            <p className="text-sm leading-5 text-black/70">{secondaryText}</p>
          ) : null}
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
    </section>
  );
}
