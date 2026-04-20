'use client';

import { useMemo } from 'react';

import { AnimatePresence } from 'framer-motion';

import { Z_INDEX } from '@/core/constants';
import { useNavHeight } from '@/core/modules/nav/hooks';

import { useNotificationActions, useNotificationState } from './context';
import { NotificationOverlay } from './overlay';

export function NotificationContainer() {
  const { notifications } = useNotificationState();
  const { dismissNotification } = useNotificationActions();
  const { navHeight } = useNavHeight();

  const sortedNotifications = useMemo(
    () => Object.entries(notifications).sort((a, b) => a[1].timestamp - b[1].timestamp),
    [notifications]
  );
  const resolvedBottomOffset = Math.max(4, Math.round((navHeight || 0) - 8));

  if (sortedNotifications.length === 0) return null;

  return (
    <div
      aria-atomic="true"
      aria-live="polite"
      className="pointer-events-none fixed right-2 bottom-0 left-2 flex flex-col gap-1 sm:right-auto sm:left-1/2 sm:w-[460px] sm:-translate-x-1/2"
      style={{ bottom: `${resolvedBottomOffset}px`, zIndex: Z_INDEX.NOTIFICATION }}
    >
      <AnimatePresence mode="popLayout">
        {sortedNotifications.map(([id, notification]) => (
          <NotificationOverlay key={id} notification={notification} onDismiss={() => dismissNotification(id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}
