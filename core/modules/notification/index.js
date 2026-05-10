'use client';

import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';

import { Z_INDEX } from '@/core/constants';
import { NOTIFICATION_STACK_MOTION, getNotificationItemMotion } from '@/core/modules/motion';
import { useNavigationState } from '@/core/modules/nav/context';
import { getNotificationBottomOffset } from '@/core/modules/nav/layout';

import { useNotificationActions, useNotificationState } from './context';
import { NotificationOverlay } from './overlay';

function sortNotificationsByTimestamp(notifications = {}) {
  return Object.entries(notifications).sort((a, b) => a[1].timestamp - b[1].timestamp);
}

function shouldAlignNotificationsToNav(pathname = '/', isSurfaceOpen = false) {
  if (pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up')) {
    return Boolean(isSurfaceOpen);
  }

  return true;
}

export function NotificationContainer() {
  const pathname = usePathname();
  const { navHeight, isSurfaceOpen } = useNavigationState();
  const { notifications } = useNotificationState();
  const { dismissNotification } = useNotificationActions();

  const sortedNotifications = useMemo(() => sortNotificationsByTimestamp(notifications), [notifications]);
  const resolvedBottomOffset = getNotificationBottomOffset(navHeight, {
    alignToNav: shouldAlignNotificationsToNav(pathname, isSurfaceOpen),
  });

  if (sortedNotifications.length === 0) return null;

  return (
    <motion.div
      aria-atomic="true"
      aria-live="polite"
      className="pointer-events-none fixed right-2 bottom-0 left-2 flex flex-col gap-1 sm:right-auto sm:left-1/2 sm:w-[460px] sm:-translate-x-1/2"
      style={{ bottom: `${resolvedBottomOffset}px`, zIndex: Z_INDEX.NOTIFICATION }}
      {...NOTIFICATION_STACK_MOTION}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {sortedNotifications.map(([id, notification], index) => (
          <motion.div key={id} {...getNotificationItemMotion(index)}>
            <NotificationOverlay notification={notification} onDismiss={() => dismissNotification(id)} />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
