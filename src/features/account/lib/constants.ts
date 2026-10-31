import type { AccountState } from "./types";

export const INITIAL_ACCOUNT_STATE: AccountState = Object.freeze({
  account: null,
  error: null,
  isLoading: false,
});

export const USERNAME_PATTERN: RegExp =
  /^[a-z0-9](?:[a-z0-9_-]{1,28}[a-z0-9])?$/;

export const PUBLIC_ACCOUNT_FIELDS =
  "id,username,display_name,avatar_url,banner_url,banner_position,background_url,bio,is_private,created_at";

export const DEFAULT_ACCOUNT_ICON = "solar:user-circle-bold";
export const NOTIFICATIONS_ICON = "solar:bell-bold";
export const NOTIFICATIONS_TITLE = "Notifications";
export const NOTIFICATIONS_ACTION_KEY = "social.notifications";
export const NOTIFICATIONS_ACTION_ORDER = -10;
export const SIGN_OUT_ACTION_KEY = "auth.sign-out";
export const SIGN_OUT_ACTION_ORDER = 30;

export const SOCIAL_EVENTS = Object.freeze({
  FOLLOW_CHANGE: "social:follow-change",
  INBOX_CHANGE: "social:inbox-change",
  NOTIFICATION_CHANGE: "social:notification-change",
} as const);

interface FollowChange {
  followerId?: string | null;
  followingId: string | null;
  status: string | null;
}

declare module "@omerdlw/base-framework/events" {
  interface FrameworkEventMap {
    [SOCIAL_EVENTS.FOLLOW_CHANGE]: FollowChange;
    [SOCIAL_EVENTS.INBOX_CHANGE]: undefined;
    [SOCIAL_EVENTS.NOTIFICATION_CHANGE]: undefined;
  }
}
