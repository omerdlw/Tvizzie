"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type WheelEvent,
} from "react";
import Link from "next/link";
import { useAuth } from "@/features/auth";
import {
  DockSurfaceExtension,
  type SurfaceEntry,
} from "@omerdlw/base-framework/modules/dock";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { globalEvents } from "@omerdlw/base-framework/events";
import { useGlobalEvent } from "@omerdlw/base-framework/hooks";
import {
  cn,
  toUserMessage,
  USER_MESSAGES,
} from "@omerdlw/base-framework/utils";
import { Button, Icon } from "@/ui";
import { AdaptiveImage } from "@/ui";
import {
  FOLLOW_STATUSES,
  acceptFollowRequest,
  fetchFollowRequests,
  fetchFollowers,
  fetchFollowing,
  followUser,
  rejectFollowRequest,
  removeFollower,
  unfollowUser,
  type FollowCursor,
  type FollowPage,
} from "../../lib/client";
import {
  applyAvatarFallback,
  getUserAvatarFallbackUrl,
  getUserAvatarUrl,
} from "../../lib/utils";
import { SOCIAL_EVENTS } from "../../lib/constants";

interface SocialUser {
  id: string;
  username: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  displayName: string;
  status: string;
  // How the signed-in viewer follows this person, as the server saw it.
  viewerStatus: string | null;
  [key: string]: unknown;
}

const TABS = Object.freeze({
  FOLLOWERS: "followers",
  FOLLOWING: "following",
  INBOX: "inbox",
} as const);

type TabType = (typeof TABS)[keyof typeof TABS];

const ACTION_KEYS = Object.freeze({
  ACCEPT: "accept",
  REJECT: "reject",
  UNFOLLOW: "unfollow",
  REMOVE: "remove-follower",
  FOLLOW: "follow",
} as const);

type ActionKey = (typeof ACTION_KEYS)[keyof typeof ACTION_KEYS];

// Small and quiet: only Follow is lit; what is already done is outlined.
const BUTTON_BASE_CLASS =
  "center h-8 min-w-[5.5rem] shrink-0 rounded-chip px-3 text-xs font-semibold transition-colors select-none cursor-pointer disabled:cursor-not-allowed";

const PRIMARY_BUTTON_CLASS = `${BUTTON_BASE_CLASS} bg-white text-black hover:bg-white/80 disabled:bg-white/40`;
const SECONDARY_BUTTON_CLASS = `${BUTTON_BASE_CLASS} text-white/65 ring-1 ring-white/15 ring-inset hover:bg-white/[0.06] hover:text-white disabled:text-white/35`;
const DISABLED_BUTTON_CLASS = `${BUTTON_BASE_CLASS} text-white/40 ring-1 ring-white/10 ring-inset cursor-default`;

// One row of the list: a round face, the name over the handle, the action.
const ROW_CLASS = "flex h-16 w-full items-center gap-3 px-2.5";

function handleListWheel(event: WheelEvent<HTMLDivElement>) {
  const listViewport = event.currentTarget;
  if (!listViewport || listViewport.scrollHeight <= listViewport.clientHeight)
    return;
  event.preventDefault();
  event.stopPropagation();
  const maxScrollTop = listViewport.scrollHeight - listViewport.clientHeight;
  listViewport.scrollTop = Math.min(
    maxScrollTop,
    Math.max(0, listViewport.scrollTop + event.deltaY),
  );
}

function normalizeTab(value?: unknown): TabType {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (normalized === "following") return TABS.FOLLOWING;
  if (normalized === "requests" || normalized === TABS.INBOX) return TABS.INBOX;
  return TABS.FOLLOWERS;
}

function hydrateFollowUsers(list?: unknown): SocialUser[] {
  return (Array.isArray(list) ? list : [])
    .map((item: any) => ({
      id: item.userId || item.id,
      username: item.username || null,
      avatarUrl: item.avatarUrl || item.avatar_url || null,
      bannerUrl: item.bannerUrl || item.banner_url || null,
      displayName:
        item.displayName ||
        item.display_name ||
        item.username ||
        "Anonymous User",
      status: item.status || FOLLOW_STATUSES.ACCEPTED,
      viewerStatus: item.viewerStatus || null,
    }))
    .filter((item) => item.id);
}

function resolveCollectionErrorMessage(error: any, tab: TabType): string {
  const status = Number(error?.status || 0);
  if (status === 403)
    return tab === TABS.INBOX
      ? "You can't view these follow requests"
      : "This account is private";
  if (status === 401) return USER_MESSAGES.unauthorized;
  return tab === TABS.INBOX
    ? "Couldn't load your follow requests"
    : `Couldn't load ${tab}`;
}

// Everyone listed carries the viewer's own follow status with them, so the
// follow buttons need no separate read of the viewer's following.
function buildViewerStatusMap(list: SocialUser[]): Record<string, string> {
  return Object.fromEntries(
    list.map((user) => [user.id, user.viewerStatus || ""]),
  );
}

interface CollectionState {
  error: any;
  isLoading: boolean;
  isLoadingMore: boolean;
  list: SocialUser[];
  next: FollowCursor | null;
  total: number | null;
}

function withoutUser(state: CollectionState, id: string): CollectionState {
  return {
    ...state,
    list: state.list.filter((user) => user.id !== id),
    total: state.total === null ? null : Math.max(0, state.total - 1),
  };
}

function toPage(result: unknown): FollowPage {
  return Array.isArray(result)
    ? { items: result, next: null, total: null }
    : (result as FollowPage);
}

function useSocialCollection(
  fetchFn: (param?: any, cursor?: FollowCursor | null) => Promise<unknown>,
  param?: any,
  enabled = true,
) {
  const [state, setState] = useState<CollectionState>({
    error: null,
    isLoading: enabled,
    isLoadingMore: false,
    list: [],
    next: null,
    total: null,
  });

  const requestIdRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetcher = useCallback(async () => {
    if (!enabled) {
      setState((s) => (s.isLoading ? { ...s, isLoading: false } : s));
      return;
    }

    const requestId = ++requestIdRef.current;
    setState((s) => ({ ...s, isLoading: s.list.length === 0, error: null }));

    try {
      const page = toPage(await fetchFn(param));
      if (mountedRef.current && requestId === requestIdRef.current) {
        setState({
          error: null,
          isLoading: false,
          isLoadingMore: false,
          list: hydrateFollowUsers(page.items),
          next: page.next,
          total: page.total,
        });
      }
    } catch (error) {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setState((s) => ({ ...s, isLoading: false, error }));
      }
    }
  }, [fetchFn, param, enabled]);

  const loadMore = useCallback(async () => {
    const cursor = state.next;
    if (!cursor || loadingMoreRef.current) return;

    loadingMoreRef.current = true;
    const requestId = requestIdRef.current;
    setState((s) => ({ ...s, isLoadingMore: true }));

    try {
      const page = toPage(await fetchFn(param, cursor));
      if (mountedRef.current && requestId === requestIdRef.current) {
        setState((s) => {
          const known = new Set(s.list.map((user) => user.id));
          const more = hydrateFollowUsers(page.items).filter(
            (user) => !known.has(user.id),
          );
          return {
            ...s,
            isLoadingMore: false,
            list: [...s.list, ...more],
            next: page.next,
          };
        });
      }
    } catch {
      // The sentinel stays in place, so scrolling back to it tries again.
      if (mountedRef.current) {
        setState((s) => ({ ...s, isLoadingMore: false }));
      }
    } finally {
      loadingMoreRef.current = false;
    }
  }, [fetchFn, param, state.next]);

  useEffect(() => {
    void fetcher();
  }, [fetcher]);

  return { state, setState, reload: fetcher, loadMore };
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

interface SocialStatusMessageProps {
  description: string;
  icon: string;
  title: string;
}

function SocialStatusMessage({
  description,
  icon,
  title,
}: SocialStatusMessageProps) {
  return (
    <div className={ROW_CLASS}>
      <div className="center size-10 shrink-0 rounded-full bg-white/[0.06] text-white/45">
        <Icon icon={icon} size={18} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <p className="truncate text-sm leading-tight font-semibold text-white">
          {title}
        </p>
        <p className="truncate text-xs leading-tight text-white/45">
          {description}
        </p>
      </div>
    </div>
  );
}

interface SocialTab {
  count: number;
  key: TabType;
  label: string;
}

function SocialTabBar({
  activeTab,
  onSelect,
  tabs,
}: {
  activeTab: TabType;
  onSelect: (tab: TabType) => void;
  tabs: SocialTab[];
}) {
  return (
    <DockSurfaceExtension id="account-social-tabs" align="center">
      <div className="flex h-9 shrink-0 items-center gap-0.5 rounded-control bg-white/[0.04] p-1 ring-1 ring-white/[0.06] ring-inset select-none">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Button
              key={tab.key}
              type="button"
              onClick={() => onSelect(tab.key)}
              className={cn(
                "flex h-full shrink-0 cursor-pointer items-center gap-2 rounded-chip px-3 text-xs font-semibold transition-colors select-none",
                isActive
                  ? "bg-white/[0.12] text-white"
                  : "bg-transparent text-white/50 hover:text-white",
              )}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "text-[11px] font-medium tabular-nums",
                    isActive ? "text-white/60" : "text-white/30",
                  )}
                >
                  {tab.count}
                </span>
              )}
            </Button>
          );
        })}
      </div>
    </DockSurfaceExtension>
  );
}

const SocialUserRow = memo(function SocialUserRow({
  close,
  user,
  action,
  index,
}: {
  close?: () => void;
  user: SocialUser;
  action?: ReactNode;
  index: number;
}) {
  const avatarSrc = getUserAvatarUrl(user);
  const avatarFallbackSrc = getUserAvatarFallbackUrl(user);

  return (
    <div
      className={cn(
        ROW_CLASS,
        "group/user rounded-control transition-colors hover:bg-white/[0.04]",
      )}
    >
      <Link
        href={`/account/${user.username || user.id}`}
        onClick={close}
        className="flex h-full min-w-0 flex-1 items-center gap-3"
      >
        <div className="relative size-10 shrink-0 overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10">
          <AdaptiveImage
            mode="img"
            src={avatarSrc}
            alt={user.displayName}
            loading="lazy"
            decoding="async"
            className="size-full rounded-[inherit] object-cover"
            onError={(e) => applyAvatarFallback(e, avatarFallbackSrc)}
            wrapperClassName="size-full rounded-[inherit]"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
          <span className="truncate text-sm leading-tight font-semibold text-white">
            {user.displayName}
          </span>
          <span className="truncate text-xs leading-tight text-white/45">
            @{user.username || "user"}
          </span>
        </div>
      </Link>
      {action ? (
        <div className="flex shrink-0 items-center">{action}</div>
      ) : null}
    </div>
  );
});

function LoadingRow() {
  return (
    <div className={ROW_CLASS}>
      <div className="skeleton-block size-10 shrink-0 rounded-full" />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
        <div className="skeleton-block h-3 w-28 rounded-chip" />
        <div className="skeleton-block h-2.5 w-16 rounded-chip" />
      </div>
      <div className="skeleton-block h-8 w-[5.5rem] shrink-0 rounded-chip" />
    </div>
  );
}

function LoadingList() {
  return (
    <div className="flex w-full flex-col divide-y divide-white/[0.06]">
      {Array.from({ length: 4 }, (_, index) => (
        <LoadingRow key={index} />
      ))}
    </div>
  );
}

const UserAction = memo(function UserAction({
  tab,
  user,
  authUserId,
  isOwnProfile,
  pendingKind,
  followStatus,
  onAccept,
  onReject,
  onUnfollow,
  onRemoveFollower,
  onFollow,
}: {
  tab: TabType;
  user: SocialUser;
  authUserId?: string | null;
  isOwnProfile: boolean;
  pendingKind?: ActionKey | null;
  followStatus?: string | null;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onUnfollow: (id: string) => void;
  onRemoveFollower: (id: string) => void;
  onFollow: (id: string) => void;
}) {
  const isPending = Boolean(pendingKind);
  const canShowFollowAction =
    tab !== TABS.INBOX &&
    Boolean(authUserId) &&
    !isOwnProfile &&
    authUserId !== user.id;

  if (tab === TABS.INBOX) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <Button
          onClick={() => onAccept(user.id)}
          disabled={isPending}
          loading={pendingKind === ACTION_KEYS.ACCEPT}
          className={PRIMARY_BUTTON_CLASS}
          aria-label="Accept"
        >
          <span>Accept</span>
        </Button>
        <Button
          onClick={() => onReject(user.id)}
          disabled={isPending}
          loading={pendingKind === ACTION_KEYS.REJECT}
          className={SECONDARY_BUTTON_CLASS}
          aria-label="Reject"
        >
          <span>Reject</span>
        </Button>
      </div>
    );
  }

  if (tab === TABS.FOLLOWING && isOwnProfile) {
    return (
      <Button
        onClick={() => onUnfollow(user.id)}
        disabled={isPending}
        loading={pendingKind === ACTION_KEYS.UNFOLLOW}
        className={SECONDARY_BUTTON_CLASS}
        aria-label="Unfollow"
      >
        <span>Unfollow</span>
      </Button>
    );
  }

  if (tab === TABS.FOLLOWERS && isOwnProfile) {
    return (
      <Button
        onClick={() => onRemoveFollower(user.id)}
        disabled={isPending}
        loading={pendingKind === ACTION_KEYS.REMOVE}
        className={SECONDARY_BUTTON_CLASS}
        aria-label="Remove"
      >
        <span>Remove</span>
      </Button>
    );
  }

  if (canShowFollowAction) {
    const isFollowPending = followStatus === FOLLOW_STATUSES.PENDING;
    const isFollowAccepted = followStatus === FOLLOW_STATUSES.ACCEPTED;

    const followLabel = isFollowAccepted
      ? "Following"
      : isFollowPending
        ? "Requested"
        : "Follow";
    const btnClass = isFollowPending
      ? DISABLED_BUTTON_CLASS
      : isFollowAccepted
        ? SECONDARY_BUTTON_CLASS
        : PRIMARY_BUTTON_CLASS;

    return (
      <Button
        onClick={() =>
          isFollowAccepted ? onUnfollow(user.id) : onFollow(user.id)
        }
        disabled={isPending || isFollowPending}
        className={btnClass}
        aria-label={followLabel}
      >
        <span>{followLabel}</span>
      </Button>
    );
  }

  return null;
});

interface AccountSocialData {
  account?: any;
  avatarUrl?: string | null;
  canManageRequests?: boolean;
  displayName?: string;
  profile?: any;
  tab?: string;
  type?: string;
  userId?: string | null;
  username?: string;
  [key: string]: unknown;
}

export function createAccountSocialSurfaceEntry(
  data: AccountSocialData = {},
  config: Partial<SurfaceEntry> = {},
): SurfaceEntry {
  const account = data?.account || data?.profile || null;
  const username = data?.username || account?.username || "";
  const displayName = String(
    data?.displayName ||
      account?.displayName ||
      account?.display_name ||
      username ||
      "Social",
  ).trim();
  const icon =
    data?.avatarUrl ||
    (account ? getUserAvatarUrl(account) : "solar:users-group-rounded-bold");

  const tab = normalizeTab(data?.tab || data?.type);
  const tabLabel =
    tab === TABS.INBOX
      ? "Follow Requests"
      : tab === TABS.FOLLOWING
        ? "Following"
        : "Followers";

  return {
    component: AccountSocialSurface,
    icon,
    title: displayName,
    description: tabLabel,
    props: { data },
    ...config,
  };
}

interface AccountSocialSurfaceProps {
  close?: () => void;
  data?: AccountSocialData;
}

function AccountSocialSurface({ close, data }: AccountSocialSurfaceProps) {
  const auth = useAuth();
  const toast = useToast();

  const authUserId = auth.user?.id || null;
  const userId = String(data?.userId || "").trim() || authUserId;
  const isOwnProfile = Boolean(authUserId) && authUserId === userId;
  const canManageRequests = Boolean(data?.canManageRequests) || isOwnProfile;
  const isAuthSessionReady = Boolean(
    auth.isReady && auth.isAuthenticated && authUserId,
  );

  const [activeTab, setActiveTab] = useState<TabType>(() =>
    normalizeTab(data?.tab || data?.type),
  );
  const [pendingActionByUserId, setPendingActionByUserId] = useState<
    Record<string, ActionKey>
  >({});
  const [followingStatusMap, setFollowingStatusMap] = useState<
    Record<string, string>
  >({});

  const {
    state: followersState,
    setState: setFollowersState,
    reload: reloadFollowers,
    loadMore: loadMoreFollowers,
  } = useSocialCollection(fetchFollowers, userId, !!userId);
  const {
    state: followingState,
    setState: setFollowingState,
    reload: reloadFollowing,
    loadMore: loadMoreFollowing,
  } = useSocialCollection(fetchFollowing, userId, !!userId);
  const {
    state: requestsState,
    setState: setRequestsState,
    reload: reloadRequests,
  } = useSocialCollection(
    fetchFollowRequests,
    undefined,
    canManageRequests && isAuthSessionReady,
  );

  const [statusSources, setStatusSources] = useState([
    followersState.list,
    followingState.list,
  ]);
  if (
    statusSources[0] !== followersState.list ||
    statusSources[1] !== followingState.list
  ) {
    setStatusSources([followersState.list, followingState.list]);
    setFollowingStatusMap((prev) => ({
      ...prev,
      ...buildViewerStatusMap(followersState.list),
      ...buildViewerStatusMap(followingState.list),
    }));
  }

  useGlobalEvent(
    SOCIAL_EVENTS.FOLLOW_CHANGE,
    () => {
      if (userId) {
        reloadFollowers();
        reloadFollowing();
      }
    },
    { debounceMs: 250 },
  );

  useGlobalEvent(
    SOCIAL_EVENTS.INBOX_CHANGE,
    () => {
      if (canManageRequests && authUserId) reloadRequests();
    },
    { debounceMs: 250 },
  );

  const runAction = useCallback(
    async ({
      targetId,
      actionKey,
      actionFn,
      errorMsg,
      onOptimistic,
      onRollback,
    }: {
      targetId: string;
      actionKey: ActionKey;
      actionFn: () => Promise<void>;
      errorMsg: string;
      onOptimistic?: () => void;
      onRollback?: () => void;
    }) => {
      if (!authUserId || pendingActionByUserId[targetId]) return;

      setPendingActionByUserId((curr) => ({ ...curr, [targetId]: actionKey }));
      onOptimistic?.();

      try {
        await actionFn();
      } catch (error: any) {
        onRollback?.();
        toast(toUserMessage(error, { fallback: errorMsg }));
      } finally {
        setPendingActionByUserId((curr) => {
          const next = { ...curr };
          delete next[targetId];
          return next;
        });
      }
    },
    [authUserId, pendingActionByUserId, toast],
  );

  const handleAccept = useCallback(
    (id: string) => {
      let previousList: SocialUser[] = [];
      runAction({
        targetId: id,
        actionKey: ACTION_KEYS.ACCEPT,
        actionFn: async () => {
          await acceptFollowRequest(id);
          globalEvents.emit(SOCIAL_EVENTS.FOLLOW_CHANGE, {
            followingId: authUserId,
            status: "accepted",
          });
          globalEvents.emit(SOCIAL_EVENTS.INBOX_CHANGE);
        },
        errorMsg: "Couldn't accept this request",
        onOptimistic: () =>
          setRequestsState((prev) => {
            previousList = prev.list;
            return { ...prev, list: prev.list.filter((u) => u.id !== id) };
          }),
        onRollback: () =>
          setRequestsState((prev) => ({ ...prev, list: previousList })),
      });
    },
    [authUserId, runAction, setRequestsState],
  );

  const handleReject = useCallback(
    (id: string) => {
      let previousList: SocialUser[] = [];
      runAction({
        targetId: id,
        actionKey: ACTION_KEYS.REJECT,
        actionFn: async () => {
          await rejectFollowRequest(id);
          globalEvents.emit(SOCIAL_EVENTS.INBOX_CHANGE);
        },
        errorMsg: "Couldn't decline this request",
        onOptimistic: () =>
          setRequestsState((prev) => {
            previousList = prev.list;
            return { ...prev, list: prev.list.filter((u) => u.id !== id) };
          }),
        onRollback: () =>
          setRequestsState((prev) => ({ ...prev, list: previousList })),
      });
    },
    [runAction, setRequestsState],
  );

  const handleUnfollow = useCallback(
    (id: string) => {
      let previousMap: Record<string, string> = {};
      let previousState: CollectionState | null = null;
      runAction({
        targetId: id,
        actionKey: ACTION_KEYS.UNFOLLOW,
        actionFn: async () => {
          await unfollowUser(id);
          globalEvents.emit(SOCIAL_EVENTS.FOLLOW_CHANGE, {
            followingId: id,
            status: null,
          });
        },
        errorMsg: "Couldn't unfollow this account",
        onOptimistic: () => {
          setFollowingStatusMap((prev) => {
            previousMap = prev;
            const next = { ...prev };
            delete next[id];
            return next;
          });
          if (isOwnProfile)
            setFollowingState((prev) => {
              previousState = prev;
              return withoutUser(prev, id);
            });
        },
        onRollback: () => {
          setFollowingStatusMap(previousMap);
          if (isOwnProfile && previousState) setFollowingState(previousState);
        },
      });
    },
    [isOwnProfile, runAction, setFollowingState],
  );

  const handleRemoveFollower = useCallback(
    (id: string) => {
      let previousState: CollectionState | null = null;
      runAction({
        targetId: id,
        actionKey: ACTION_KEYS.REMOVE,
        actionFn: async () => {
          await removeFollower(id);
          globalEvents.emit(SOCIAL_EVENTS.FOLLOW_CHANGE, {
            followingId: authUserId,
            status: null,
          });
        },
        errorMsg: "Couldn't remove this follower",
        onOptimistic: () =>
          setFollowersState((prev) => {
            previousState = prev;
            return withoutUser(prev, id);
          }),
        onRollback: () => {
          if (previousState) setFollowersState(previousState);
        },
      });
    },
    [authUserId, runAction, setFollowersState],
  );

  const handleFollow = useCallback(
    (id: string) => {
      let previousMap: Record<string, string> = {};
      runAction({
        targetId: id,
        actionKey: ACTION_KEYS.FOLLOW,
        actionFn: async () => {
          const status = await followUser(id);
          setFollowingStatusMap((prev) => ({
            ...prev,
            [id]: status || FOLLOW_STATUSES.ACCEPTED,
          }));
          globalEvents.emit(SOCIAL_EVENTS.FOLLOW_CHANGE, {
            followingId: id,
            status,
          });
        },
        errorMsg: "Couldn't follow this account",
        onOptimistic: () =>
          setFollowingStatusMap((prev) => {
            previousMap = prev;
            return { ...prev, [id]: FOLLOW_STATUSES.ACCEPTED };
          }),
        onRollback: () => setFollowingStatusMap(previousMap),
      });
    },
    [runAction],
  );

  const shouldShowInboxTab =
    canManageRequests &&
    (requestsState.isLoading ||
      requestsState.list.length > 0 ||
      Boolean(requestsState.error));

  const followingCount = followingState.total ?? followingState.list.length;
  const followersCount = followersState.total ?? followersState.list.length;

  const tabs = useMemo(() => {
    const list: SocialTab[] = [
      {
        key: TABS.FOLLOWING,
        label: "Following",
        count: followingCount,
      },
      {
        key: TABS.FOLLOWERS,
        label: "Followers",
        count: followersCount,
      },
    ];
    if (shouldShowInboxTab)
      list.push({
        key: TABS.INBOX,
        label: "Inbox",
        count: requestsState.list.length,
      });
    return list;
  }, [
    followingCount,
    followersCount,
    shouldShowInboxTab,
    requestsState.list.length,
  ]);

  const activeDataState =
    activeTab === TABS.INBOX
      ? requestsState
      : activeTab === TABS.FOLLOWING
        ? followingState
        : followersState;
  const loadMoreActive =
    activeTab === TABS.FOLLOWING
      ? loadMoreFollowing
      : activeTab === TABS.FOLLOWERS
        ? loadMoreFollowers
        : null;
  const { list, isLoading, error: activeError } = activeDataState;
  const activeErrorMessage = activeError
    ? resolveCollectionErrorMessage(activeError, activeTab)
    : null;
  const emptyDescription =
    activeTab === TABS.INBOX
      ? "No pending follow requests"
      : `No ${activeTab} yet`;

  return (
    <div className="flex w-full flex-col overflow-hidden">
      <SocialTabBar activeTab={activeTab} onSelect={setActiveTab} tabs={tabs} />

      <>
        {isLoading ? (
          <div key={`loading-${activeTab}`} className="w-full">
            <LoadingList />
          </div>
        ) : activeErrorMessage ? (
          <SocialStatusMessage
            key={`error-${activeTab}`}
            icon="solar:danger-circle-bold"
            title={`Couldn't load ${activeTab}`}
            description={activeErrorMessage}
          />
        ) : list.length === 0 ? (
          <SocialStatusMessage
            key={`empty-${activeTab}`}
            icon={
              activeTab === TABS.INBOX
                ? "solar:inbox-line-bold"
                : "solar:users-group-rounded-bold"
            }
            title={emptyDescription}
            description={
              activeTab === TABS.INBOX
                ? "Incoming follow requests will appear here"
                : `No ${activeTab} yet for this account`
            }
          />
        ) : (
          <div
            key={`users-container-${activeTab}`}
            data-lenis-prevent
            data-lenis-prevent-wheel
            onWheel={handleListWheel}
            className="max-h-[min(56dvh,26rem)] w-full touch-pan-y scrollbar-none overflow-y-auto overscroll-contain"
          >
            <div
              key={`users-list-${activeTab}`}
              className="flex w-full flex-col divide-y divide-white/[0.06]"
            >
              {list.map((user, index) => (
                <SocialUserRow
                  key={user.id}
                  close={close}
                  user={user}
                  index={index}
                  action={
                    <UserAction
                      tab={activeTab}
                      user={user}
                      authUserId={authUserId}
                      isOwnProfile={isOwnProfile}
                      pendingKind={pendingActionByUserId[user.id] || null}
                      followStatus={followingStatusMap[user.id] || null}
                      onAccept={handleAccept}
                      onReject={handleReject}
                      onUnfollow={handleUnfollow}
                      onRemoveFollower={handleRemoveFollower}
                      onFollow={handleFollow}
                    />
                  }
                />
              ))}
              {activeDataState.next && loadMoreActive ? (
                <LoadMoreSentinel
                  key={`more-${activeTab}`}
                  loading={activeDataState.isLoadingMore}
                  onVisible={loadMoreActive}
                />
              ) : null}
            </div>
          </div>
        )}
      </>
    </div>
  );
}
