'use client';

import { motion } from 'framer-motion';

import { normalizeFeedbackText } from '@/shared/utils';
import { cn } from '@/shared/utils';
import Icon from '@/ui/primitives/icon';

import { NOTIFICATION_CONFIG } from './config';
import {
  NOTIFICATION_ACTION_TAP_Y,
  notificationContentVariants,
  NOTIFICATION_MICRO_SPRING,
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
        'pointer-events-auto relative w-full overflow-hidden border shadow-[0_18px_56px_rgba(0,0,0,0.40)]',
        dismissible && 'touch-pan-y',
        config.colorClass,
      )}
    >
      <motion.div
        variants={notificationContentVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-3 p-4"
      >
        {dismissible ? (
          <motion.button
            type="button"
            aria-label="Bildirimi kapat"
            whileHover={{ y: -1 }}
            whileTap={{ y: 1 }}
            transition={NOTIFICATION_MICRO_SPRING}
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className="center absolute top-2/4 right-2.5 size-8 -translate-y-2/4 cursor-pointer border border-white/5 transition-[background-color,border-color,color] duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-white/5 hover:text-white focus-visible:ring-2 focus-visible:ring-white/10 focus-visible:outline-none"
          >
            <Icon icon="material-symbols:close-rounded" size={14} />
          </motion.button>
        ) : null}

        <div className={cn('space-y-1', dismissible && 'pr-7')}>
          <p className="text-sm leading-5 font-semibold">{primaryText}</p>
          {secondaryText ? (
            <p className="text-sm leading-5 text-white/70">{secondaryText}</p>
          ) : null}
        </div>

        {actions.length > 0 ? (
          <div className="flex flex-wrap gap-2 overflow-visible p-0.5">
            {actions.map((action, index) => (
              <motion.button
                key={action.label || index}
                onPointerDown={(e) => e.stopPropagation()}
                whileTap={{ y: NOTIFICATION_ACTION_TAP_Y }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick?.();
                  if (action.dismiss) onDismiss();
                }}
                type="button"
                className="min-h-10 flex-1 border border-white/5 bg-white/5 px-3 text-sm font-semibold text-white transition-[background-color,border-color,color,box-shadow] duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-white/10 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/10 focus-visible:outline-none"
              >
                {action.label}
              </motion.button>
            ))}
          </div>
        ) : null}
      </motion.div>
    </section>
  );
}
