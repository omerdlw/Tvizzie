'use client';

import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';

import { Z_INDEX } from '@/core/constants';
import { NOTIFICATION_STACK_MOTION, getNotificationItemMotion } from '@/core/modules/motion';

import { useNotificationActions, useNotificationState } from './context';
import { NotificationOverlay } from './overlay';

function sortNotificationsByTimestamp(notifications = {}) {
  return Object.entries(notifications).sort((a, b) => a[1].timestamp - b[1].timestamp);
}

export function NotificationContainer() {
  const { notifications } = useNotificationState();
  const { dismissNotification } = useNotificationActions();

  const sortedNotifications = useMemo(() => sortNotificationsByTimestamp(notifications), [notifications]);

  if (sortedNotifications.length === 0) return null;

  return (
    <motion.div
      aria-atomic="true"
      aria-live="polite"
      className="pointer-events-none fixed top-4 right-4 flex flex-col gap-2 w-full max-w-[380px]"
      style={{ zIndex: Z_INDEX.NOTIFICATION }}
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
