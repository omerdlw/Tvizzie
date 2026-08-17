'use client';

import { motion } from 'framer-motion';

import { SEMANTIC_SURFACE_CLASSES } from '@/domains/shell/shared/constants';
import { cn, normalizeFeedbackText } from '@/domains/shell/shared/utils';
import Icon from '@/ui/primitives/icon';
import { getNavActionClass } from '@/domains/shell/navigation/action/constants';

import { NOTIFICATION_CONFIG } from './config';

export function NotificationOverlay({ notification, onDismiss }) {
  const config = {
    ...(NOTIFICATION_CONFIG[notification.type] || {}),
    ...notification,
  };

  const theme =
    config.theme ||
    SEMANTIC_SURFACE_CLASSES[config.tone] ||
    (typeof config.colorClass === 'object' ? config.colorClass : null) ||
    SEMANTIC_SURFACE_CLASSES.info;

  const dismissible = config.dismissible !== false;
  const explicitTitle = notification.title ? normalizeFeedbackText(notification.title) : '';
  const message = normalizeFeedbackText(notification.message);
  const description = normalizeFeedbackText(notification.description);
  const actions = Array.isArray(config.actions) ? config.actions.filter(Boolean) : [];
  const resolvedIcon = notification.icon || config.icon || null;

  let resolvedTitle = '';
  let resolvedDescription = '';

  if (explicitTitle) {
    resolvedTitle = explicitTitle;
    resolvedDescription = description || message || '';
  } else if (message && description) {
    resolvedTitle = message;
    resolvedDescription = description;
  } else if (message) {
    resolvedTitle = config.title || message;
    resolvedDescription = config.title ? message : '';
  } else if (description) {
    resolvedTitle = config.title || description;
    resolvedDescription = config.title ? description : '';
  } else {
    resolvedTitle = config.title || '';
    resolvedDescription = config.description || '';
  }

  if (resolvedTitle === resolvedDescription) {
    resolvedDescription = '';
  }

  if (!resolvedTitle && !resolvedDescription) {
    return null;
  }

  return (
    <section
      role="alert"
      aria-atomic="true"
      className={cn(
        'pointer-events-auto relative w-full overflow-hidden border border-white/10 bg-black/70 p-2 shadow-[0_18px_56px_rgba(0,0,0,0.40)] backdrop-blur-lg transition-all duration-300 ease-in-out',
        dismissible && 'touch-pan-y',
        theme.surface,
      )}
    >
      <div className="relative flex h-auto w-full flex-col gap-0">
        <div className={cn('relative flex w-full items-center space-x-3', dismissible && 'pr-9')}>
          {resolvedIcon ? (
            <div className="center relative shrink-0">
              <div className={cn('center size-12 shrink-0 border border-transparent', theme.icon)}>
                {typeof resolvedIcon === 'string' ? (
                  <Icon icon={resolvedIcon} size={24} />
                ) : (
                  resolvedIcon
                )}
              </div>
            </div>
          ) : (
            <div className="size-12 shrink-0" />
          )}

          <div className="relative flex min-w-0 flex-1 flex-col justify-center -space-y-0.5 overflow-hidden">
            {resolvedTitle ? (
              <div className="relative overflow-hidden">
                <h3 className={cn('truncate text-[16px] font-bold', theme.title)}>
                  {resolvedTitle}
                </h3>
              </div>
            ) : null}

            {resolvedDescription ? (
              <div className="relative min-h-[1.25rem] w-full overflow-hidden text-sm">
                <p className={cn('text-sm wrap-break-word whitespace-normal', theme.description)}>
                  {resolvedDescription}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {dismissible ? (
          <motion.button
            type="button"
            aria-label="Bildirimi kapat"
            whileTap={{ scale: 0.92 }}
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className="center absolute top-2 right-2 z-10 size-8 cursor-pointer border border-white/5 bg-white/5 text-white/70 transition-all duration-300 ease-in-out hover:border-transparent hover:bg-white hover:text-black focus-visible:ring-2 focus-visible:ring-white/10 focus-visible:outline-none"
          >
            <Icon icon="material-symbols:close-rounded" size={16} />
          </motion.button>
        ) : null}

        {actions.length > 0 ? (
          <div className="mt-2.5 flex w-full flex-wrap items-center gap-2">
            {actions.map((action, index) => (
              <motion.button
                key={action.label || index}
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                whileTap={{ y: 1 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick?.();
                  if (action.dismiss !== false) onDismiss();
                }}
                className={getNavActionClass({
                  isActive: false,
                  className: action.className || config.actionToneClass,
                })}
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
