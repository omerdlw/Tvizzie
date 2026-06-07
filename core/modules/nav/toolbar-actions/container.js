'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

import { useAuth, useAuthSessionReady } from '@/core/modules/auth';
import { useBackgroundActions, useBackgroundState } from '@/core/modules/background/context';
import { useModal } from '@/core/modules/modal/context';
import { useNavigationState } from '@/core/modules/nav/context';
import { useToast } from '@/core/modules/notification/hooks';
import Tooltip from '@/ui/elements/tooltip';
import Icon from '@/ui/icon';

import {
  filterContextToolbarActions,
  getVisibleToolbarActions,
  isActionlessNavItem,
  isStatusToolbarActionAllowed,
  NAV_ACTION_KEYS,
  NAV_ACTION_ORDER,
  normalizeToolbarActions,
  sortToolbarActionsByOrder,
} from './model';
import {
  getNavActionItemMotion,
  NAV_ACTION_GROUP_MOTION,
  NAV_BADGE_MOTION,
  NAV_BUTTON_INTERACTION_MOTION,
} from '@/core/modules/motion';

function stopPropagation(event) {
  event.stopPropagation();
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
        key: NAV_ACTION_KEYS.NOTIFICATIONS,
        icon: 'solar:bell-bold',
        tooltip: 'Notifications',
        visible: canOpenNotifications,
        order: NAV_ACTION_ORDER.NOTIFICATIONS,
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
        key: NAV_ACTION_KEYS.LOGOUT,
        icon: 'solar:logout-2-bold',
        tooltip: 'Logout',
        visible: isSignedIn,
        order: NAV_ACTION_ORDER.LOGOUT,
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
        key: NAV_ACTION_KEYS.TOGGLE_MUTE,
        icon: isMuted ? 'solar:volume-loud-bold' : 'solar:muted-bold',
        tooltip: isMuted ? 'Unmute' : 'Mute',
        visible: Boolean(isVideo),
        order: NAV_ACTION_ORDER.TOGGLE_MUTE,
        onClick: (event) => {
          stopPropagation(event);
          toggleMute();
        },
      },
      {
        key: NAV_ACTION_KEYS.SETTINGS,
        icon: 'solar:settings-bold',
        tooltip: 'Settings',
        visible: false,
        order: NAV_ACTION_ORDER.SETTINGS,
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
    if (isActionlessNavItem(activeItem)) {
      return [];
    }

    const extendedActions = normalizeToolbarActions(activeItem?.actions);

    if (activeItem?.isStatus) {
      if (!isStatusToolbarActionAllowed(activeItem)) {
        return [];
      }

      return sortToolbarActionsByOrder(getVisibleToolbarActions(extendedActions));
    }

    return sortToolbarActionsByOrder(
      filterContextToolbarActions(getVisibleToolbarActions([...defaultActions, ...extendedActions]), activeItem)
    );
  }, [activeItem, defaultActions]);
}

export function NavAction({ action }) {
  return (
    <Tooltip className="px-2" text={action.tooltip}>
      <motion.button
        className="center relative cursor-pointer rounded-[8px] p-1 text-black/70 transition-colors hover:bg-black/5 hover:text-black"
        onClick={action.onClick}
        type="button"
        {...NAV_BUTTON_INTERACTION_MOTION}
      >
        <Icon icon={action.icon} size={16} />
        <AnimatePresence initial={false}>
          {action.badge ? (
            <motion.span
              key={action.badge}
              className="center bg-info absolute -top-1 -right-1 h-4 min-w-4 rounded-full p-1 text-[11px] leading-none font-semibold text-white"
              {...NAV_BADGE_MOTION}
            >
              {action.badge}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </motion.button>
    </Tooltip>
  );
}

export function NavActionsContainer({ activeItem }) {
  const actions = useNavActions({ activeItem });

  return (
    <motion.div className="mr-2 flex shrink-0 items-center gap-1" {...NAV_ACTION_GROUP_MOTION}>
      <AnimatePresence initial={false}>
        {actions.map((action, index) => (
          <motion.div key={`${action.key || action.icon || 'nav-action'}-${index}`} {...getNavActionItemMotion(index)}>
            <NavAction action={action} />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
