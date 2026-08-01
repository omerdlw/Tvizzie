'use client';

import { useEffect, useRef, useState, memo, useCallback } from 'react';
import Link from 'next/link';
import { Container, CANCEL_BUTTON_CLASS, ACTION_BUTTON_CLASS } from '@/core/modules/modal';
import { useAuth, useAuthSessionReady } from '@/core/modules/auth';
import {
  NOTIFICATION_TYPES,
  deleteAllNotifications,
  deleteNotification,
  markAllAsRead,
  markAsRead,
  subscribeToNotifications,
} from '@/domains/social/server/notifications/notifications.service';
import { applyAvatarFallback, cn, getUserAvatarFallbackUrl, getUserAvatarUrl } from '@/shared/lib';
import AdaptiveImage from '@/ui/components/adaptive-image';
import { Button } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';
import { DESTRUCTIVE_ACTION_TONE_CLASS, INFO_ACTION_TONE_CLASS } from '@/shared/constants/index';

// --- CONSTANTS & HELPERS ---

const TOOL_BUTTON_CLASS = 'size-7 rounded-xl transition-colors duration-150 ease-in-out';
const SKELETON_COUNT = 16;

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

// --- SUB-COMPONENTS ---

const InlineEntity = memo(function InlineEntity({ href, children, muted = false }) {
  const className = muted ? 'font-semibold text-black/70' : 'font-semibold';
  return href ? (
    <Link href={href} className={className}>
      {children}
    </Link>
  ) : (
    <span className={className}>{children}</span>
  );
});

const NotificationContent = memo(function NotificationContent({ type, actor, payload }) {
  const actorName = actor?.displayName || actor?.username || 'Someone';
  const actorHref = actor?.username ? `/account/${actor.username}` : null;
  const subject = getNotificationSubject(payload, type);

  switch (type) {
    case NOTIFICATION_TYPES.FOLLOW_REQUEST:
      return (
        <p className="text-sm">
          <InlineEntity href={actorHref}>{actorName}</InlineEntity> requested to follow you
        </p>
      );
    case NOTIFICATION_TYPES.FOLLOW_ACCEPTED:
      return (
        <p className="text-sm">
          <InlineEntity href={actorHref}>{actorName}</InlineEntity> accepted your follow request
        </p>
      );
    case NOTIFICATION_TYPES.NEW_FOLLOWER:
      return (
        <p className="text-sm">
          <InlineEntity href={actorHref}>{actorName}</InlineEntity> started following you
        </p>
      );
    case NOTIFICATION_TYPES.REVIEW_LIKE:
      return (
        <p className="text-sm">
          <InlineEntity href={actorHref}>{actorName}</InlineEntity> liked your review of{' '}
          <InlineEntity href={subject?.href}>{subject?.title || 'a title'}</InlineEntity>
        </p>
      );
    case NOTIFICATION_TYPES.LIST_LIKE:
      return (
        <p className="text-sm">
          <InlineEntity href={actorHref}>{actorName}</InlineEntity> liked your list{' '}
          <InlineEntity href={subject?.href}>{subject?.title || 'a list'}</InlineEntity>
        </p>
      );
    case NOTIFICATION_TYPES.LIST_COMMENT:
      return (
        <p className="text-sm">
          <InlineEntity href={actorHref}>{actorName}</InlineEntity> commented on your list{' '}
          <InlineEntity href={subject?.href}>{subject?.title || 'a list'}</InlineEntity>
        </p>
      );
    default:
      return (
        <p className="text-sm text-black/70">
          <InlineEntity href={actorHref}>{actorName}</InlineEntity> interacted with you
        </p>
      );
  }
});

const NotificationRow = memo(function NotificationRow({ notification, onMarkRead, onDelete }) {
  const isUnread = !notification.read;

  return (
    <div
      className={cn(
        'grid w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 border-b border-black/10 p-3 transition-colors duration-150 ease-in-out last:border-none lg:p-4',
        isUnread ? 'bg-white' : 'hover:bg-white',
      )}
    >
      <div className="center size-10 shrink-0 overflow-hidden">
        {notification.actor ? (
          <AdaptiveImage
            mode="img"
            src={getUserAvatarUrl(notification.actor)}
            alt={notification.actor?.displayName || 'Avatar'}
            className="size-full rounded-xl object-cover"
            loading="lazy"
            decoding="async"
            onError={(event) =>
              applyAvatarFallback(event, getUserAvatarFallbackUrl(notification.actor))
            }
            wrapperClassName="size-full"
          />
        ) : (
          <Icon icon={getNotificationIcon(notification.type)} size={20} className="text-black/70" />
        )}
      </div>

      <div className="flex w-full flex-col">
        <NotificationContent
          type={notification.type}
          actor={notification.actor}
          payload={notification.payload}
        />
        <span className="text-[10px] tracking-widest text-black/50 uppercase">
          {formatRelativeTime(notification.createdAt)}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
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
    </div>
  );
});

function NotificationSkeleton() {
  return (
    <div className="flex items-center gap-3 border-b border-black/10 p-3 last:border-none lg:p-4">
      <div className="size-10 shrink-0 bg-black/5" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="h-3 w-3/5 bg-black/5" />
        <div className="h-2 w-2/5 bg-black/5" />
      </div>
    </div>
  );
}

// --- MAIN COMPONENT ---

export default function NotificationsModal({ close, header, data }) {
  const auth = useAuth();
  const userId = data?.userId || auth.user?.id || null;
  const isAuthSessionReady = useAuthSessionReady(auth.isAuthenticated ? userId : null);

  const [isLoading, setIsLoading] = useState(true);
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
      setIsLoading(false);
      return;
    }

    resetOptimisticState();
    setIsLoading(true);

    return subscribeToNotifications(
      userId,
      (nextNotifications) => {
        setNotifications(projectNotifications(nextNotifications));
        setIsLoading(false);
      },
      {
        onError: (error) => {
          console.error('[NotificationsModal] Subscription failed:', error);
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
      console.error(error);
    }
  };

  const handleMarkRead = useCallback(
    async (notificationId, event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      if (!userId || !notificationId) return;

      const previous = notifications;
      optimisticStateRef.current.forceReadIds.add(notificationId);
      setNotifications((curr) =>
        curr.map((item) => (item.id === notificationId ? { ...item, read: true } : item)),
      );

      try {
        await markAsRead(userId, notificationId);
      } catch (error) {
        optimisticStateRef.current.forceReadIds.delete(notificationId);
        setNotifications(previous);
        console.error(error);
      }
    },
    [userId, notifications],
  );

  const handleDelete = useCallback(
    async (notificationId, event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      if (!userId || !notificationId) return;

      const previous = notifications;
      optimisticStateRef.current.deletedIds.add(notificationId);
      setNotifications((curr) => curr.filter((item) => item.id !== notificationId));

      try {
        await deleteNotification(userId, notificationId);
      } catch (error) {
        optimisticStateRef.current.deletedIds.delete(notificationId);
        setNotifications(previous);
        console.error(error);
      }
    },
    [userId, notifications],
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
      console.error(error);
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
          <span className="text-xs opacity-70">
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
      <div className="min-h-0 overflow-y-auto">
        {isLoading ? (
          Array.from({ length: SKELETON_COUNT }, (_, index) => <NotificationSkeleton key={index} />)
        ) : notifications.length === 0 ? (
          <div className="center h-screen text-sm font-medium text-black/50">
            You have no notifications yet
          </div>
        ) : (
          notifications.map((notification, index) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              onMarkRead={handleMarkRead}
              onDelete={handleDelete}
              index={index}
            />
          ))
        )}
      </div>
    </Container>
  );
}
