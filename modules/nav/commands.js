'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

import { NAV_ACTION_KEYS, NAV_ACTION_ORDER } from './constants';
import {
  filterContextToolbarActions,
  getVisibleToolbarActions,
  isActionlessNavItem,
  isStatusToolbarActionAllowed,
  normalizeToolbarActions,
  sortToolbarActionsByOrder,
  toArray,
} from './utils';
import {
  getNavActionStaggerTransition,
  NAV_BADGE_TRANSITION,
  navBadgeVariants,
  staggerItemVariants,
} from './motion';
import { useAuth, useAuthSessionReady } from '@/modules/auth';
import { useModal } from '../modal';
import { useToast } from '../notification';
import { useNavRuntimeRegistry } from '../registry';
import { cn } from '@/ui/class-names';
import { Button, Tooltip } from '@/ui/primitives';
import Iconify from '@/ui/primitives/icon';

function stopCommandPropagation(event) {
  event?.stopPropagation?.();
}

function createCommandEntries(commands) {
  const entries = {};

  for (const [index, command] of toArray(commands).entries()) {
    if (!command) continue;
    const key = command.key || `context-action-${index}`;
    entries[key] = { key, ...command };
  }

  return entries;
}

function areCommandEntriesEqual(currentEntries, nextEntries) {
  const currentKeys = Object.keys(currentEntries);
  const nextKeys = Object.keys(nextEntries);

  if (currentKeys.length !== nextKeys.length) return false;

  return nextKeys.every((key) => {
    const currentEntry = currentEntries[key];
    const nextEntry = nextEntries[key];

    if (!currentEntry || !nextEntry) return false;

    const currentEntryKeys = Object.keys(currentEntry);
    const nextEntryKeys = Object.keys(nextEntry);
    return (
      currentEntryKeys.length === nextEntryKeys.length &&
      nextEntryKeys.every((entryKey) => Object.is(currentEntry[entryKey], nextEntry[entryKey]))
    );
  });
}

/**
 * Owns route-scoped navigation command registrations.
 * @returns {{
 *   contextCommands: Array<object>,
 *   registerCommand: Function,
 *   unregisterCommand: Function,
 *   setCommands: Function,
 *   clearCommands: Function,
 * }} Command registry state and mutations
 */
export function useNavCommandRegistry() {
  const [commandEntries, setCommandEntries] = useState({});
  const generatedCommandIdRef = useRef(0);

  const registerCommand = useCallback((command) => {
    if (!command) return;
    const key = command.key || `context-action-${++generatedCommandIdRef.current}`;
    setCommandEntries((currentEntries) => {
      if (currentEntries[key] === command) return currentEntries;
      return { ...currentEntries, [key]: { key, ...command } };
    });
  }, []);

  const unregisterCommand = useCallback((key) => {
    if (!key) return;
    setCommandEntries((currentEntries) => {
      if (!currentEntries[key]) return currentEntries;
      const nextEntries = { ...currentEntries };
      delete nextEntries[key];
      return nextEntries;
    });
  }, []);

  const setCommands = useCallback((commands) => {
    if (!commands) {
      setCommandEntries({});
      return;
    }

    const nextEntries = createCommandEntries(commands);

    setCommandEntries((currentEntries) =>
      areCommandEntriesEqual(currentEntries, nextEntries) ? currentEntries : nextEntries,
    );
  }, []);

  const clearCommands = useCallback(() => {
    setCommandEntries((currentEntries) =>
      Object.keys(currentEntries).length === 0 ? currentEntries : {},
    );
  }, []);

  const contextCommands = useMemo(() => Object.values(commandEntries), [commandEntries]);

  return {
    clearCommands,
    contextCommands,
    registerCommand,
    setCommands,
    unregisterCommand,
  };
}

// ── Command resolution and rendering ──────────────────────────────────────────

function useDefaultNavCommands() {
  const router = useRouter();
  const toast = useToast();
  const { openModal, closeModal, isOpen, modalType } = useModal();
  const runtime = useNavRuntimeRegistry();
  const { isAuthenticated, isReady, signOut, user } = useAuth();

  const userId = isAuthenticated ? (user?.id ?? null) : null;
  const isAuthSessionReady = useAuthSessionReady(userId);
  const [unreadCount, setUnreadCount] = useState(0);

  const isSignedIn = Boolean(isAuthenticated);
  const canOpenNotifications = Boolean(isAuthenticated && user?.id);

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
          stopCommandPropagation(event);
          if (isOpen && modalType === 'NOTIFICATIONS_MODAL') {
            closeModal();
            return;
          }
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
          stopCommandPropagation(event);

          try {
            await signOut();
            router.replace('/');
          } catch (error) {
            toast.error(error?.message || 'Could not sign out');
          }
        },
      },
    ],
    [
      canOpenNotifications,
      isSignedIn,
      toast,
      openModal,
      closeModal,
      isOpen,
      modalType,
      unreadBadge,
      router,
      signOut,
      user?.id,
    ],
  );
}

function useNavCommands({ activeItem, contextCommands = [] } = {}) {
  const defaultCommands = useDefaultNavCommands();

  return useMemo(() => {
    if (isActionlessNavItem(activeItem)) {
      return [];
    }

    const extendedCommands = normalizeToolbarActions(activeItem?.actions);
    const dynamicContextCommands = normalizeToolbarActions(contextCommands);

    if (activeItem?.isStatus) {
      if (!isStatusToolbarActionAllowed(activeItem)) {
        return [];
      }

      return sortToolbarActionsByOrder(
        getVisibleToolbarActions([...extendedCommands, ...dynamicContextCommands]),
      );
    }

    return sortToolbarActionsByOrder(
      filterContextToolbarActions(
        getVisibleToolbarActions([
          ...defaultCommands,
          ...extendedCommands,
          ...dynamicContextCommands,
        ]),
        activeItem,
      ),
    );
  }, [activeItem, contextCommands, defaultCommands]);
}

const NavCommand = memo(function NavCommand({ action }) {
  return (
    <Tooltip className="px-2" text={action.tooltip}>
      <Button
        className="center relative size-8 cursor-pointer rounded-xl p-1 text-white/70 hover:bg-white/10 hover:text-white"
        onClick={action.onClick}
        type="button"
        disabled={action.disabled}
        aria-label={action.tooltip}
      >
        <Iconify icon={action.icon} size={16} />
        <AnimatePresence mode="popLayout">
          {action.badge && (
            <motion.span
              key={action.badge}
              variants={navBadgeVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={NAV_BADGE_TRANSITION}
              className="center bg-info absolute -top-1 -right-1 h-4 min-w-4 rounded-full p-1 text-xs leading-none font-semibold text-black"
            >
              {action.badge}
            </motion.span>
          )}
        </AnimatePresence>
      </Button>
    </Tooltip>
  );
});

/** Renders the current card's resolved navigation commands. */
export const NavCommandBar = memo(function NavCommandBar({ activeItem, contextCommands = [] }) {
  const actions = useNavCommands({ activeItem, contextCommands });

  if (!actions.length) return null;

  return (
    <div className="mr-1 flex shrink-0 items-center">
      <AnimatePresence mode="popLayout">
        {actions.map((action, index) => (
          <motion.div
            key={action.key || action.icon || `nav-action-${index}`}
            variants={staggerItemVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={getNavActionStaggerTransition(index)}
          >
            <NavCommand action={action} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
});
