'use client';

import { useEffect, useRef, useState, memo, useCallback } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Container, CANCEL_BUTTON_CLASS, ACTION_BUTTON_CLASS } from '@/modules/modal';
import { MODAL_LIST_ITEM_VARIANTS, MODAL_LIST_VARIANTS } from '@/modules/modal';
import { useAuth, useAuthSessionReady } from '@/modules/auth';
import { useToast } from '@/modules/notification';
import {
  NOTIFICATION_TYPES,
  deleteAllNotifications,
  deleteNotification,
  markAllAsRead,
  markAsRead,
  subscribeToNotifications,
} from '@/domains/social/client/notifications';
import {
  applyAvatarFallback,
  getUserAvatarFallbackUrl,
  getUserAvatarUrl,
} from '@/domains/account/utils/avatar';
import { cn } from '@/ui/class-names';
import AdaptiveImage from '@/ui/components/adaptive-image';
import { Button } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';
import { DESTRUCTIVE_ACTION_TONE_CLASS, INFO_ACTION_TONE_CLASS } from '@/shared';
import { NotificationListSkeleton } from '@/domains/shell/ui/skeletons';

const TOOL_BUTTON_CLASS = 'size-7 center rounded-lg cursor-pointer transition-all duration-300 ease-in-out';

function formatRelativeTime(dateValue) {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';

  const diffInSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}

function getNotificationIcon(type) {
  switch (type) {
    case NOTIFICATION_TYPES.FOLLOW_REQUEST:
    case NOTIFICATION_TYPES.FOLLOW_ACCEPTED:
    case NOTIFICATION_TYPES.NEW_FOLLOWER:
      return 'solar:user-plus-bold';
    case NOTIFICATION_TYPES.REVIEW_LIKE:
    case NOTIFICATION_TYPES.LIST_LIKE:
      return 'solar:heart-bold';
    case NOTIFICATION_TYPES.LIST_COMMENT:
      return 'solar:chat-round-bold';
    default:
      return 'solar:bell-bold';
  }
}

function getNotificationSubject(payload, type) {
  if (type === NOTIFICATION_TYPES.REVIEW_LIKE) {
    return payload?.subject && typeof payload.subject === 'object'
      ? payload.subject
      : { href: payload?.subjectHref || null, title: payload?.subjectTitle || null };
  }
  if (type === NOTIFICATION_TYPES.LIST_LIKE || type === NOTIFICATION_TYPES.LIST_COMMENT) {
    if (payload?.list && typeof payload.list === 'object') return payload.list;
    if (payload?.subject && typeof payload.subject === 'object') return payload.subject;
    return {
      href: payload?.listHref || payload?.subjectHref || null,
      title: payload?.listTitle || payload?.subjectTitle || null,
    };
  }
  return null;
}

const InlineEntity = memo(function InlineEntity({ href, children, muted = false, onClick }) {
  const className = muted ? 'font-semibold text-white/70' : 'font-semibold';
  return href ? (
    <Link href={href} onClick={onClick} className={className}>
      {children}
    </Link>
  ) : (
    <span className={className}>{children}</span>
  );
});

const NotificationContent = memo(function NotificationContent({
  type,
  actor,
  payload,
  onLinkClick,
}) {
  const actorName = actor?.displayName || actor?.username || 'Someone';
  const actorHref = actor?.username ? `/account/${actor.username}` : null;
  const subject = getNotificationSubject(payload, type);

  switch (type) {
    case NOTIFICATION_TYPES.FOLLOW_REQUEST:
      return (
        <p className="text-sm">
          <InlineEntity href={actorHref} onClick={onLinkClick}>
            {actorName}
          </InlineEntity>{' '}
          requested to follow you
        </p>
      );
    case NOTIFICATION_TYPES.FOLLOW_ACCEPTED:
      return (
        <p className="text-sm">
          <InlineEntity href={actorHref} onClick={onLinkClick}>
            {actorName}
          </InlineEntity>{' '}
          accepted your follow request
        </p>
      );
    case NOTIFICATION_TYPES.NEW_FOLLOWER:
      return (
        <p className="text-sm">
          <InlineEntity href={actorHref} onClick={onLinkClick}>
            {actorName}
          </InlineEntity>{' '}
          started following you
        </p>
      );
    case NOTIFICATION_TYPES.REVIEW_LIKE:
      return (
        <p className="text-sm">
          <InlineEntity href={actorHref} onClick={onLinkClick}>
            {actorName}
          </InlineEntity>{' '}
          liked your review of{' '}
          <InlineEntity href={subject?.href} onClick={onLinkClick}>
            {subject?.title || 'a title'}
          </InlineEntity>
        </p>
      );
    case NOTIFICATION_TYPES.LIST_LIKE:
      return (
        <p className="text-sm">
          <InlineEntity href={actorHref} onClick={onLinkClick}>
            {actorName}
          </InlineEntity>{' '}
          liked your list{' '}
          <InlineEntity href={subject?.href} onClick={onLinkClick}>
            {subject?.title || 'a list'}
          </InlineEntity>
        </p>
      );
    case NOTIFICATION_TYPES.LIST_COMMENT:
      return (
        <p className="text-sm">
          <InlineEntity href={actorHref} onClick={onLinkClick}>
            {actorName}
          </InlineEntity>{' '}
          commented on your list{' '}
          <InlineEntity href={subject?.href} onClick={onLinkClick}>
            {subject?.title || 'a list'}
          </InlineEntity>
        </p>
      );
    default:
      return (
        <p className="text-sm text-white/70">
          <InlineEntity href={actorHref} onClick={onLinkClick}>
            {actorName}
          </InlineEntity>{' '}
          interacted with you
        </p>
      );
  }
});

const NotificationRow = memo(function NotificationRow({
  notification,
  onMarkRead,
  onDelete,
  onLinkClick,
  index,
}) {
  const isUnread = !notification.read;
  const actorHref = notification.actor?.username ? `/account/${notification.actor.username}` : null;

  return (
    <motion.div
      variants={MODAL_LIST_ITEM_VARIANTS}
      custom={index}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={cn(
        'grid w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-white/10 p-3 last:ring-0 lg:p-4',
        isUnread ? 'bg-black' : 'hover:bg-black',
      )}
    >
      <div className="center size-10 shrink-0 overflow-hidden rounded-[14px] ring-1 ring-inset ring-white/5 bg-white/5">
        {notification.actor ? (
          actorHref ? (
            <Link href={actorHref} onClick={onLinkClick} className="size-full">
              <AdaptiveImage
                mode="img"
                src={getUserAvatarUrl(notification.actor)}
                alt={notification.actor?.displayName || 'Avatar'}
                className="size-full object-cover"
                loading="lazy"
                decoding="async"
                onError={(event) =>
                  applyAvatarFallback(event, getUserAvatarFallbackUrl(notification.actor))
                }
                wrapperClassName="size-full"
              />
            </Link>
          ) : (
            <AdaptiveImage
              mode="img"
              src={getUserAvatarUrl(notification.actor)}
              alt={notification.actor?.displayName || 'Avatar'}
              className="size-full object-cover"
              loading="lazy"
              decoding="async"
              onError={(event) =>
                applyAvatarFallback(event, getUserAvatarFallbackUrl(notification.actor))
              }
              wrapperClassName="size-full"
            />
          )
        ) : (
          <Icon icon={getNotificationIcon(notification.type)} size={20} className="text-white/70" />
        )}
      </div>

      <div className="flex w-full flex-col">
        <NotificationContent
          type={notification.type}
          actor={notification.actor}
          payload={notification.payload}
          onLinkClick={onLinkClick}
        />
        <span className="text-xs text-white/40 uppercase">
          {formatRelativeTime(notification.createdAt)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {isUnread && (
          <Button
            onClick={(event) => onMarkRead(notification.id, event)}
            title="Mark as read"
            className={cn(TOOL_BUTTON_CLASS, INFO_ACTION_TONE_CLASS)}
          >
            <Icon icon="material-symbols:check-rounded" size={16} />
          </Button>
        )}

        <Button
          onClick={(event) => onDelete(notification.id, event)}
          title="Delete notification"
          className={cn(TOOL_BUTTON_CLASS, DESTRUCTIVE_ACTION_TONE_CLASS)}
        >
          <Icon icon="solar:trash-bin-trash-linear" size={16} />
        </Button>
      </div>
    </motion.div>
  );
});

export default function NotificationsModal({ close, header, data }) {
  const auth = useAuth();
  const toast = useToast();
  const userId = data?.userId || auth.user?.id || null;
  const isAuthSessionReady = useAuthSessionReady(auth.isAuthenticated ? userId : null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const optimisticStateRef = useRef({ deletedIds: new Set(), forceReadIds: new Set() });

  const isSidePosition = header?.position === 'left' || header?.position === 'right';
  const unreadCount = notifications.filter((item) => !item.read).length;
  const hasUnread = unreadCount > 0;

  useEffect(() => {
    const resetOptimisticState = () => {
      optimisticStateRef.current = { deletedIds: new Set(), forceReadIds: new Set() };
    };

    const projectNotifications = (nextNotifications = []) => {
      const { deletedIds, forceReadIds } = optimisticStateRef.current;
      return (Array.isArray(nextNotifications) ? nextNotifications : [])
        .filter((item) => item?.id && !deletedIds.has(item.id))
        .map((item) => (forceReadIds.has(item.id) ? { ...item, read: true } : item));
    };

    if (!auth.isReady || !auth.isAuthenticated || !isAuthSessionReady || !userId) {
      resetOptimisticState();
      setNotifications([]);
      setLoadError(null);
      setIsLoading(false);
      return;
    }

    resetOptimisticState();
    setLoadError(null);
    setIsLoading(true);

    return subscribeToNotifications(
      userId,
      (nextNotifications) => {
        setNotifications(projectNotifications(nextNotifications));
        setLoadError(null);
        setIsLoading(false);
      },
      {
        onError: (error) => {
          setLoadError(error);
          setIsLoading(false);
        },
      },
    );
  }, [auth.isReady, auth.isAuthenticated, isAuthSessionReady, userId]);

  const handleMarkAllRead = async () => {
    if (!userId || !hasUnread) return;
    const previous = notifications;
    const unreadIds = notifications.filter((item) => !item.read).map((item) => item.id);

    unreadIds.forEach((id) => optimisticStateRef.current.forceReadIds.add(id));
    setNotifications((curr) => curr.map((item) => ({ ...item, read: true })));

    try {
      await markAllAsRead(userId);
    } catch (error) {
      unreadIds.forEach((id) => optimisticStateRef.current.forceReadIds.delete(id));
      setNotifications(previous);
      toast.error(error?.message || 'Notifications could not be updated');
    }
  };

  const notificationsRef = useRef(notifications);
  notificationsRef.current = notifications;

  const handleMarkRead = useCallback(
    async (notificationId, event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      if (!userId || !notificationId) return;

      optimisticStateRef.current.forceReadIds.add(notificationId);
      setNotifications((curr) =>
        curr.map((item) => (item.id === notificationId ? { ...item, read: true } : item)),
      );

      try {
        await markAsRead(userId, notificationId);
      } catch (error) {
        optimisticStateRef.current.forceReadIds.delete(notificationId);
        setNotifications((curr) =>
          curr.map((item) => (item.id === notificationId ? { ...item, read: false } : item)),
        );
        toast.error(error?.message || 'Notification could not be updated');
      }
    },
    [toast, userId],
  );

  const handleDelete = useCallback(
    async (notificationId, event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      if (!userId || !notificationId) return;

      const itemToDelete = notificationsRef.current.find((item) => item.id === notificationId);
      optimisticStateRef.current.deletedIds.add(notificationId);
      setNotifications((curr) => curr.filter((item) => item.id !== notificationId));

      try {
        await deleteNotification(userId, notificationId);
      } catch (error) {
        optimisticStateRef.current.deletedIds.delete(notificationId);
        if (itemToDelete) {
          setNotifications((curr) => {
            if (curr.some((item) => item.id === notificationId)) return curr;
            return [...curr, itemToDelete];
          });
        }
        toast.error(error?.message || 'Notification could not be deleted');
      }
    },
    [toast, userId],
  );

  const handleDeleteAll = async () => {
    if (!userId || notifications.length === 0) return;
    const previous = notifications;
    const ids = notifications.map((item) => item.id);

    ids.forEach((id) => optimisticStateRef.current.deletedIds.add(id));
    setNotifications([]);

    try {
      await deleteAllNotifications(userId);
    } catch (error) {
      ids.forEach((id) => optimisticStateRef.current.deletedIds.delete(id));
      setNotifications(previous);
      toast.error(error?.message || 'Notifications could not be deleted');
    }
  };

  return (
    <Container
      className={
        isSidePosition
          ? 'h-full max-h-full w-full sm:w-[460px]'
          : 'max-h-[78dvh] w-full sm:w-[min(1400px,96vw)]'
      }
      close={close}
      header={header}
      bodyClassName="p-0"
      footer={{
        left: (
          <span className="text-xs text-white/70">
            {hasUnread ? `${unreadCount} unread` : `${notifications.length} notifications`}
          </span>
        ),
        right:
          notifications.length > 0 ? (
            <>
              <Button type="button" onClick={handleDeleteAll} className={CANCEL_BUTTON_CLASS}>
                Clear all
              </Button>
              {hasUnread && (
                <Button type="button" onClick={handleMarkAllRead} className={ACTION_BUTTON_CLASS}>
                  Mark all as read
                </Button>
              )}
            </>
          ) : null,
      }}
    >
      <div className="min-h-0 overflow-y-auto rounded-[20px]">
        <AnimatePresence mode="wait" initial={false}>
          {isLoading ? (
            <motion.div
              key="loading"
              variants={MODAL_LIST_VARIANTS}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <NotificationListSkeleton />
            </motion.div>
          ) : loadError ? (
            <motion.div
              key="error"
              variants={MODAL_LIST_VARIANTS}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="center h-52 px-6 text-center text-sm font-medium text-white/40"
            >
              Notifications could not be loaded. Please try again.
            </motion.div>
          ) : notifications.length === 0 ? (
            <motion.div
              key="empty"
              variants={MODAL_LIST_VARIANTS}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="center h-screen text-sm font-medium text-white/40"
            >
              You have no notifications yet
            </motion.div>
          ) : (
            <motion.div
              key="notifications"
              variants={MODAL_LIST_VARIANTS}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <AnimatePresence initial={false}>
                {notifications.map((notification, index) => (
                  <NotificationRow
                    key={notification.id}
                    notification={notification}
                    onMarkRead={handleMarkRead}
                    onDelete={handleDelete}
                    onLinkClick={close}
                    index={index}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Container>
  );
}
