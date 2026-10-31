"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { globalEvents } from "@omerdlw/base-framework/events";
import { useGlobalEvent } from "@omerdlw/base-framework/hooks";
import {
  DockSurfaceExtension,
  isValidBannerUrl,
  type SurfaceEntry,
} from "@omerdlw/base-framework/modules/dock";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { toUserMessage } from "@omerdlw/base-framework/utils";
import { accountHref } from "@/config/routes";
import { useAuth } from "@/features/auth";
import {
  AdaptiveImage,
  Button,
  Icon,
  SegmentedControl,
  SURFACE_META,
  SURFACE_SCROLL,
  SURFACE_TEXT,
  SURFACE_TILE,
  SURFACE_TILE_HOVER,
  SURFACE_TILE_INNER,
  SURFACE_TITLE,
  scrollWithin,
} from "@/ui";
import {
  deleteAllNotifications,
  deleteNotification,
  fetchNotifications,
  markAllAsRead,
  markAsRead,
  type NotificationItem,
} from "../../lib/client";
import {
  NOTIFICATIONS_ICON,
  NOTIFICATIONS_TITLE,
  SOCIAL_EVENTS,
} from "../../lib/constants";
import {
  applyAvatarFallback,
  getUserAvatarFallbackUrl,
  getUserAvatarUrl,
} from "../../lib/avatar";

type Filter = "all" | "unread";

const ICONS: Record<string, string> = {
  FOLLOW_ACCEPTED: "solar:user-check-bold",
  FOLLOW_REQUEST: "solar:user-plus-bold",
  MENTION: "solar:mention-circle-bold",
  NEW_FOLLOWER: "solar:user-plus-bold",
  SYSTEM_ANNOUNCEMENT: "solar:info-circle-bold",
};

const ICON_BUTTON =
  "center size-10 shrink-0 cursor-pointer rounded-[10px] select-none";
const TOOLBAR_BUTTON =
  "flex h-full shrink-0 cursor-pointer items-center rounded-full bg-transparent px-3.5 text-xs font-medium text-white/70 select-none hover:bg-white/[0.07] hover:text-white";
const BANNER_FADE =
  "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.65) 70%, black 100%)";

const SHORT_DATE = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
});

function timeAgo(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return SHORT_DATE.format(date);
}

function headlineOf({ actor, payload, type }: NotificationItem): string {
  if (actor) return actor.display_name || actor.username || "Anonymous User";
  if (type === "SYSTEM_ANNOUNCEMENT") {
    return payload?.title || "System Announcement";
  }
  return payload?.title || "Notification";
}

function summaryOf({ payload, type }: NotificationItem): string {
  const subject = payload?.subjectTitle || payload?.targetTitle;
  switch (type) {
    case "FOLLOW_REQUEST":
      return "Requested to follow you";
    case "FOLLOW_ACCEPTED":
      return "Accepted your follow request";
    case "NEW_FOLLOWER":
      return "Started following you";
    case "MENTION":
      return subject ? `Mentioned you in ${subject}` : "Mentioned you";
    case "SYSTEM_ANNOUNCEMENT":
      return payload?.message || "System announcement";
    default: {
      const message = payload?.message || "Interacted with you";
      return subject ? `${message} in ${subject}` : message;
    }
  }
}

function StatusTile({
  icon,
  meta,
  title,
}: {
  icon: string;
  meta: string;
  title: string;
}) {
  return (
    <div className={`${SURFACE_TILE} w-full`}>
      <div
        className={`center size-10 shrink-0 bg-white/[0.06] text-white/50 ${SURFACE_TILE_INNER}`}
      >
        <Icon icon={icon} size={20} />
      </div>
      <div className={SURFACE_TEXT}>
        <p className={SURFACE_TITLE}>{title}</p>
        <p className={SURFACE_META}>{meta}</p>
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="flex w-full flex-col gap-2.5">
      {Array.from({ length: 4 }, (_, index) => (
        <div className={`${SURFACE_TILE} w-full`} key={index}>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div
              className={`skeleton-block size-10 shrink-0 ${SURFACE_TILE_INNER}`}
            />
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
              <div className="skeleton-block h-3 w-28 rounded-full" />
              <div className="skeleton-block h-2.5 w-16 rounded-full" />
            </div>
          </div>
          <div
            className={`skeleton-block size-10 shrink-0 ${SURFACE_TILE_INNER}`}
          />
        </div>
      ))}
    </div>
  );
}

type RowAction = (id: string, event: MouseEvent<HTMLButtonElement>) => void;

const NotificationRow = memo(function NotificationRow({
  notification,
  onDelete,
  onMarkRead,
  onNavigate,
}: {
  notification: NotificationItem;
  onDelete: RowAction;
  onMarkRead: RowAction;
  onNavigate?: () => void;
}) {
  const { actor } = notification;
  const href = actor ? accountHref(actor.username || actor.id) : null;
  const headline = headlineOf(notification);
  const age = timeAgo(notification.created_at);

  const content: ReactNode = (
    <>
      <div
        className={`relative size-10 shrink-0 overflow-hidden bg-white/[0.06] ${SURFACE_TILE_INNER}`}
      >
        {actor ? (
          <AdaptiveImage
            alt={headline}
            className="size-full rounded-[inherit] object-cover"
            onError={(event) =>
              applyAvatarFallback(event, getUserAvatarFallbackUrl(actor))
            }
            src={getUserAvatarUrl(actor)}
            wrapperClassName="size-full rounded-[inherit]"
          />
        ) : (
          <div className="center size-full text-white/70">
            <Icon
              icon={ICONS[notification.type] ?? NOTIFICATIONS_ICON}
              size={20}
            />
          </div>
        )}
      </div>
      <div className={`${SURFACE_TEXT} h-full`}>
        <span className={SURFACE_TITLE}>{headline}</span>
        <span className={SURFACE_META}>
          {summaryOf(notification)}
          {age ? ` · ${age}` : ""}
        </span>
      </div>
    </>
  );

  return (
    <div
      className={`${SURFACE_TILE} ${SURFACE_TILE_HOVER} group/user relative w-full justify-between overflow-hidden`}
    >
      {actor && isValidBannerUrl(actor.banner_url) ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit] select-none"
        >
          <div
            className="ui-fade absolute inset-0 bg-cover bg-center bg-no-repeat opacity-25 group-hover/user:opacity-40"
            style={{
              backgroundImage: `url("${actor.banner_url}")`,
              WebkitMaskImage: BANNER_FADE,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent" />
        </div>
      ) : null}

      {href ? (
        <Link
          className={`relative z-10 flex h-full min-w-0 flex-1 items-center gap-3 ${SURFACE_TILE_INNER}`}
          href={href}
          onClick={onNavigate}
        >
          {content}
        </Link>
      ) : (
        <div className="relative z-10 flex h-full min-w-0 flex-1 items-center gap-3">
          {content}
        </div>
      )}

      <div className="relative z-10 flex shrink-0 items-center gap-1.5">
        {notification.read ? null : (
          <Button
            aria-label="Mark as read"
            className={`${ICON_BUTTON} bg-primary/10 text-primary hover:bg-primary hover:text-black`}
            onClick={(event) => onMarkRead(notification.id, event)}
            title="Mark as read"
          >
            <Icon icon="solar:check-circle-bold" size={16} />
          </Button>
        )}
        <Button
          aria-label="Delete notification"
          className={`${ICON_BUTTON} bg-white/[0.06] text-white/70 hover:bg-white/10 hover:text-white`}
          onClick={(event) => onDelete(notification.id, event)}
          title="Delete notification"
        >
          <Icon icon="solar:trash-bin-trash-bold" size={16} />
        </Button>
      </div>
    </div>
  );
});

const announceChange = () =>
  globalEvents.emit(SOCIAL_EVENTS.NOTIFICATION_CHANGE);

export function AccountNotificationsSurface({ close }: { close?: () => void }) {
  const auth = useAuth();
  const toast = useToast();
  const signedIn = auth.isReady && auth.isAuthenticated;
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(() => !auth.isReady || signedIn);
  const [failed, setFailed] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const pending = useRef({
    deleted: new Set<string>(),
    read: new Set<string>(),
  });

  const load = useCallback(async () => {
    try {
      const { deleted, read } = pending.current;
      const list = await fetchNotifications();
      setItems(
        list
          .filter((item) => !deleted.has(item.id))
          .map((item) => (read.has(item.id) ? { ...item, read: true } : item)),
      );
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (signedIn) void load();
  }, [load, signedIn]);

  useGlobalEvent(
    SOCIAL_EVENTS.NOTIFICATION_CHANGE,
    () => {
      if (signedIn) void load();
    },
    { debounceMs: 150 },
  );

  const optimistic = async (
    apply: () => void,
    revert: () => void,
    request: () => Promise<void>,
    failure: string,
  ) => {
    apply();
    announceChange();
    try {
      await request();
    } catch (error) {
      revert();
      announceChange();
      toast(toUserMessage(error, { fallback: failure }));
    }
  };

  const markRead = useCallback<RowAction>(
    (id, event) => {
      event.preventDefault();
      event.stopPropagation();
      const setRead = (read: boolean) =>
        setItems((list) =>
          list.map((item) => (item.id === id ? { ...item, read } : item)),
        );
      void optimistic(
        () => {
          pending.current.read.add(id);
          setRead(true);
        },
        () => {
          pending.current.read.delete(id);
          setRead(false);
        },
        () => markAsRead(id),
        "Couldn't update this notification",
      );
    },
    [toast],
  );

  const remove = useCallback<RowAction>(
    (id, event) => {
      event.preventDefault();
      event.stopPropagation();
      const removed = items.find((item) => item.id === id);
      void optimistic(
        () => {
          pending.current.deleted.add(id);
          setItems((list) => list.filter((item) => item.id !== id));
        },
        () => {
          pending.current.deleted.delete(id);
          if (removed) {
            setItems((list) =>
              list.some((item) => item.id === id) ? list : [...list, removed],
            );
          }
        },
        () => deleteNotification(id),
        "Couldn't delete this notification",
      );
    },
    [items, toast],
  );

  const markAllRead = () => {
    const previous = items;
    const unread = items.filter((item) => !item.read).map((item) => item.id);
    void optimistic(
      () => {
        unread.forEach((id) => pending.current.read.add(id));
        setItems((list) => list.map((item) => ({ ...item, read: true })));
      },
      () => {
        unread.forEach((id) => pending.current.read.delete(id));
        setItems(previous);
      },
      markAllAsRead,
      "Couldn't update your notifications",
    );
  };

  const removeAll = () => {
    const previous = items;
    void optimistic(
      () => {
        previous.forEach((item) => pending.current.deleted.add(item.id));
        setItems([]);
      },
      () => {
        previous.forEach((item) => pending.current.deleted.delete(item.id));
        setItems(previous);
      },
      deleteAllNotifications,
      "Couldn't delete your notifications",
    );
  };

  const unreadCount = items.filter((item) => !item.read).length;
  const visible = useMemo(
    () => (filter === "unread" ? items.filter((item) => !item.read) : items),
    [filter, items],
  );

  let body: ReactNode;
  if (loading) {
    body = <ListSkeleton />;
  } else if (failed) {
    body = (
      <StatusTile
        icon="solar:danger-circle-bold"
        meta="Please try again in a moment"
        title="Couldn't load notifications"
      />
    );
  } else if (visible.length === 0) {
    body = (
      <StatusTile
        icon="solar:bell-bold"
        meta={
          filter === "unread"
            ? "You are all caught up"
            : "New followers and activity will appear here"
        }
        title={
          filter === "unread"
            ? "No unread notifications"
            : "No notifications yet"
        }
      />
    );
  } else {
    body = (
      <div
        className={`${SURFACE_SCROLL} max-h-[min(56dvh,26rem)] w-full touch-pan-y`}
        data-lenis-prevent
        data-lenis-prevent-wheel
        key={filter}
        onWheel={scrollWithin}
      >
        <div className="flex min-h-[48px] w-full flex-col justify-center gap-2.5 overflow-visible">
          {visible.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              onDelete={remove}
              onMarkRead={markRead}
              onNavigate={close}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col overflow-hidden">
      <DockSurfaceExtension align="left" id="account-notifications-toolbar">
        <div className="flex h-8 w-full items-center justify-between gap-2 select-none">
          <SegmentedControl
            ariaLabel="Filter notifications"
            items={[
              { count: items.length, key: "all", label: "All" },
              { count: unreadCount, key: "unread", label: "Unread" },
            ]}
            onChange={setFilter}
            round
            value={filter}
          />
          {items.length > 0 ? (
            <div className="flex h-full shrink-0 items-center gap-1.5">
              {unreadCount > 0 ? (
                <Button className={TOOLBAR_BUTTON} onClick={markAllRead}>
                  <span>Mark read</span>
                </Button>
              ) : null}
              <Button className={TOOLBAR_BUTTON} onClick={removeAll}>
                <span>Clear all</span>
              </Button>
            </div>
          ) : null}
        </div>
      </DockSurfaceExtension>
      {body}
    </div>
  );
}

export function createAccountNotificationsSurfaceEntry(): SurfaceEntry {
  return {
    component: AccountNotificationsSurface,
    description: "Recent activity and alerts",
    icon: NOTIFICATIONS_ICON,
    title: NOTIFICATIONS_TITLE,
  };
}
