'use client';

import { useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';

import { motion, AnimatePresence } from 'framer-motion';

import { Z_INDEX } from '@/shared/constants';
import { EVENT_TYPES, globalEvents } from '@/shared/constants/events';

import { CRITICAL_TYPES, useNotificationActions, useNotificationState } from './context';
import { NotificationOverlay } from './overlay';
import { toastVariants } from './motion';

export {
  CRITICAL_TYPES,
  NotificationProvider,
  TOAST_TYPES,
  useNotificationActions,
  useNotificationState,
} from './context';
export { useToast } from './hooks';

function sortNotificationsByTimestamp(notifications = {}) {
  return Object.entries(notifications).sort((a, b) => a[1].timestamp - b[1].timestamp);
}

export function NotificationContainer() {
  const { notifications } = useNotificationState();
  const { dismissNotification } = useNotificationActions();

  const sortedNotifications = useMemo(
    () => sortNotificationsByTimestamp(notifications),
    [notifications],
  );

  return (
    <div
      aria-atomic="true"
      aria-live="polite"
      className="pointer-events-none fixed top-4 right-0 left-0 mx-auto flex w-full max-w-[380px] flex-col gap-2 overflow-visible p-1 px-4 sm:right-4 sm:left-auto sm:mx-0 sm:px-0"
      style={{ zIndex: Z_INDEX.NOTIFICATION }}
    >
      <AnimatePresence initial={false}>
        {sortedNotifications.map(([id, notification]) => (
          <motion.div
            key={id}
            variants={toastVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <NotificationOverlay
              notification={notification}
              onDismiss={() => dismissNotification(id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

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

export function NotificationBadgeListener() {
  return null;
}
