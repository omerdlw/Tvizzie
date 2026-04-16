'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth, useAuthSessionReady } from '@/core/modules/auth';
import { useBackgroundActions, useBackgroundState } from '@/core/modules/background/context';
import { useModal } from '@/core/modules/modal/context';
import { useNavigationState } from '@/core/modules/nav/context';
import { useToast } from '@/core/modules/notification/hooks';
import Tooltip from '@/ui/elements/tooltip';
import Icon from '@/ui/icon';

const ACTION_KEYS = Object.freeze({
  NOTIFICATIONS: 'notifications',
  LOGOUT: 'logout',
  SCROLL_TOP: 'scroll-top',
  TOGGLE_MUTE: 'toggle-mute',
  SETTINGS: 'settings',
});

const ACTION_ORDER = Object.freeze({
  NOTIFICATIONS: -10,
  SETTINGS: 0,
  TOGGLE_MUTE: 10,
  SCROLL_TOP: 20,
  LOGOUT: 30,
});

function stopPropagation(event) {
  event.stopPropagation();
}

function byOrderDesc(a, b) {
  return (b.order || 0) - (a.order || 0);
}

function normalizeActions(actions) {
  if (!actions) return [];

  const actionList = Array.isArray(actions) ? actions : [actions];

  return actionList.map((action, index) => ({
    key: action.key || `action-${index}`,
    ...action,
  }));
}

function getVisibleActions(actions) {
  return actions.filter((action) => action.visible !== false);
}

function filterContextActions(actions, activeItem) {
  return actions.filter((action) => {
    if (action.key === ACTION_KEYS.LOGOUT && activeItem?.hideLogout) {
      return false;
    }

    if (action.key === ACTION_KEYS.SETTINGS && activeItem?.hideSettings) {
      return false;
    }

    if (action.key === ACTION_KEYS.SCROLL_TOP && activeItem?.hideScroll) {
      return false;
    }

    return true;
  });
}

function isActionlessRoute(activeItem) {
  return (
    activeItem?.isNotFound ||
    activeItem?.path === 'not-found' ||
    activeItem?.isMasked ||
    activeItem?.isSurface ||
    activeItem?.isConfirmation
  );
}

function isStatusActionAllowed(activeItem) {
  return activeItem?.type === 'APP_ERROR' || activeItem?.type === 'API_ERROR';
}

function useDefaultNavActions() {
  const router = useRouter();
  const toast = useToast();
  const { openModal } = useModal();
  const { config } = useNavigationState();
  const { isVideo, videoElement } = useBackgroundState();
  const { toggleMute } = useBackgroundActions();
  const { isAuthenticated, isReady, signOut, user } = useAuth();
  const isAuthSessionReady = useAuthSessionReady(isAuthenticated ? user?.id || null : null);
  const [unreadCount, setUnreadCount] = useState(0);
  const isSignedIn = Boolean(isAuthenticated);
  const canOpenNotifications = Boolean(isAuthenticated && user?.id);

  const isMuted = !!videoElement?.muted;
  const unreadBadge = unreadCount > 0 ? (unreadCount > 99 ? '99+' : `${unreadCount}`) : null;
  const subscribeToUnreadCount = config?.integrations?.notifications?.subscribeToUnreadCount;

  useEffect(() => {
    if (
      !isReady ||
      !isAuthSessionReady ||
      !isAuthenticated ||
      !user?.id ||
      typeof subscribeToUnreadCount !== 'function'
    ) {
      setUnreadCount(0);
      return undefined;
    }

    return subscribeToUnreadCount(user.id, (count) => {
      setUnreadCount(count);
    });
  }, [isAuthenticated, isAuthSessionReady, isReady, subscribeToUnreadCount, user?.id]);

  return useMemo(
    () => [
      {
        key: ACTION_KEYS.NOTIFICATIONS,
        icon: 'solar:bell-bold',
        tooltip: 'Notifications',
        visible: canOpenNotifications,
        order: ACTION_ORDER.NOTIFICATIONS,
        badge: unreadBadge,
        onClick: (event) => {
          stopPropagation(event);
          openModal('NOTIFICATIONS_MODAL', 'left', {
            data: {
              userId: user?.id || null,
            },
          });
        },
      },
      {
        key: ACTION_KEYS.LOGOUT,
        icon: 'solar:logout-2-bold',
        tooltip: 'Logout',
        visible: isSignedIn,
        order: ACTION_ORDER.LOGOUT,
        onClick: async (event) => {
          stopPropagation(event);

          try {
            await signOut();
            router.replace('/');
          } catch (error) {
            toast.error(error?.message || 'Could not sign out');
          }
        },
      },
      {
        key: ACTION_KEYS.TOGGLE_MUTE,
        icon: isMuted ? 'solar:volume-loud-bold' : 'solar:muted-bold',
        tooltip: isMuted ? 'Unmute' : 'Mute',
        visible: Boolean(isVideo),
        order: ACTION_ORDER.TOGGLE_MUTE,
        onClick: (event) => {
          stopPropagation(event);
          toggleMute();
        },
      },
      {
        key: ACTION_KEYS.SETTINGS,
        icon: 'solar:settings-bold',
        tooltip: 'Settings',
        visible: false,
        order: ACTION_ORDER.SETTINGS,
        onClick: (event) => {
          stopPropagation(event);
          openModal('SETTINGS_MODAL', 'center');
        },
      },
    ],
    [
      canOpenNotifications,
      isSignedIn,
      toggleMute,
      toast,
      openModal,
      isMuted,
      isVideo,
      unreadBadge,
      router,
      signOut,
      user?.id,
    ]
  );
}

export function useNavActions({ activeItem } = {}) {
  const defaultActions = useDefaultNavActions();

  return useMemo(() => {
    if (isActionlessRoute(activeItem)) {
      return [];
    }

    const extendedActions = normalizeActions(activeItem?.actions);

    if (activeItem?.isStatus) {
      if (!isStatusActionAllowed(activeItem)) {
        return [];
      }

      return getVisibleActions(extendedActions).sort(byOrderDesc);
    }

    return filterContextActions(getVisibleActions([...defaultActions, ...extendedActions]), activeItem).sort(
      byOrderDesc
    );
  }, [activeItem, defaultActions]);
}

export function NavAction({ action }) {
  return (
    <Tooltip className="px-2" text={action.tooltip}>
      <button
        className={`center relative cursor-pointer rounded-full border border-transparent p-1 text-black/70 transition-all hover:bg-black/10 hover:text-black`}
        onClick={action.onClick}
        type="button"
      >
        <Icon icon={action.icon} size={16} />
        {action.badge ? (
          <span
            className={`center bg-info absolute -top-1.5 -right-1.5 h-4 min-w-4 rounded-full p-1 text-[11px] leading-none font-semibold text-white`}
          >
            {action.badge}
          </span>
        ) : null}
      </button>
    </Tooltip>
  );
}

export function NavActionsContainer({ activeItem }) {
  const actions = useNavActions({ activeItem });

  return (
    <div className={`mr-2 flex shrink-0 items-center gap-1`}>
      {actions.map((action, index) => (
        <NavAction key={`${action.key || action.icon || 'nav-action'}-${index}`} action={action} />
      ))}
    </div>
  );
}
