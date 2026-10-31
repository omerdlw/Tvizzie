"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
  type SyntheticEvent,
} from "react";
import { globalEvents } from "@omerdlw/base-framework/events";
import { useGlobalEvent } from "@omerdlw/base-framework/hooks";
import { REGISTRY_SOURCES, usePage } from "@omerdlw/base-framework/kernel";
import {
  useDockActions,
  useDockContextActions,
} from "@omerdlw/base-framework/modules/dock";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import {
  UserError,
  report,
  toUserMessage,
} from "@omerdlw/base-framework/utils";
import { accountHref } from "@/config/routes";
import { createSignInSurfaceEntry, useAuth } from "@/features/auth";
import { getFollowState } from "../lib/client";
import { DEFAULT_ACCOUNT_ICON, SOCIAL_EVENTS } from "../lib/constants";
import { followUserAction, unfollowUserAction } from "../server/actions";
import type { AccountData } from "./account-layout";
import { createAccountSettingsSurfaceEntry } from "./surfaces/settings/settings-surface";

const ACTION_ORDER = 10;

function followButton(
  status: string | null,
  pending: boolean,
  username: string,
): { icon: string; tooltip: string } {
  if (pending) {
    return { icon: "svg-spinners:90-ring-with-bg", tooltip: "Updating..." };
  }
  if (status === "accepted") {
    return { icon: "solar:user-cross-bold", tooltip: `Unfollow @${username}` };
  }
  if (status === "pending") {
    return { icon: "solar:user-cross-bold", tooltip: "Cancel follow request" };
  }
  return { icon: "solar:user-plus-bold", tooltip: `Follow @${username}` };
}

export function AccountRegistry({
  account,
  initialFollowStatus,
  isOwner,
}: {
  account: AccountData;
  initialFollowStatus: string | null;
  isOwner: boolean;
}): null {
  const auth = useAuth();
  const { openSurface } = useDockActions();
  const toast = useToast();
  const { avatarUrl, bannerPosition, bannerUrl, displayName, id, username } =
    account;

  const [followStatus, setFollowStatus] = useState(initialFollowStatus);
  const [syncedStatus, setSyncedStatus] = useState(initialFollowStatus);
  const [isPending, startTransition] = useTransition();
  const [shownStatus, setShownStatus] = useOptimistic(
    followStatus,
    (_current, next: string | null) => next,
  );

  if (initialFollowStatus !== syncedStatus) {
    setSyncedStatus(initialFollowStatus);
    setFollowStatus(initialFollowStatus);
  }

  useEffect(() => {
    if (!auth.isAuthenticated || isOwner) return;
    void getFollowState(id).then(setFollowStatus, () => null);
  }, [auth.isAuthenticated, id, isOwner]);

  useGlobalEvent(isOwner ? null : SOCIAL_EVENTS.FOLLOW_CHANGE, (payload) => {
    if (payload.followingId === id) setFollowStatus(payload.status);
  });

  const toggleFollow = useCallback(
    (event?: SyntheticEvent) => {
      event?.preventDefault();
      event?.stopPropagation();
      if (!auth.isAuthenticated) {
        void openSurface(
          createSignInSurfaceEntry({ next: window.location.pathname }),
        );
        return;
      }
      if (isPending) return;

      const previous = followStatus;
      const following = shownStatus === "accepted" || shownStatus === "pending";
      const announce = (status: string | null) =>
        globalEvents.emit(SOCIAL_EVENTS.FOLLOW_CHANGE, {
          followingId: id,
          status,
        });

      startTransition(async () => {
        setShownStatus(following ? null : "accepted");
        try {
          const result = following
            ? await unfollowUserAction(id, username)
            : await followUserAction(id, username);
          if (!result.success) throw new UserError(result.error);
          setFollowStatus(result.data);
          announce(result.data);
        } catch (error) {
          report("Social follow status", error);
          setFollowStatus(previous);
          setShownStatus(previous);
          announce(previous);
          toast(toUserMessage(error, { fallback: "Follow action failed" }));
        }
      });
    },
    [
      auth.isAuthenticated,
      followStatus,
      id,
      isPending,
      openSurface,
      setShownStatus,
      shownStatus,
      toast,
      username,
    ],
  );

  const actions = useMemo(
    () =>
      isOwner
        ? [
            {
              icon: "solar:settings-bold",
              key: "account.settings",
              onClick: () =>
                void openSurface(createAccountSettingsSurfaceEntry("overview")),
              order: ACTION_ORDER,
              tooltip: "Account settings",
              visible: auth.isReady && auth.isAuthenticated,
            },
          ]
        : [
            {
              ...followButton(shownStatus, isPending, username),
              disabled: isPending,
              key: "social.follow",
              onClick: toggleFollow,
              order: ACTION_ORDER,
              visible: true,
            },
          ],
    [
      auth.isAuthenticated,
      auth.isReady,
      isOwner,
      isPending,
      openSurface,
      shownStatus,
      toggleFollow,
      username,
    ],
  );

  useDockContextActions(actions);

  const dock = useMemo(
    () =>
      isOwner
        ? null
        : {
            bannerPosition: bannerPosition || null,
            bannerUrl: bannerUrl || null,
            description: `@${username}`,
            icon: avatarUrl || DEFAULT_ACCOUNT_ICON,
            path: accountHref(username),
            title: displayName || username,
          },
    [avatarUrl, bannerPosition, bannerUrl, displayName, isOwner, username],
  );

  usePage(dock ? { ambient: false, dock } : {}, {
    priority: 250,
    source: REGISTRY_SOURCES.DYNAMIC,
  });

  return null;
}
