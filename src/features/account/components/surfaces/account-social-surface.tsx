"use client";

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type FocusEvent,
  type ReactNode,
  type SetStateAction,
} from "react";
import { LayoutGroup } from "motion/react";
import Link from "next/link";
import { globalEvents } from "@omerdlw/base-framework/events";
import { useGlobalEvent } from "@omerdlw/base-framework/hooks";
import type { SurfaceEntry } from "@omerdlw/base-framework/modules/dock";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import {
  USER_MESSAGES,
  UserError,
  toUserMessage,
} from "@omerdlw/base-framework/utils";
import { accountHref } from "@/config/routes";
import { useAuth } from "@/features/auth";
import {
  AdaptiveImage,
  Button,
  Icon,
  SURFACE_META,
  SURFACE_SCROLL,
  SURFACE_TEXT,
  SURFACE_TILE,
  SURFACE_TILE_INNER,
  SURFACE_TITLE,
  SurfaceSegmentedControl,
  scrollWithin,
} from "@/ui";
import { SlidingHighlight } from "@/ui/sliding-highlight";
import {
  acceptFollowRequest,
  fetchFollowRequests,
  fetchFollowers,
  fetchFollowing,
  rejectFollowRequest,
  removeFollower,
  type FollowCursor,
  type FollowPage,
  type FollowUser,
} from "../../lib/client";
import { SOCIAL_EVENTS } from "../../lib/constants";
import { followUserAction, unfollowUserAction } from "../../server/actions";
import {
  applyAvatarFallback,
  getUserAvatarFallbackUrl,
  getUserAvatarUrl,
} from "../../lib/avatar";

type SocialTab = "followers" | "following" | "inbox";
type SocialAction = "accept" | "follow" | "reject" | "remove" | "unfollow";

const TAB_LABELS: Record<SocialTab, string> = {
  followers: "Followers",
  following: "Following",
  inbox: "Follow Requests",
};

const BUTTON =
  "center h-10 min-w-[6rem] shrink-0 rounded-[10px] px-4 text-xs font-medium select-none cursor-pointer disabled:cursor-not-allowed";
const PRIMARY_BUTTON = `${BUTTON} ui-sheen bg-white text-black hover:bg-white/90 disabled:bg-white/40 [--sheen-ink:0_0_0] [--sheen:0.08]`;
const SECONDARY_BUTTON = `${BUTTON} text-white/65 ring-1 ring-white/15 ring-inset hover:bg-white/[0.06] hover:text-white disabled:text-white/35`;
const MUTED_BUTTON = `${BUTTON} text-white/40 ring-1 ring-white/10 ring-inset cursor-default`;
const ROW = `${SURFACE_TILE} w-full`;

interface Collection {
  error: unknown;
  loading: boolean;
  loadingMore: boolean;
  list: FollowUser[];
  next: FollowCursor | null;
  total: number | null;
}

type PageLoader = (cursor?: FollowCursor | null) => Promise<FollowPage>;

const loadRequests: PageLoader = async () => ({
  items: await fetchFollowRequests(),
  next: null,
  total: null,
});

function withoutUser(collection: Collection, id: string): Collection {
  return {
    ...collection,
    list: collection.list.filter((user) => user.id !== id),
    total: collection.total === null ? null : Math.max(0, collection.total - 1),
  };
}

function errorMessage(error: unknown, tab: SocialTab): string {
  const status = (error as { status?: number } | null)?.status;
  if (status === 403) {
    return tab === "inbox"
      ? "You can't view these follow requests"
      : "This account is private";
  }
  if (status === 401) return USER_MESSAGES.unauthorized;
  return tab === "inbox"
    ? "Couldn't load your follow requests"
    : `Couldn't load ${tab}`;
}

function useCollection(
  load: PageLoader,
  enabled: boolean,
): [Collection, Dispatch<SetStateAction<Collection>>, () => void, () => void] {
  const [state, setState] = useState<Collection>({
    error: null,
    list: [],
    loading: enabled,
    loadingMore: false,
    next: null,
    total: null,
  });
  const request = useRef(0);
  const loadingMore = useRef(false);

  const reload = useCallback(async () => {
    if (!enabled) {
      setState((s) => (s.loading ? { ...s, loading: false } : s));
      return;
    }
    const id = ++request.current;
    setState((s) => ({ ...s, error: null, loading: s.list.length === 0 }));
    try {
      const page = await load();
      if (id !== request.current) return;
      setState({
        error: null,
        list: page.items,
        loading: false,
        loadingMore: false,
        next: page.next,
        total: page.total,
      });
    } catch (error) {
      if (id === request.current) {
        setState((s) => ({ ...s, error, loading: false }));
      }
    }
  }, [enabled, load]);

  const loadMore = useCallback(async () => {
    const cursor = state.next;
    if (!cursor || loadingMore.current) return;
    loadingMore.current = true;
    const id = request.current;
    setState((s) => ({ ...s, loadingMore: true }));
    try {
      const page = await load(cursor);
      if (id !== request.current) return;
      setState((s) => {
        const known = new Set(s.list.map((user) => user.id));
        return {
          ...s,
          list: [
            ...s.list,
            ...page.items.filter((user) => !known.has(user.id)),
          ],
          loadingMore: false,
          next: page.next,
        };
      });
    } catch {
      setState((s) => ({ ...s, loadingMore: false }));
    } finally {
      loadingMore.current = false;
    }
  }, [load, state.next]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return [state, setState, reload, loadMore];
}

function LoadingRow() {
  return (
    <div className={ROW}>
      <div
        className={`skeleton-block size-10 shrink-0 ${SURFACE_TILE_INNER}`}
      />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
        <div className="skeleton-block h-3 w-28 rounded-full" />
        <div className="skeleton-block h-2.5 w-16 rounded-full" />
      </div>
      <div
        className={`skeleton-block h-10 w-[6rem] shrink-0 ${SURFACE_TILE_INNER}`}
      />
    </div>
  );
}

function LoadMoreSentinel({
  loading,
  onVisible,
}: {
  loading: boolean;
  onVisible: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onVisible();
      },
      { rootMargin: "120px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [onVisible]);

  return (
    <div aria-hidden="true" className="flex w-full flex-col" ref={ref}>
      {loading ? <LoadingRow /> : null}
    </div>
  );
}

function StatusTile({
  description,
  icon,
  title,
}: {
  description: string;
  icon: string;
  title: string;
}) {
  return (
    <div className={ROW}>
      <div
        className={`center size-10 shrink-0 bg-white/[0.06] text-white/45 ${SURFACE_TILE_INNER}`}
      >
        <Icon icon={icon} size={18} />
      </div>
      <div className={SURFACE_TEXT}>
        <p className={SURFACE_TITLE}>{title}</p>
        <p className={SURFACE_META}>{description}</p>
      </div>
    </div>
  );
}

const UserRow = memo(function UserRow({
  action,
  highlighted,
  onBlur,
  onFocus,
  onNavigate,
  onPointerEnter,
  user,
}: {
  action: ReactNode;
  highlighted: boolean;
  onBlur: (event: FocusEvent<HTMLDivElement>) => void;
  onFocus: () => void;
  onNavigate?: () => void;
  onPointerEnter: () => void;
  user: FollowUser;
}) {
  return (
    <div
      className={`${ROW} relative isolate group/user`}
      onBlur={onBlur}
      onFocus={onFocus}
      onPointerEnter={onPointerEnter}
    >
      {highlighted ? (
        <SlidingHighlight
          className="rounded-[16px] bg-white/[0.04] ring-1 ring-white/[0.08] ring-inset"
          layoutId="account-social-row-highlight"
        />
      ) : null}
      <Link
        className={`relative z-10 flex h-full min-w-0 flex-1 items-center gap-3 ${SURFACE_TILE_INNER}`}
        href={accountHref(user.username || user.id)}
        onClick={onNavigate}
      >
        <div
          className={`relative size-10 shrink-0 overflow-hidden bg-white/5 ${SURFACE_TILE_INNER}`}
        >
          <AdaptiveImage
            alt={user.displayName}
            className="size-full rounded-[inherit] object-cover"
            onError={(event) =>
              applyAvatarFallback(event, getUserAvatarFallbackUrl(user))
            }
            src={getUserAvatarUrl(user)}
            wrapperClassName="size-full rounded-[inherit]"
          />
        </div>
        <div className={SURFACE_TEXT}>
          <span className={SURFACE_TITLE}>{user.displayName}</span>
          <span className={`${SURFACE_META} group-hover/user:text-white/70`}>
            @{user.username || "user"}
          </span>
        </div>
      </Link>
      {action ? (
        <div className="relative z-10 flex shrink-0 items-center">{action}</div>
      ) : null}
    </div>
  );
});

interface UserActionProps {
  followStatus: string | null;
  onAction: (action: SocialAction, id: string) => void;
  ownProfile: boolean;
  pending: SocialAction | null;
  showFollow: boolean;
  tab: SocialTab;
  userId: string;
}

const UserAction = memo(function UserAction({
  followStatus,
  onAction,
  ownProfile,
  pending,
  showFollow,
  tab,
  userId,
}: UserActionProps) {
  const busy = pending !== null;
  const button = (action: SocialAction, label: string, className: string) => (
    <Button
      aria-label={label}
      className={className}
      disabled={busy}
      loading={pending === action}
      onClick={() => onAction(action, userId)}
    >
      <span>{label}</span>
    </Button>
  );

  if (tab === "inbox") {
    return (
      <div className="flex shrink-0 items-center gap-2">
        {button("accept", "Accept", PRIMARY_BUTTON)}
        {button("reject", "Reject", SECONDARY_BUTTON)}
      </div>
    );
  }
  if (ownProfile) {
    return tab === "following"
      ? button("unfollow", "Unfollow", SECONDARY_BUTTON)
      : button("remove", "Remove", SECONDARY_BUTTON);
  }
  if (!showFollow) return null;

  const requested = followStatus === "pending";
  const following = followStatus === "accepted";
  const label = following ? "Following" : requested ? "Requested" : "Follow";
  return (
    <Button
      aria-label={label}
      className={
        requested ? MUTED_BUTTON : following ? SECONDARY_BUTTON : PRIMARY_BUTTON
      }
      disabled={busy || requested}
      onClick={() => onAction(following ? "unfollow" : "follow", userId)}
    >
      <span>{label}</span>
    </Button>
  );
});

interface AccountSocialData {
  avatarUrl?: string;
  canManageRequests?: boolean;
  displayName: string;
  tab: SocialTab;
  userId: string;
  username?: string;
}

function AccountSocialSurface({
  close,
  data,
}: {
  close?: () => void;
  data: AccountSocialData;
}) {
  const highlightGroupId = useId();
  const auth = useAuth();
  const toast = useToast();
  const viewerId = auth.user?.id ?? null;
  const userId = data.userId;
  const ownProfile = viewerId !== null && viewerId === userId;
  const canManageRequests = Boolean(data.canManageRequests) || ownProfile;
  const signedIn = auth.isReady && auth.isAuthenticated && viewerId !== null;

  const [tab, setTab] = useState<SocialTab>(data.tab);
  const [hoveredUserId, setHoveredUserId] = useState<string | null>(null);
  const [focusedUserId, setFocusedUserId] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, SocialAction>>({});
  const [followStatus, setFollowStatus] = useState<Record<string, string>>({});

  const loadFollowers = useCallback<PageLoader>(
    (cursor) => fetchFollowers(userId, cursor),
    [userId],
  );
  const loadFollowing = useCallback<PageLoader>(
    (cursor) => fetchFollowing(userId, cursor),
    [userId],
  );
  const [followers, setFollowers, reloadFollowers, moreFollowers] =
    useCollection(loadFollowers, Boolean(userId));
  const [following, setFollowing, reloadFollowing, moreFollowing] =
    useCollection(loadFollowing, Boolean(userId));
  const [requests, setRequests, reloadRequests] = useCollection(
    loadRequests,
    canManageRequests && signedIn,
  );

  const [seenLists, setSeenLists] = useState([followers.list, following.list]);
  if (seenLists[0] !== followers.list || seenLists[1] !== following.list) {
    setSeenLists([followers.list, following.list]);
    setFollowStatus((statuses) => {
      const next = { ...statuses };
      for (const user of [...followers.list, ...following.list]) {
        next[user.id] = user.viewerStatus || "";
      }
      return next;
    });
  }

  useGlobalEvent(
    SOCIAL_EVENTS.FOLLOW_CHANGE,
    () => {
      reloadFollowers();
      reloadFollowing();
    },
    { debounceMs: 250 },
  );
  useGlobalEvent(
    SOCIAL_EVENTS.INBOX_CHANGE,
    () => {
      if (canManageRequests && viewerId) reloadRequests();
    },
    { debounceMs: 250 },
  );

  const run = useCallback(
    async (
      id: string,
      action: SocialAction,
      request: () => Promise<void>,
      failure: string,
      apply: () => () => void,
    ) => {
      if (!viewerId || pending[id]) return;
      setPending((current) => ({ ...current, [id]: action }));
      const revert = apply();
      try {
        await request();
      } catch (error) {
        revert();
        toast(toUserMessage(error, { fallback: failure }));
      } finally {
        setPending(({ [id]: _, ...rest }) => rest);
      }
    },
    [pending, toast, viewerId],
  );

  const snapshot = <T,>(
    setter: Dispatch<SetStateAction<T>>,
    change: (value: T) => T,
  ) => {
    let previous: T | undefined;
    setter((value) => {
      previous = value;
      return change(value);
    });
    return () => {
      if (previous !== undefined) setter(previous as T);
    };
  };

  const handleAction = useCallback(
    (action: SocialAction, id: string) => {
      switch (action) {
        case "accept":
          return run(
            id,
            action,
            async () => {
              await acceptFollowRequest(id);
              globalEvents.emit(SOCIAL_EVENTS.FOLLOW_CHANGE, {
                followingId: viewerId,
                status: "accepted",
              });
              globalEvents.emit(SOCIAL_EVENTS.INBOX_CHANGE);
            },
            "Couldn't accept this request",
            () => snapshot(setRequests, (s) => withoutUser(s, id)),
          );
        case "reject":
          return run(
            id,
            action,
            async () => {
              await rejectFollowRequest(id);
              globalEvents.emit(SOCIAL_EVENTS.INBOX_CHANGE);
            },
            "Couldn't decline this request",
            () => snapshot(setRequests, (s) => withoutUser(s, id)),
          );
        case "remove":
          return run(
            id,
            action,
            async () => {
              await removeFollower(id);
              globalEvents.emit(SOCIAL_EVENTS.FOLLOW_CHANGE, {
                followingId: viewerId,
                status: null,
              });
            },
            "Couldn't remove this follower",
            () => snapshot(setFollowers, (s) => withoutUser(s, id)),
          );
        case "unfollow":
          return run(
            id,
            action,
            async () => {
              const result = await unfollowUserAction(id);
              if (!result.success) throw new UserError(result.error);
              globalEvents.emit(SOCIAL_EVENTS.FOLLOW_CHANGE, {
                followingId: id,
                status: null,
              });
            },
            "Couldn't unfollow this account",
            () => {
              const revertStatus = snapshot(
                setFollowStatus,
                ({ [id]: _, ...rest }) => rest,
              );
              const revertList = ownProfile
                ? snapshot(setFollowing, (s) => withoutUser(s, id))
                : () => {};
              return () => {
                revertStatus();
                revertList();
              };
            },
          );
        case "follow":
          return run(
            id,
            action,
            async () => {
              const result = await followUserAction(id);
              if (!result.success) throw new UserError(result.error);
              const status = result.data;
              setFollowStatus((current) => ({ ...current, [id]: status }));
              globalEvents.emit(SOCIAL_EVENTS.FOLLOW_CHANGE, {
                followingId: id,
                status,
              });
            },
            "Couldn't follow this account",
            () =>
              snapshot(setFollowStatus, (current) => ({
                ...current,
                [id]: "accepted",
              })),
          );
      }
    },
    [ownProfile, run, setFollowers, setFollowing, setRequests, viewerId],
  );

  const showInbox =
    canManageRequests &&
    (requests.loading || requests.list.length > 0 || Boolean(requests.error));

  const tabs = useMemo(
    () => [
      {
        count: following.total ?? following.list.length,
        key: "following" as const,
        label: "Following",
      },
      {
        count: followers.total ?? followers.list.length,
        key: "followers" as const,
        label: "Followers",
      },
      ...(showInbox
        ? [
            {
              count: requests.list.length,
              key: "inbox" as const,
              label: "Inbox",
            },
          ]
        : []),
    ],
    [followers, following, requests.list.length, showInbox],
  );

  const active =
    tab === "inbox" ? requests : tab === "following" ? following : followers;
  const loadMore =
    tab === "following"
      ? moreFollowing
      : tab === "followers"
        ? moreFollowers
        : null;

  let body: ReactNode;
  if (active.loading) {
    body = (
      <div className="flex w-full flex-col gap-2.5">
        {Array.from({ length: 4 }, (_, index) => (
          <LoadingRow key={index} />
        ))}
      </div>
    );
  } else if (active.error) {
    body = (
      <StatusTile
        description={errorMessage(active.error, tab)}
        icon="solar:danger-circle-bold"
        title={`Couldn't load ${tab}`}
      />
    );
  } else if (active.list.length === 0) {
    body = (
      <StatusTile
        description={
          tab === "inbox"
            ? "Incoming follow requests will appear here"
            : `No ${tab} yet for this account`
        }
        icon={
          tab === "inbox"
            ? "solar:inbox-line-bold"
            : "solar:users-group-rounded-bold"
        }
        title={tab === "inbox" ? "No pending follow requests" : `No ${tab} yet`}
      />
    );
  } else {
    body = (
      <div
        className={`${SURFACE_SCROLL} max-h-[min(56dvh,26rem)] w-full touch-pan-y`}
        data-lenis-prevent
        data-lenis-prevent-wheel
        key={tab}
        onPointerLeave={() => setHoveredUserId(null)}
        onWheel={scrollWithin}
      >
        <LayoutGroup id={`account-social-${highlightGroupId}-${tab}`}>
          <div className="flex w-full flex-col gap-2.5">
            {active.list.map((user) => (
              <UserRow
                action={
                  <UserAction
                    followStatus={followStatus[user.id] || null}
                    onAction={handleAction}
                    ownProfile={ownProfile}
                    pending={pending[user.id] ?? null}
                    showFollow={viewerId !== null && viewerId !== user.id}
                    tab={tab}
                    userId={user.id}
                  />
                }
                highlighted={
                  (hoveredUserId ?? focusedUserId) === user.id
                }
                key={user.id}
                onBlur={(event) => {
                  if (
                    !(event.relatedTarget instanceof Node) ||
                    !event.currentTarget.contains(event.relatedTarget)
                  ) {
                    setFocusedUserId(null);
                  }
                }}
                onFocus={() => setFocusedUserId(user.id)}
                onNavigate={close}
                onPointerEnter={() => setHoveredUserId(user.id)}
                user={user}
              />
            ))}
            {active.next && loadMore ? (
              <LoadMoreSentinel
                loading={active.loadingMore}
                onVisible={loadMore}
              />
            ) : null}
          </div>
        </LayoutGroup>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col overflow-hidden">
      <SurfaceSegmentedControl
        ariaLabel="Followers and following"
        id="account-social-tabs"
        items={tabs}
        onChange={setTab}
        value={tab}
      />
      {body}
    </div>
  );
}

export function createAccountSocialSurfaceEntry(
  data: AccountSocialData,
): SurfaceEntry {
  return {
    component: AccountSocialSurface,
    description: TAB_LABELS[data.tab],
    icon: data.avatarUrl ?? "solar:users-group-rounded-bold",
    props: { data },
    title: data.displayName.trim() || data.username || "Social",
  };
}
