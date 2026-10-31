"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useGlobalEvent } from "@omerdlw/base-framework/hooks";
import { REGISTRY_SOURCES } from "@omerdlw/base-framework/kernel";
import {
  useDockActions,
  useDockContextActions,
  useDockRegistration,
  useDockSelector,
} from "@omerdlw/base-framework/modules/dock";
import { getCurrentPath } from "@omerdlw/base-framework/utils";
import { accountHref } from "@/config/routes";
import { createSignInSurfaceEntry, useAuth } from "@/features/auth";
import { fetchInboxCount, fetchUnreadCount } from "../lib/client";
import {
  DEFAULT_ACCOUNT_ICON,
  NOTIFICATIONS_ACTION_KEY,
  NOTIFICATIONS_ACTION_ORDER,
  NOTIFICATIONS_ICON,
  NOTIFICATIONS_TITLE,
  SIGN_OUT_ACTION_KEY,
  SIGN_OUT_ACTION_ORDER,
  SOCIAL_EVENTS,
} from "../lib/constants";
import { useAccount } from "../lib/provider";
import { AccountInboxAction } from "./surfaces/account-action";
import {
  AccountNotificationsSurface,
  createAccountNotificationsSurfaceEntry,
} from "./surfaces/account-notifications-surface";
import { createAccountSetupSurfaceEntry } from "./surfaces/account-setup-surface";
import { createAccountSocialSurfaceEntry } from "./surfaces/account-social-surface";

const ACCOUNT_ENTRY_PATH = "/account";
const SIGN_OUT_REDIRECT_DELAY_MS = 450;

const succeeded = (result: unknown) =>
  (result as { success?: boolean } | undefined)?.success === true;

function useInboxCount(enabled: boolean): number {
  const [count, setCount] = useState(0);

  const load = useCallback(() => {
    if (enabled) void fetchInboxCount().then(setCount, () => null);
  }, [enabled]);

  useEffect(load, [load]);
  useGlobalEvent(SOCIAL_EVENTS.INBOX_CHANGE, load, { debounceMs: 150 });

  return enabled ? count : 0;
}

function AccountDockRegistration(): null {
  const auth = useAuth();
  const { account } = useAccount();
  const pathname = usePathname();
  const router = useRouter();
  const { openSurface } = useDockActions();
  const prompted = useRef<string | null>(null);

  const signedIn = auth.isAuthenticated;
  const ownPath = account?.username
    ? accountHref(account.username)
    : ACCOUNT_ENTRY_PATH;
  const ownView = pathname === ACCOUNT_ENTRY_PATH || pathname === ownPath;
  const inboxCount = useInboxCount(signedIn && Boolean(account?.isPrivate));

  const openInbox = useCallback(() => {
    if (!account) return;
    void openSurface(
      createAccountSocialSurfaceEntry({
        canManageRequests: true,
        displayName: account.displayName,
        tab: "inbox",
        userId: account.id,
        username: account.username,
      }),
    );
  }, [account, openSurface]);

  const dockConfig = useMemo(
    () => ({
      action:
        signedIn && ownView && inboxCount > 0 ? (
          <AccountInboxAction count={inboxCount} onOpen={openInbox} />
        ) : null,
      bannerPosition: (signedIn && account?.bannerPosition) || null,
      bannerUrl: (signedIn && account?.bannerUrl) || null,
      description:
        (signedIn && account?.username && `@${account.username}`) ||
        "Manage your account",
      icon: (signedIn && account?.avatarUrl) || DEFAULT_ACCOUNT_ICON,
      keepWhenDescendant: (activePath?: unknown) =>
        typeof activePath === "string" &&
        activePath.startsWith(ACCOUNT_ENTRY_PATH) &&
        activePath !== ACCOUNT_ENTRY_PATH &&
        activePath !== ownPath,
      path: ACCOUNT_ENTRY_PATH,
      targetPath: ownPath,
      title: (signedIn && account?.displayName) || "Account",
    }),
    [account, inboxCount, openInbox, ownPath, ownView, signedIn],
  );

  useDockRegistration(dockConfig, {
    priority: 200,
    source: REGISTRY_SOURCES.DYNAMIC,
  });

  useEffect(() => {
    if (signedIn || pathname !== ACCOUNT_ENTRY_PATH) {
      prompted.current = null;
      return;
    }
    if (!auth.isReady || prompted.current === pathname) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled || prompted.current === pathname) return;
      prompted.current = pathname;
      void openSurface(
        createSignInSurfaceEntry({ next: getCurrentPath() }),
      ).then((result) => {
        if (cancelled) return;
        if (
          !succeeded(result) &&
          window.location.pathname === ACCOUNT_ENTRY_PATH
        ) {
          router.replace("/");
        }
        prompted.current = null;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [auth.isReady, openSurface, pathname, router, signedIn]);

  return null;
}

function AccountSetupPrompt(): null {
  const auth = useAuth();
  const { openSurface } = useDockActions();
  const prompted = useRef(false);

  useEffect(() => {
    if (!auth.isReady || !auth.isAuthenticated || prompted.current) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("setup") !== "account") return;

    prompted.current = true;
    url.searchParams.delete("setup");
    url.searchParams.delete("next");
    window.history.replaceState(null, "", url.toString());
    queueMicrotask(() => void openSurface(createAccountSetupSurfaceEntry()));
  }, [auth.isAuthenticated, auth.isReady, openSurface]);

  return null;
}

function AccountDockActions(): null {
  const auth = useAuth();
  const router = useRouter();
  const { closeSurface, openSurface } = useDockActions();
  const notificationsOpen = useDockSelector(
    (state) =>
      state.activeSurfaceEntry?.component === AccountNotificationsSurface,
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const signedIn = auth.isReady && auth.isAuthenticated;

  const loadUnread = useCallback(() => {
    if (auth.isAuthenticated) {
      void fetchUnreadCount().then(setUnreadCount, () => null);
    }
  }, [auth.isAuthenticated]);

  useEffect(loadUnread, [loadUnread]);
  useGlobalEvent(SOCIAL_EVENTS.NOTIFICATION_CHANGE, loadUnread, {
    debounceMs: 150,
  });

  const toggleNotifications = useCallback(
    (event?: { preventDefault(): void; stopPropagation(): void }) => {
      event?.preventDefault();
      event?.stopPropagation();
      if (notificationsOpen) {
        closeSurface();
        return;
      }
      void openSurface(createAccountNotificationsSurfaceEntry());
    },
    [closeSurface, notificationsOpen, openSurface],
  );

  const signOut = useCallback(async () => {
    await auth.signOut("local");
    window.setTimeout(() => router.replace("/"), SIGN_OUT_REDIRECT_DELAY_MS);
  }, [auth, router]);

  const actions = useMemo(
    () => [
      {
        badge:
          unreadCount > 0
            ? unreadCount > 99
              ? "99+"
              : `${unreadCount}`
            : null,
        icon: NOTIFICATIONS_ICON,
        key: NOTIFICATIONS_ACTION_KEY,
        onClick: toggleNotifications,
        order: NOTIFICATIONS_ACTION_ORDER,
        tooltip: NOTIFICATIONS_TITLE,
        visible: signedIn,
      },
      {
        icon: "solar:logout-2-bold",
        key: SIGN_OUT_ACTION_KEY,
        onClick: () => void signOut(),
        order: SIGN_OUT_ACTION_ORDER,
        tooltip: "Exit",
        visible: signedIn,
      },
    ],
    [signOut, signedIn, toggleNotifications, unreadCount],
  );

  useDockContextActions(actions);

  return null;
}

export function AccountGuard() {
  return (
    <>
      <AccountDockRegistration />
      <AccountSetupPrompt />
      <AccountDockActions />
    </>
  );
}
