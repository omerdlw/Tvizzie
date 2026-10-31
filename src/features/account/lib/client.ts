import { requestJson } from "@/infrastructure/http/client";
import type { CurrentAccount } from "./types";

export async function fetchCurrentAccount(): Promise<CurrentAccount | null> {
  const response = await requestJson<{ account: CurrentAccount | null }>(
    "/api/account/me",
    { notifyOnUnauthorized: false },
  );
  return response.account;
}

export interface FollowUser {
  avatarUrl: string | null;
  bannerUrl: string | null;
  createdAt: string;
  displayName: string;
  id: string;
  username: string | null;
  viewerStatus?: string | null;
}

export async function getFollowState(
  followingId: string,
): Promise<string | null> {
  const response = await requestJson<{ status?: string | null }>(
    `/api/social/follows?followingId=${encodeURIComponent(followingId)}`,
    { notifyOnUnauthorized: false },
  );
  return response.status || null;
}

export async function removeFollower(followerId: string): Promise<null> {
  if (!followerId) throw new Error("Follower ID is required");
  await requestJson("/api/social/follows", {
    body: JSON.stringify({ followerId }),
    method: "DELETE",
  });
  return null;
}

let inFlightInboxCount: Promise<number> | null = null;

export async function fetchInboxCount(): Promise<number> {
  if (inFlightInboxCount) return inFlightInboxCount;

  inFlightInboxCount = (async () => {
    try {
      const res = await requestJson<{ count?: number }>(
        "/api/social/follows?resource=inbox-count",
        {
          notifyOnUnauthorized: false,
        },
      ).catch(() => ({ count: 0 }));

      return Number(res?.count) || 0;
    } finally {
      inFlightInboxCount = null;
    }
  })();

  return inFlightInboxCount;
}

export async function fetchFollowRequests(): Promise<FollowUser[]> {
  const response = await requestJson<{ data: FollowUser[] }>(
    "/api/social/follows?resource=requests",
    { notifyOnError: false, notifyOnUnauthorized: false },
  );
  return response.data;
}

export async function acceptFollowRequest(requesterId: string): Promise<void> {
  if (!requesterId) throw new Error("Requester ID is required");
  await requestJson("/api/social/follows", {
    body: JSON.stringify({ action: "accept", requesterId }),
    method: "PATCH",
  });
}

export async function rejectFollowRequest(requesterId: string): Promise<void> {
  if (!requesterId) throw new Error("Requester ID is required");
  await requestJson("/api/social/follows", {
    body: JSON.stringify({ action: "reject", requesterId }),
    method: "PATCH",
  });
}

export interface FollowCursor {
  before: string;
  beforeId: string;
}

export interface FollowPage {
  items: FollowUser[];
  next: FollowCursor | null;
  total: number | null;
}

async function fetchFollowPage(
  resource: "followers" | "following",
  userId?: string | null,
  cursor?: FollowCursor | null,
): Promise<FollowPage> {
  const query = new URLSearchParams({ resource });
  if (userId) query.set("userId", userId);
  if (cursor) {
    query.set("before", cursor.before);
    query.set("beforeId", cursor.beforeId);
  }
  const response = await requestJson<{
    data: FollowUser[];
    next: FollowCursor | null;
    total: number | null;
  }>(`/api/social/follows?${query}`, {
    notifyOnError: false,
    notifyOnUnauthorized: false,
  });
  return {
    items: response.data,
    next: response.next,
    total: response.total,
  };
}

export function fetchFollowers(
  userId?: string | null,
  cursor?: FollowCursor | null,
): Promise<FollowPage> {
  return fetchFollowPage("followers", userId, cursor);
}

export function fetchFollowing(
  userId?: string | null,
  cursor?: FollowCursor | null,
): Promise<FollowPage> {
  return fetchFollowPage("following", userId, cursor);
}

export interface NotificationItem {
  actor: {
    avatar_url: string | null;
    banner_url: string | null;
    display_name: string | null;
    id: string;
    username: string | null;
  } | null;
  created_at: string;
  id: string;
  payload: {
    message?: string;
    subjectTitle?: string;
    targetTitle?: string;
    title?: string;
  } | null;
  read: boolean;
  type: string;
}

export async function fetchNotifications(
  limit = 50,
): Promise<NotificationItem[]> {
  const response = await requestJson<{ data: NotificationItem[] }>(
    `/api/notifications?limitCount=${limit}`,
    { notifyOnError: false },
  );
  return response.data;
}

let inFlightUnreadCount: Promise<number> | null = null;

export async function fetchUnreadCount(): Promise<number> {
  if (inFlightUnreadCount) return inFlightUnreadCount;

  inFlightUnreadCount = (async () => {
    try {
      const res = await requestJson<{ data?: number }>(
        "/api/notifications?resource=unread-count",
        {
          notifyOnUnauthorized: false,
        },
      ).catch(() => ({ data: 0 }));

      return Number(res?.data) || 0;
    } finally {
      inFlightUnreadCount = null;
    }
  })();

  return inFlightUnreadCount;
}

export async function markAsRead(notificationId: string): Promise<void> {
  if (!notificationId) return;
  await requestJson("/api/notifications", {
    body: JSON.stringify({ action: "mark-read", notificationId }),
    method: "PATCH",
  });
}

export async function markAllAsRead(): Promise<void> {
  await requestJson("/api/notifications", {
    body: JSON.stringify({ action: "mark-all-read" }),
    method: "PATCH",
  });
}

export async function deleteNotification(
  notificationId: string,
): Promise<void> {
  if (!notificationId) return;
  await requestJson(
    `/api/notifications?action=delete&notificationId=${encodeURIComponent(notificationId)}`,
    { method: "DELETE" },
  );
}

export async function deleteAllNotifications(): Promise<void> {
  await requestJson("/api/notifications?action=delete-all", {
    method: "DELETE",
  });
}
