'use client';

import { memo, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

import { useAuth, useAuthSessionReady } from '@/modules/auth';
import { useBackgroundActions, useBackgroundState } from '@/modules/background/background-context';
import { useModal } from '@/modules/modal/modal-context';
import {
  NAV_BADGE_TRANSITION,
  NAV_BUTTON_TRANSITION,
  NAV_STAGGER_DELAY,
  NAV_STAGGER_TRANSITION,
  NAV_TAP_SCALE,
  staggerItemVariants,
} from '@/modules/nav/motion';
import { useToast } from '@/modules/notification/notification-hooks';
import { useNavRuntimeRegistry } from '@/modules/registry';
import Tooltip from '@/ui/primitives/tooltip';
import Icon from '@/ui/primitives/icon';

// --- CONSTANTS ---

export const NAV_ACTION_KEYS = Object.freeze({
  NOTIFICATIONS: 'notifications',
  LOGOUT: 'logout',
  SCROLL_TOP: 'scroll-top',
  TOGGLE_MUTE: 'toggle-mute',
  SETTINGS: 'settings',
});

export const NAV_ACTION_ORDER = Object.freeze({
  NOTIFICATIONS: -10,
  SETTINGS: 0,
  TOGGLE_MUTE: 10,
  SCROLL_TOP: 20,
  LOGOUT: 30,
});

// --- HELPER FUNCTIONS ---

function stopPropagation(event) {
  event.stopPropagation();
}

function normalizeToolbarActions(actions) {
  if (!actions) return [];
  const actionList = Array.isArray(actions) ? actions : [actions];
  return actionList.map((action, index) => ({
    key: action.key ?? `action-${index}`,
    ...action,
  }));
}

function getVisibleToolbarActions(actions) {
  return actions.filter((action) => action.visible !== false);
}

function sortToolbarActionsByOrder(actions) {
  return [...actions].sort((a, b) => (b.order ?? 0) - (a.order ?? 0));
}

function isActionlessNavItem(activeItem) {
  return Boolean(
    activeItem?.isNotFound ||
    activeItem?.path === 'not-found' ||
    activeItem?.isMasked ||
    activeItem?.isSurface,
  );
}

function isStatusToolbarActionAllowed(activeItem) {
  return activeItem?.type === 'APP_ERROR' || activeItem?.type === 'API_ERROR';
}

function filterContextToolbarActions(actions, activeItem) {
  return actions.filter((action) => {
    if (action.key === NAV_ACTION_KEYS.LOGOUT && activeItem?.hideLogout) return false;
    if (action.key === NAV_ACTION_KEYS.SETTINGS && activeItem?.hideSettings) return false;
    if (action.key === NAV_ACTION_KEYS.SCROLL_TOP && activeItem?.hideScroll) return false;
    return true;
  });
}

// --- CUSTOM HOOKS ---

function useDefaultNavActions() {
  const router = useRouter();
  const toast = useToast();
  const { openModal } = useModal();
  const runtime = useNavRuntimeRegistry();
  const { isVideo, videoElement } = useBackgroundState();
  const { toggleMute } = useBackgroundActions();
  const { isAuthenticated, isReady, signOut, user } = useAuth();

  const userId = isAuthenticated ? (user?.id ?? null) : null;
  const isAuthSessionReady = useAuthSessionReady(userId);
  const [unreadCount, setUnreadCount] = useState(0);

  const isSignedIn = Boolean(isAuthenticated);
  const canOpenNotifications = Boolean(isAuthenticated && user?.id);
  const isMuted = Boolean(videoElement?.muted);

  const unreadBadge = unreadCount > 0 ? (unreadCount > 99 ? '99+' : `${unreadCount}`) : null;
  const subscribeToUnreadCount = runtime?.integrations?.notifications?.subscribeToUnreadCount;

  useEffect(() => {
    if (
      !isReady ||
      !isAuthSessionReady ||
      !isAuthenticated ||
      !user?.id ||
      typeof subscribeToUnreadCount !== 'function'
    ) {
      setUnreadCount(0);
      return;
    }

    return subscribeToUnreadCount(user.id, setUnreadCount);
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
            data: { userId: user?.id ?? null },
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
    ],
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
      filterContextToolbarActions(
        getVisibleToolbarActions([...defaultActions, ...extendedActions]),
        activeItem,
      ),
    );
  }, [activeItem, defaultActions]);
}

// --- COMPONENTS ---

export const NavAction = memo(function NavAction({ action }) {
  return (
    <Tooltip className="px-2" text={action.tooltip}>
      <motion.button
        className="center relative cursor-pointer rounded-[10px] p-1 text-black/70 hover:bg-black/5 hover:text-black"
        onClick={action.onClick}
        type="button"
        whileTap={{ scale: NAV_TAP_SCALE }}
        transition={NAV_BUTTON_TRANSITION}
      >
        <Icon icon={action.icon} size={16} />
        <AnimatePresence mode="popLayout">
          {action.badge && (
            <motion.span
              key={action.badge}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={NAV_BADGE_TRANSITION}
              className="center bg-info absolute -top-1 -right-1 h-4 min-w-4 rounded-full p-1 text-[11px] leading-none font-semibold text-white"
            >
              {action.badge}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </Tooltip>
  );
});

export const NavActionsContainer = memo(function NavActionsContainer({ activeItem }) {
  const actions = useNavActions({ activeItem });

  if (!actions.length) return null;

  return (
    <div className="mr-2 flex shrink-0 items-center gap-1">
      <AnimatePresence mode="popLayout">
        {actions.map((action, index) => (
          <motion.div
            key={action.key || action.icon || `nav-action-${index}`}
            variants={staggerItemVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{
              ...NAV_STAGGER_TRANSITION,
              delay: index * NAV_STAGGER_DELAY,
            }}
          >
            <NavAction action={action} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
});
