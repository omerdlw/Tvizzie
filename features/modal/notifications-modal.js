'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import Container from '@/core/modules/modal/container';
import { useAuth, useAuthSessionReady } from '@/core/modules/auth';
import {
  NOTIFICATION_TYPES,
  deleteNotification,
  markAllAsRead,
  markAsRead,
  subscribeToNotifications,
} from '@/core/services/notifications/notifications.service';
import { applyAvatarFallback, cn, getUserAvatarFallbackUrl, getUserAvatarUrl } from '@/core/utils';
import { Button } from '@/ui/elements';
import Icon from '@/ui/icon';
import { Spinner } from '@/ui/loadings/spinner';

function formatRelativeTime(dateValue) {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
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
    default:
      return 'solar:bell-bold';
  }
}

function getNotificationContent({ type, actor, payload }) {
  const actorName = actor?.displayName || actor?.username || 'Someone';
  const actorLink = actor?.username ? `/account/${actor.username}` : null;
  const reviewSubject =
    payload?.subject && typeof payload.subject === 'object'
      ? payload.subject
      : {
          href: payload?.subjectHref || null,
          title: payload?.subjectTitle || null,
        };
  const listSubject =
    payload?.list && typeof payload.list === 'object'
      ? payload.list
      : {
          href: payload?.listHref || null,
          title: payload?.listTitle || null,
        };

  const ActorComponent = ({ children }) =>
    actorLink ? (
      <Link href={actorLink} className="font-semibold text-[#0f172a]">
        {children}
      </Link>
    ) : (
      <span className="font-semibold text-[#0f172a]">{children}</span>
    );

  switch (type) {
    case NOTIFICATION_TYPES.FOLLOW_REQUEST:
      return (
        <span className="text-sm text-black/70">
          <ActorComponent>{actorName}</ActorComponent> requested to follow you.
        </span>
      );
    case NOTIFICATION_TYPES.FOLLOW_ACCEPTED:
      return (
        <span className="text-sm text-black/70">
          <ActorComponent>{actorName}</ActorComponent> accepted your follow request.
        </span>
      );
    case NOTIFICATION_TYPES.NEW_FOLLOWER:
      return (
        <span className="text-sm text-black/70">
          <ActorComponent>{actorName}</ActorComponent> started following you.
        </span>
      );
    case NOTIFICATION_TYPES.REVIEW_LIKE:
      return (
        <span className="text-sm text-black/70">
          <ActorComponent>{actorName}</ActorComponent> liked your review of{' '}
          {reviewSubject?.href ? (
            <Link href={reviewSubject.href} className="font-semibold text-[#0f172a]">
              {reviewSubject.title || 'a title'}
            </Link>
          ) : (
            <span className="font-semibold text-[#0f172a]">{reviewSubject?.title || 'a title'}</span>
          )}
          .
        </span>
      );
    case NOTIFICATION_TYPES.LIST_LIKE:
      return (
        <span className="text-sm text-black/70">
          <ActorComponent>{actorName}</ActorComponent> liked your list{' '}
          {listSubject?.href ? (
            <Link href={listSubject.href} className="font-semibold text-[#0f172a]">
              {listSubject.title || 'a list'}
            </Link>
          ) : (
            <span className="font-semibold text-[#0f172a]">{listSubject?.title || 'a list'}</span>
          )}
          .
        </span>
      );
    default:
      return (
        <span className="text-sm text-black/70">
          <ActorComponent>{actorName}</ActorComponent> interacted with you.
        </span>
      );
  }
}

export default function NotificationsModal({ close, header, data }) {
  const auth = useAuth();
  const isAuthSessionReady = useAuthSessionReady(auth.isAuthenticated ? auth.user?.id || null : null);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const isSidePosition = header?.position === 'left' || header?.position === 'right';

  const userId = useMemo(() => data?.userId || auth.user?.id || null, [auth.user?.id, data?.userId]);

  useEffect(() => {
    if (!auth.isReady || !isAuthSessionReady || !auth.isAuthenticated || !userId) {
      setNotifications([]);
      setIsLoading(false);
      return undefined;
    }

    setIsLoading(true);

    return subscribeToNotifications(
      userId,
      (nextNotifications) => {
        setNotifications(nextNotifications);
        setIsLoading(false);
      },
      {
        onError: (error) => {
          console.error('[NotificationsModal] Subscription failed:', error);
          setIsLoading(false);
        },
      }
    );
  }, [auth.isAuthenticated, auth.isReady, isAuthSessionReady, userId]);

  const hasUnread = notifications.some((item) => !item.read);

  const handleMarkAllRead = async () => {
    if (!hasUnread) return;
    if (!userId) return;

    const previous = notifications;
    setNotifications((current) =>
      current.map((item) => ({
        ...item,
        read: true,
      }))
    );
    try {
      await markAllAsRead(userId);
    } catch (error) {
      setNotifications(previous);
      console.error(error);
    }
  };

  const handleMarkRead = async (notificationId, event) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (!notificationId) return;
    if (!userId) return;

    const previous = notifications;
    setNotifications((current) => current.map((item) => (item.id === notificationId ? { ...item, read: true } : item)));

    try {
      await markAsRead(userId, notificationId);
    } catch (error) {
      setNotifications(previous);
      console.error(error);
    }
  };

  const handleDelete = async (notificationId, event) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (!notificationId) return;
    if (!userId) return;

    try {
      await deleteNotification(userId, notificationId);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Container
      className={
        isSidePosition ? 'h-full max-h-full w-full sm:w-[460px]' : 'max-h-[78dvh] w-full sm:w-[min(1400px,96vw)]'
      }
      close={close}
      header={header}
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto">
          {notifications.length > 0 && hasUnread ? (
            <Button
              onClick={handleMarkAllRead}
              className="w-full border-b border-dashed border-[#ca8a04] bg-[#fef08a] p-4 text-sm text-[#713f12]"
            >
              Mark all as read
            </Button>
          ) : null}
          {isLoading ? (
            <div className={cn('center h-14 w-full border-b border-[#f59e0b]')}>
              <Spinner size={30} />
            </div>
          ) : notifications.length === 0 ? (
            <div className={cn('center h-14 w-full border-b border-[#f59e0b] text-sm text-black/70')}>
              You have no notifications yet
            </div>
          ) : (
            <div className="flex min-h-0 flex-col">
              {notifications.map((notification) => {
                const actorAvatarSrc = notification.actor ? getUserAvatarUrl(notification.actor) : '';
                const actorAvatarFallbackSrc = notification.actor ? getUserAvatarFallbackUrl(notification.actor) : '';

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      'relative grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-2 border-b border-[#f59e0b] p-2 transition last:border-none',
                      !notification.read && 'border border-[#0ea5e9] bg-[#bfdbfe] text-[#0c4a6e]'
                    )}
                  >
                    <div className="center size-10 shrink-0 overflow-hidden">
                      {notification.actor ? (
                        <img
                          src={actorAvatarSrc}
                          alt={notification.actor?.displayName || 'Avatar'}
                          className="size-full object-cover"
                          loading="lazy"
                          onError={(event) => applyAvatarFallback(event, actorAvatarFallbackSrc)}
                        />
                      ) : (
                        <Icon icon={getNotificationIcon(notification.type)} size={20} className="text-[#7c2d12]" />
                      )}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      {getNotificationContent(notification)}
                      <span className="text-[10px] tracking-widest text-black/70 uppercase">
                        {formatRelativeTime(notification.createdAt)}
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5 self-center">
                      {!notification.read ? (
                        <Button
                          variant="info-icon"
                          onClick={(event) => handleMarkRead(notification.id, event)}
                          title="Mark as read"
                          className="size-7"
                        >
                          <Icon icon="solar:check-read-bold" size={16} />
                        </Button>
                      ) : null}
                      <Button
                        variant="destructive-icon"
                        onClick={(event) => handleDelete(notification.id, event)}
                        title="Delete notification"
                        className="size-7"
                      >
                        <Icon icon="solar:trash-bin-trash-linear" size={16} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}
