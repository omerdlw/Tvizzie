'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

import Container from '@/core/modules/modal/container';
import { useAuth, useAuthSessionReady } from '@/core/modules/auth';
import {
  NOTIFICATION_TYPES,
  deleteAllNotifications,
  deleteNotification,
  markAllAsRead,
  markAsRead,
  subscribeToNotifications,
} from '@/core/services/notifications/notifications.service';
import { applyAvatarFallback, cn, getUserAvatarFallbackUrl, getUserAvatarUrl } from '@/core/utils';
import { Button } from '@/ui/elements';
import Icon from '@/ui/icon';

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
      : payload?.subject && typeof payload.subject === 'object'
        ? payload.subject
        : {
            href: payload?.listHref || payload?.subjectHref || null,
            title: payload?.listTitle || payload?.subjectTitle || null,
          };

  const ActorComponent = ({ children }) =>
    actorLink ? (
      <Link href={actorLink} className="font-semibold">
        {children}
      </Link>
    ) : (
      <span className="font-semibold">{children}</span>
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
            <Link href={reviewSubject.href} className="font-semibold">
              {reviewSubject.title || 'a title'}
            </Link>
          ) : (
            <span className="font-semibold">{reviewSubject?.title || 'a title'}</span>
          )}
          .
        </span>
      );
    case NOTIFICATION_TYPES.LIST_LIKE:
      return (
        <span className="text-sm text-black/70">
          <ActorComponent>{actorName}</ActorComponent> liked your list{' '}
          {listSubject?.href ? (
            <Link href={listSubject.href} className="font-semibold">
              {listSubject.title || 'a list'}
            </Link>
          ) : (
            <span className="font-semibold">{listSubject?.title || 'a list'}</span>
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
  const optimisticStateRef = useRef({
    deletedIds: new Set(),
    forceReadIds: new Set(),
  });
  const isSidePosition = header?.position === 'left' || header?.position === 'right';

  const userId = useMemo(() => data?.userId || auth.user?.id || null, [auth.user?.id, data?.userId]);

  function resetOptimisticState() {
    optimisticStateRef.current = {
      deletedIds: new Set(),
      forceReadIds: new Set(),
    };
  }

  function projectNotificationsWithOptimisticState(nextNotifications = []) {
    const deletedIds = optimisticStateRef.current.deletedIds;
    const forceReadIds = optimisticStateRef.current.forceReadIds;

    return (Array.isArray(nextNotifications) ? nextNotifications : [])
      .filter((item) => item?.id && !deletedIds.has(item.id))
      .map((item) => (forceReadIds.has(item.id) ? { ...item, read: true } : item));
  }

  useEffect(() => {
    if (!auth.isReady || !isAuthSessionReady || !auth.isAuthenticated || !userId) {
      resetOptimisticState();
      setNotifications([]);
      setIsLoading(false);
      return undefined;
    }

    resetOptimisticState();
    setIsLoading(true);

    return subscribeToNotifications(
      userId,
      (nextNotifications) => {
        setNotifications(projectNotificationsWithOptimisticState(nextNotifications));
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
    const markedIds = notifications.filter((item) => !item.read).map((item) => item.id);
    markedIds.forEach((id) => optimisticStateRef.current.forceReadIds.add(id));
    setNotifications((current) =>
      current.map((item) => ({
        ...item,
        read: true,
      }))
    );
    try {
      await markAllAsRead(userId);
    } catch (error) {
      markedIds.forEach((id) => optimisticStateRef.current.forceReadIds.delete(id));
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
    optimisticStateRef.current.forceReadIds.add(notificationId);
    setNotifications((current) => current.map((item) => (item.id === notificationId ? { ...item, read: true } : item)));

    try {
      await markAsRead(userId, notificationId);
    } catch (error) {
      optimisticStateRef.current.forceReadIds.delete(notificationId);
      setNotifications(previous);
      console.error(error);
    }
  };

  const handleDelete = async (notificationId, event) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (!notificationId) return;
    if (!userId) return;

    const previous = notifications;
    optimisticStateRef.current.deletedIds.add(notificationId);
    setNotifications((current) => current.filter((item) => item.id !== notificationId));

    try {
      await deleteNotification(userId, notificationId);
    } catch (error) {
      optimisticStateRef.current.deletedIds.delete(notificationId);
      setNotifications(previous);
      console.error(error);
    }
  };

  const handleDeleteAll = async () => {
    if (notifications.length === 0) return;
    if (!userId) return;

    const previous = notifications;
    const deletedIds = notifications.map((item) => item.id);
    deletedIds.forEach((id) => optimisticStateRef.current.deletedIds.add(id));
    setNotifications([]);
    try {
      await deleteAllNotifications(userId);
    } catch (error) {
      deletedIds.forEach((id) => optimisticStateRef.current.deletedIds.delete(id));
      setNotifications(previous);
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
      bodyClassName="p-0"
      footer={{
        left: hasUnread ? (
          <span className="text-xs opacity-70">{notifications.filter((item) => !item.read).length} unread</span>
        ) : (
          <span className="text-xs opacity-70">{notifications.length} notifications</span>
        ),
        right:
          notifications.length > 0 ? (
            <>
              <Button
                type="button"
                onClick={handleDeleteAll}
                className="h-8 shrink-0 rounded-[12px] border border-black/10 bg-black/5 px-4 text-xs font-semibold tracking-wide whitespace-nowrap text-black/70 uppercase transition hover:bg-black/10 hover:text-black"
              >
                Clear all
              </Button>
              {hasUnread ? (
                <Button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="hover:bg-info hover:border-info hover:text-primary h-8 shrink-0 rounded-[12px] border border-black bg-black px-4 text-xs font-semibold tracking-wide whitespace-nowrap text-white uppercase transition disabled:cursor-not-allowed disabled:border-black/5 disabled:bg-black/10 disabled:text-black/60"
                >
                  Mark all as read
                </Button>
              ) : null}
            </>
          ) : null,
      }}
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col">
              {Array.from({ length: 100 }, (_, index) => index + 1).map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between gap-3 border-b border-black/10 p-3 last:border-none lg:p-4"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <div className="size-10 shrink-0 animate-pulse rounded-[10px] bg-black/5" />
                    <div className="flex w-full flex-col gap-1.5">
                      <div className="h-3 w-[60%] animate-pulse rounded-full bg-black/5" />
                      <div className="h-2 w-[40%] animate-pulse rounded-full bg-black/5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className={cn('center h-full w-full py-20 text-sm font-medium text-black/60')}>
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
                      'relative grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 border-b border-black/10 p-3 transition-colors last:border-none lg:p-4',
                      notification.read ? 'hover:bg-black/5' : 'bg-black/5 text-black hover:bg-black/10'
                    )}
                  >
                    <div className="center size-10 shrink-0 overflow-hidden">
                      {notification.actor ? (
                        <img
                          src={actorAvatarSrc}
                          alt={notification.actor?.displayName || 'Avatar'}
                          className="size-full rounded-[12px] object-cover"
                          loading="lazy"
                          onError={(event) => applyAvatarFallback(event, actorAvatarFallbackSrc)}
                        />
                      ) : (
                        <Icon icon={getNotificationIcon(notification.type)} size={20} className="text-black/70" />
                      )}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col">
                      {getNotificationContent(notification)}
                      <span className="text-[10px] tracking-widest text-black/70 uppercase">
                        {formatRelativeTime(notification.createdAt)}
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5 self-center">
                      {!notification.read ? (
                        <Button
                          onClick={(event) => handleMarkRead(notification.id, event)}
                          title="Mark as read"
                          className="border-info/15 bg-info/5 text-info hover:bg-info/15 size-7 rounded-[8px] border transition"
                        >
                          <Icon icon="material-symbols:check-rounded" size={16} />
                        </Button>
                      ) : null}
                      <Button
                        onClick={(event) => handleDelete(notification.id, event)}
                        title="Delete notification"
                        variant="destructive"
                        className="size-7 rounded-[8px] transition"
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
