'use client';

import { createContext, useCallback, useContext, useState, useMemo, useEffect } from 'react';

const ContextMenuContext = createContext(null);

const INITIAL_POSITION = Object.freeze({ x: 0, y: 0 });
const CONTEXT_MENU_VISIBILITY_EVENT = 'tvizzie:context-menu-visibility';

function emitContextMenuVisibility(isOpen) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(CONTEXT_MENU_VISIBILITY_EVENT, {
      detail: {
        isOpen: Boolean(isOpen),
      },
    })
  );
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function createInitialMenuState() {
  return {
    config: null,
    context: null,
    isOpen: false,
    items: [],
    position: INITIAL_POSITION,
  };
}

function resolveNextOpenState(configOrState, x, y) {
  if (
    isObject(configOrState) &&
    (Object.prototype.hasOwnProperty.call(configOrState, 'config') ||
      Object.prototype.hasOwnProperty.call(configOrState, 'menuConfig'))
  ) {
    const config = configOrState.config || configOrState.menuConfig || null;

    if (!config) {
      return createInitialMenuState();
    }

    const resolvedPosition = isObject(configOrState.position)
      ? {
          x: toFiniteNumber(configOrState.position.x, 0),
          y: toFiniteNumber(configOrState.position.y, 0),
        }
      : {
          x: 0,
          y: 0,
        };

    return {
      config,
      context: configOrState.context || null,
      isOpen: true,
      items: Array.isArray(configOrState.items) ? configOrState.items : [],
      position: resolvedPosition,
    };
  }

  if (!isObject(configOrState)) {
    return createInitialMenuState();
  }

  return {
    config: configOrState,
    context: null,
    isOpen: true,
    items: [],
    position: {
      x: toFiniteNumber(x, 0),
      y: toFiniteNumber(y, 0),
    },
  };
}

export function ContextMenuProvider({ children }) {
  const [menuState, setMenuState] = useState(createInitialMenuState);

  const openMenu = useCallback((configOrState, x, y) => {
    emitContextMenuVisibility(true);
    setMenuState(resolveNextOpenState(configOrState, x, y));
  }, []);

  const closeMenu = useCallback(() => {
    emitContextMenuVisibility(false);
    setMenuState((currentState) => {
      if (!currentState.isOpen) {
        return currentState;
      }

      if (typeof currentState.config?.onClose === 'function') {
        try {
          currentState.config.onClose(currentState.context);
        } catch {
          // no-op: closing should not throw
        }
      }

      return createInitialMenuState();
    });
  }, []);

  const value = useMemo(
    () => ({
      menuConfig: menuState.config,
      menuContext: menuState.context,
      menuItems: menuState.items,
      position: menuState.position,
      isOpen: menuState.isOpen,
      openMenu,
      closeMenu,
    }),
    [menuState, openMenu, closeMenu]
  );

  useEffect(() => {
    emitContextMenuVisibility(menuState.isOpen);
  }, [menuState.isOpen]);

  return <ContextMenuContext.Provider value={value}>{children}</ContextMenuContext.Provider>;
}

export function useContextMenu() {
  const context = useContext(ContextMenuContext);
  if (!context) {
    throw new Error('useContextMenu must be used within ContextMenuProvider');
  }
  return context;
}
