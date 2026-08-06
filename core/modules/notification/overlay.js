'use client';

import { motion } from 'framer-motion';

import { normalizeFeedbackText } from '@/shared/utils';
import { cn } from '@/shared/utils';
import Icon from '@/ui/primitives/icon';

import { NOTIFICATION_CONFIG } from './config';
import {
  NOTIFICATION_SPRING,
  NOTIFICATION_MICRO_SPRING,
  NOTIFICATION_TAP_SCALE,
  NOTIFICATION_MICRO_TAP_SCALE,
} from './motion';

export function NotificationOverlay({ notification, onDismiss }) {
  const config = {
    ...(NOTIFICATION_CONFIG[notification.type] || {}),
    ...notification,
  };

  const dismissible = config.dismissible !== false;
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
      role="alert"
      aria-atomic="true"
      className={cn(
        'pointer-events-auto relative w-full overflow-hidden rounded-[24px] border shadow-lg backdrop-blur-lg',
        dismissible && 'touch-pan-y',
        config.colorClass,
      )}
    >
      <div className="flex flex-col gap-3 p-4">
        {dismissible ? (
          <motion.button
            type="button"
            aria-label="Bildirimi kapat"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: NOTIFICATION_MICRO_TAP_SCALE }}
            transition={NOTIFICATION_MICRO_SPRING}
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className="center absolute top-2/4 right-2.5 size-8 -translate-y-2/4 cursor-pointer rounded-full border border-black/5 transition-colors duration-150 hover:bg-black/5 hover:text-black focus-visible:ring-2 focus-visible:ring-black/10 focus-visible:outline-none"
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
          <div className="flex flex-wrap gap-2 overflow-visible p-0.5">
            {actions.map((action, index) => (
              <motion.button
                key={action.label || index}
                onPointerDown={(e) => e.stopPropagation()}
                whileHover={{ scale: 1.012 }}
                whileTap={{ scale: NOTIFICATION_TAP_SCALE }}
                transition={NOTIFICATION_SPRING}
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick?.();
                  if (action.dismiss) onDismiss();
                }}
                type="button"
                className="min-h-10 flex-1 rounded-xl border border-black/5 bg-black/5 px-3 text-sm font-semibold text-black transition-colors duration-200 hover:border-black/10 hover:bg-black/10 focus-visible:ring-2 focus-visible:ring-black/10 focus-visible:outline-none"
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
