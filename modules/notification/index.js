'use client';

// Public notification interface. State and toast policy stay behind focused
// internal seams while the visual notification surface remains here, matching
// the module's single entry-point composition model.
export {
  CRITICAL_TYPES,
  NOTIFICATION_CONFIG,
  NotificationProvider,
  TOAST_TYPES,
  getStorageItem,
  removeStorageItem,
  setStorageItem,
  useNotificationActions,
  useNotificationState,
} from './store';

export {
  NOTIFICATION_ACTION_TAP,
  NOTIFICATION_ACTION_TRANSITION,
  NOTIFICATION_CLOSE_TAP,
  NOTIFICATION_CONTENT_VARIANTS,
  NOTIFICATION_DRAG_CONSTRAINTS,
  NOTIFICATION_DRAG_ELASTIC,
  NOTIFICATION_MICRO_SPRING,
  NOTIFICATION_MICRO_TAP_SCALE,
  NOTIFICATION_WHILE_DRAG,
  TOAST_VARIANTS,
  notificationContentVariants,
  toastVariants,
} from './motion';

export { useToast } from './toast';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';

import {
  EVENT_TYPES,
  globalEvents,
  normalizeFeedbackText,
  SEMANTIC_SURFACE_CLASSES,
  Z_INDEX,
} from '@/shared';
import { cn } from '@/ui/class-names';
import Icon from '@/ui/primitives/icon';
import { Button } from '@/ui/primitives';

import {
  CRITICAL_TYPES,
  NOTIFICATION_CONFIG,
  useNotificationActions,
  useNotificationState,
} from './store';
import {
  NOTIFICATION_DRAG_CONSTRAINTS,
  NOTIFICATION_DRAG_ELASTIC,
  NOTIFICATION_WHILE_DRAG,
  toastVariants,
} from './motion';

// -----------------------------------------------------------------------------
// Notification presentation
// -----------------------------------------------------------------------------
// The overlay owns only normalization needed by the view. State transitions
// remain in the store and toast policy remains in toast.js.
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

  const hasAutoDismiss = Boolean(notification.duration && Number(notification.duration) > 0);
  const dismissible = config.dismissible !== false;
  const showCloseButton = dismissible && !hasAutoDismiss;
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

  if (!resolvedTitle && !resolvedDescription) return null;

  return (
    <section
      role="alert"
      aria-atomic="true"
      className={cn(
        'pointer-events-auto relative w-full overflow-hidden rounded-[30px] bg-black/80 p-2.5 ring-1 ring-white/10 backdrop-blur-lg transition-all duration-300 ease-in-out ring-inset',
        theme.surface,
      )}
    >
      <div className="relative flex h-auto w-full flex-col gap-2.5">
        <div className={cn('relative flex w-full items-center gap-2.5', showCloseButton && 'pr-9')}>
          {resolvedIcon ? (
            <div className="center relative shrink-0">
              <div
                className={cn(
                  'center size-12 shrink-0 rounded-[20px] ring-1 ring-transparent ring-inset',
                  theme.icon,
                )}
              >
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
                <h3 className={cn('truncate text-base font-bold', theme.title)}>{resolvedTitle}</h3>
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

        {showCloseButton ? (
          <Button
            type="button"
            aria-label="Bildirimi kapat"
            onClick={(event) => {
              event.stopPropagation();
              onDismiss();
            }}
            className="center absolute top-2.5 right-2.5 z-10 size-8 cursor-pointer rounded-[20px] bg-white/5 text-white/70 ring-1 ring-white/5 ring-inset hover:bg-white hover:text-black hover:ring-transparent focus-visible:ring-2 focus-visible:ring-white/10 focus-visible:outline-none"
          >
            <Icon icon="material-symbols:close-rounded" size={16} />
          </Button>
        ) : null}

        {actions.length > 0 ? (
          <div className="flex w-full flex-wrap items-center gap-2.5">
            {actions.map((action, index) => (
              <Button
                key={action.label || index}
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  action.onClick?.();
                  if (action.dismiss !== false) onDismiss();
                }}
                className={cn(
                  'center w-full cursor-pointer gap-2.5 rounded-[20px] bg-white/5 px-4 py-2.5 text-xs font-semibold text-white/70 uppercase ring-1 ring-white/5 ring-inset hover:bg-white/10',
                  action.className || config.actionToneClass,
                )}
              >
                {action.label}
              </Button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function sortNotificationsByTimestamp(notifications = {}) {
  return Object.entries(notifications).sort(([, first], [, second]) => {
    return first.timestamp - second.timestamp;
  });
}

// -----------------------------------------------------------------------------
// Portal container
// -----------------------------------------------------------------------------
// The portal target is resolved after mount so server rendering never reads
// document and the notification layer stays outside page stacking contexts.
export function NotificationContainer() {
  const { notifications } = useNotificationState();
  const { dismissNotification } = useNotificationActions();
  const [portalTarget, setPortalTarget] = useState(null);

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  const sortedNotifications = useMemo(
    () => sortNotificationsByTimestamp(notifications),
    [notifications],
  );

  const notificationContent = (
    <div
      aria-atomic="true"
      aria-live="polite"
      className="pointer-events-none fixed top-4 right-0 left-0 mx-auto flex w-full max-w-[380px] flex-col gap-2.5 overflow-visible p-1 px-4 sm:right-4 sm:left-auto sm:mx-0 sm:max-w-[420px] sm:px-0"
      style={{ zIndex: Z_INDEX.NOTIFICATION }}
    >
      <AnimatePresence initial={false}>
        {sortedNotifications.map(([id, notification]) => {
          const hasAutoDismiss = Boolean(
            notification.duration && Number(notification.duration) > 0,
          );
          const isDismissible = notification.dismissible !== false;
          const isSwipeable = isDismissible && hasAutoDismiss;

          return (
            <motion.div
              key={id}
              layout
              variants={toastVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              drag={isSwipeable ? 'x' : false}
              dragDirectionLock
              dragConstraints={NOTIFICATION_DRAG_CONSTRAINTS}
              dragElastic={NOTIFICATION_DRAG_ELASTIC}
              onDragEnd={(_event, info) => {
                if (isSwipeable && (info.offset.x > 80 || info.velocity.x > 300)) {
                  dismissNotification(id);
                }
              }}
              whileDrag={NOTIFICATION_WHILE_DRAG}
              className={cn(
                'pointer-events-auto w-full',
                isSwipeable && 'cursor-grab touch-pan-y active:cursor-grabbing',
              )}
            >
              <NotificationOverlay
                notification={notification}
                onDismiss={() => dismissNotification(id)}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );

  return portalTarget ? createPortal(notificationContent, portalTarget) : null;
}

// -----------------------------------------------------------------------------
// Application event bridges
// -----------------------------------------------------------------------------
const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please sign in again.';

export function NotificationListener() {
  const { showNotification } = useNotificationActions();

  useEffect(() => {
    const unsubscribe = globalEvents.subscribe(EVENT_TYPES.API_UNAUTHORIZED, (data) => {
      if (data?.source && data.source !== 'app') return;

      showNotification(CRITICAL_TYPES.SESSION_EXPIRED, {
        message: SESSION_EXPIRED_MESSAGE,
      });
    });

    return unsubscribe;
  }, [showNotification]);

  return null;
}

// Kept as a public no-op compatibility hook for feature layouts that already
// mount it; badge behavior can be added without changing their composition.
export function NotificationBadgeListener() {
  return null;
}
