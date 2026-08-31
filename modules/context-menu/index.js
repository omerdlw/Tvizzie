'use client';

import {
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

import { Z_INDEX } from '@/shared';
import { toFiniteNumber } from '@/shared';
import { MOTION_EASINGS, MOTION_SPRINGS } from '@/shared';
import Icon from '@/ui/primitives/icon';
import { REGISTRY_KEYS, useContextMenuRegistry, useNavRegistry } from '@/modules/registry';

const ContextMenuContext = createContext(null);

const INITIAL_POSITION = Object.freeze({ x: 0, y: 0 });
const CONTEXT_MENU_VISIBILITY_EVENT = 'tvizzie:context-menu-visibility';

function emitContextMenuVisibility(isOpen) {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent(CONTEXT_MENU_VISIBILITY_EVENT, {
      detail: { isOpen: Boolean(isOpen) },
    }),
  );
}

export function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
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
          x: Math.round(toFiniteNumber(configOrState.position.x, 0)),
          y: Math.round(toFiniteNumber(configOrState.position.y, 0)),
        }
      : { x: 0, y: 0 };

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
      x: Math.round(toFiniteNumber(x, 0)),
      y: Math.round(toFiniteNumber(y, 0)),
    },
  };
}

export function ContextMenuProvider({ children }) {
  const [menuState, setMenuState] = useState(createInitialMenuState);

  const openMenu = useCallback((configOrState, x, y) => {
    setMenuState(resolveNextOpenState(configOrState, x, y));
  }, []);

  const closeMenu = useCallback(() => {
    setMenuState((currentState) => {
      if (!currentState.isOpen) {
        return currentState;
      }

      if (typeof currentState.config?.onClose === 'function') {
        try {
          currentState.config.onClose(currentState.context);
        } catch (error) {
          console.error('[ContextMenu] Error executing onClose callback:', error);
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
    [menuState, openMenu, closeMenu],
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

const CONTEXT_MENU_EASINGS = Object.freeze({
  EMPHASIZED: MOTION_EASINGS.EMPHASIZED,
  SOFT: MOTION_EASINGS.SOFT,
  EXIT: MOTION_EASINGS.EXIT,
});

const CONTEXT_MENU_TIERS = Object.freeze({
  MICRO: { duration: 0.24, distance: 4, scaleDelta: 0.008, ease: CONTEXT_MENU_EASINGS.EMPHASIZED },
});

function toGpuTransform({ x = 0, y = 0, scale = 1 } = {}) {
  return `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
}

export const CONTEXT_MENU_MICRO_SPRING = MOTION_SPRINGS.PRESS;
export const CONTEXT_MENU_ITEM_TAP = Object.freeze({
  transform: toGpuTransform({ scale: 0.97 }),
});

export const menuContentVariants = Object.freeze({
  hidden: { opacity: 0, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    filter: 'blur(0px)',
    transition: {
      duration: CONTEXT_MENU_TIERS.MICRO.duration,
      ease: CONTEXT_MENU_EASINGS.SOFT,
      delay: 0.04,
    },
  },
  exit: {
    opacity: 0,
    filter: 'blur(3px)',
    transition: { duration: 0.18, ease: CONTEXT_MENU_EASINGS.EXIT },
  },
});

export const menuItemVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform({ y: CONTEXT_MENU_TIERS.MICRO.distance, scale: 0.992 }),
    filter: 'blur(4px)',
  },
  visible: (index = 0) => ({
    opacity: 1,
    transform: toGpuTransform(),
    filter: 'blur(0px)',
    transition: {
      duration: CONTEXT_MENU_TIERS.MICRO.duration,
      ease: CONTEXT_MENU_EASINGS.EMPHASIZED,
      delay: 0.04 + Math.min(Math.max(Number(index) || 0, 0) * 0.042, 0.21),
    },
  }),
  exit: {
    opacity: 0,
    transform: toGpuTransform({ y: -3, scale: 0.994 }),
    filter: 'blur(3px)',
    transition: { duration: 0.18, ease: CONTEXT_MENU_EASINGS.EXIT },
  },
});

export const menuPopVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform({ scale: 0.96 }),
    transformOrigin: 'top left',
    filter: 'blur(5px)',
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(),
    transformOrigin: 'top left',
    filter: 'blur(0px)',
    transition: {
      duration: CONTEXT_MENU_TIERS.MICRO.duration,
      ease: CONTEXT_MENU_EASINGS.EMPHASIZED,
    },
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform({ scale: 0.98 }),
    transformOrigin: 'top left',
    filter: 'blur(4px)',
    transition: { duration: 0.18, ease: CONTEXT_MENU_EASINGS.EXIT },
  },
});

export const CONTEXT_MENU_POP_VARIANTS = menuPopVariants;
export const CONTEXT_MENU_CONTENT_VARIANTS = menuContentVariants;
export const CONTEXT_MENU_ITEM_VARIANTS = menuItemVariants;

const CURRENT_PAGE_KEY = REGISTRY_KEYS.CONTEXT_MENU_CURRENT;
const GLOBAL_MENU_KEY = '*';

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === '') return [];
  return [value];
}

function resolveAsBoolean(value, context, defaultValue = true) {
  if (typeof value === 'function') {
    try {
      return Boolean(value(context));
    } catch {
      return false;
    }
  }

  if (value === undefined) {
    return defaultValue;
  }

  return Boolean(value);
}

function resolveAsValue(value, context, fallback = undefined) {
  if (typeof value === 'function') {
    try {
      const resolved = value(context);
      return resolved === undefined ? fallback : resolved;
    } catch {
      return fallback;
    }
  }

  return value === undefined ? fallback : value;
}

function normalizeMenuCandidates(registryMenus) {
  const entries = Object.entries(registryMenus || {});
  const candidates = [];
  let order = 0;

  entries.forEach(([registryKey, rawConfig]) => {
    if (!isObject(rawConfig)) return;

    const { menus, ...sharedConfig } = rawConfig;
    const sharedClassNames = sharedConfig.classNames || {};
    const hasSharedItems =
      Array.isArray(sharedConfig.items) || typeof sharedConfig.items === 'function';

    if (hasSharedItems) {
      candidates.push({
        registryKey,
        config: sharedConfig,
        order: order++,
      });
    }

    const nestedMenus = toArray(menus).filter((menu) => isObject(menu));
    nestedMenus.forEach((menu) => {
      candidates.push({
        registryKey,
        config: {
          ...sharedConfig,
          ...menu,
          classNames: {
            ...sharedClassNames,
            ...(menu.classNames || {}),
          },
        },
        order: order++,
      });
    });

    if (!hasSharedItems && nestedMenus.length === 0) {
      candidates.push({
        registryKey,
        config: rawConfig,
        order: order++,
      });
    }
  });

  return candidates;
}

function isPathAllowed(config, registryKey, pathname) {
  if (!pathname) return true;

  const explicitPath = config.path;
  if (typeof explicitPath === 'string' && explicitPath) {
    return explicitPath === pathname;
  }

  const explicitPaths = toArray(config.paths || config.pathnames).filter(
    (path) => typeof path === 'string' && path,
  );
  if (explicitPaths.length > 0) {
    return explicitPaths.includes(pathname);
  }

  const matcher = config.pathMatcher;
  if (typeof matcher === 'function') {
    try {
      return Boolean(matcher(pathname));
    } catch {
      return false;
    }
  }

  return (
    registryKey === pathname || registryKey === CURRENT_PAGE_KEY || registryKey === GLOBAL_MENU_KEY
  );
}

function isWhenAllowed(config, event, pathname, targetElement, context) {
  if (typeof config.when === 'function') {
    try {
      return Boolean(
        config.when(event, {
          pathname,
          target: targetElement,
          context,
        }),
      );
    } catch {
      return false;
    }
  }

  if (config.when === undefined) return true;
  return Boolean(config.when);
}

function getMatchDepth(sourceElement, matchedElement) {
  let depth = 0;
  let node = sourceElement;

  while (node && node !== matchedElement) {
    node = node.parentElement;
    depth += 1;
  }

  return depth;
}

function getTargetScore(config, targetElement) {
  const selectors = toArray(config.target).filter(
    (selector) => typeof selector === 'string' && selector.trim(),
  );

  if (selectors.length === 0) return 0;
  if (!targetElement) return null;

  let minDepth = Infinity;

  selectors.forEach((selector) => {
    let matchedElement = null;
    try {
      matchedElement = targetElement.closest(selector);
    } catch {
      matchedElement = null;
    }

    if (matchedElement) {
      const depth = getMatchDepth(targetElement, matchedElement);
      if (depth < minDepth) {
        minDepth = depth;
      }
    }
  });

  if (minDepth === Infinity) return null;
  return Math.max(0, 100 - minDepth);
}

function getRouteScore(config, registryKey, pathname) {
  if (!pathname) return 0;

  if (
    config.path === pathname ||
    toArray(config.paths || config.pathnames).includes(pathname) ||
    registryKey === pathname
  ) {
    return 100;
  }

  if (registryKey === CURRENT_PAGE_KEY) return 70;
  if (registryKey === GLOBAL_MENU_KEY) return 40;
  return 10;
}

function buildMenuContext(config, event, pathname, targetElement) {
  const context = {
    currentTarget: event?.currentTarget ?? null,
    event,
    pathname: pathname || '',
    point: {
      x: Number(event?.clientX) || 0,
      y: Number(event?.clientY) || 0,
    },
    target: targetElement,
  };

  if (config.payload !== undefined) {
    context.payload = config.payload;
  }

  if (typeof config.resolvePayload === 'function') {
    try {
      const resolvedPayload = config.resolvePayload(event, context);
      if (resolvedPayload !== undefined) {
        context.payload = resolvedPayload;
      }
    } catch {}
  }

  if (typeof config.resolveContext === 'function') {
    try {
      const extraContext = config.resolveContext(event, context);
      if (isObject(extraContext)) {
        return {
          ...context,
          ...extraContext,
        };
      }
    } catch {
      return context;
    }
  }

  return context;
}

function normalizeMenuItem(item, index, context) {
  if (!item || item === false) {
    return null;
  }

  if (item === 'separator' || item.type === 'separator') {
    return {
      ...item,
      key: item.key || `separator-${index}`,
      type: 'separator',
    };
  }

  if (!isObject(item)) {
    return null;
  }

  const hidden = resolveAsBoolean(item.hidden, context, false);
  const visible = resolveAsBoolean(item.visible, context, true);

  if (hidden || !visible) {
    return null;
  }

  const labelValue = resolveAsValue(item.label, context, '');
  const label =
    typeof labelValue === 'string' || typeof labelValue === 'number' ? String(labelValue) : '';

  if (!label.trim()) {
    return null;
  }

  const iconValue = resolveAsValue(item.icon, context, null);
  const shortcutValue = resolveAsValue(item.shortcut, context, null);
  const classNameValue = resolveAsValue(item.className, context, '');
  const itemIconClassNameValue = resolveAsValue(item.itemIconClassName, context, '');

  const handler =
    typeof item.onSelect === 'function'
      ? item.onSelect
      : typeof item.onClick === 'function'
        ? item.onClick
        : null;

  return {
    ...item,
    closeOnSelect: item.closeOnSelect !== false,
    danger: resolveAsBoolean(item.danger, context, false),
    disabled: resolveAsBoolean(item.disabled, context, false),
    icon: typeof iconValue === 'string' ? iconValue : null,
    itemIconClassName: typeof itemIconClassNameValue === 'string' ? itemIconClassNameValue : '',
    key: item.key || `item-${index}`,
    label,
    onClick: handler,
    onSelect: handler,
    shortcut: typeof shortcutValue === 'string' ? shortcutValue : null,
    className: typeof classNameValue === 'string' ? classNameValue : '',
    type: 'action',
  };
}

function compactSeparators(items) {
  const compacted = [];

  items.forEach((item) => {
    if (!item) return;

    const previous = compacted[compacted.length - 1];
    if (item.type === 'separator' && (!previous || previous.type === 'separator')) {
      return;
    }

    compacted.push(item);
  });

  while (compacted.length && compacted[compacted.length - 1]?.type === 'separator') {
    compacted.pop();
  }

  return compacted;
}

export function resolveMenuItems(config, context) {
  const rawItems =
    typeof config?.items === 'function' ? resolveAsValue(config.items, context, []) : config?.items;
  const items = toArray(rawItems)
    .map((item, index) => normalizeMenuItem(item, index, context))
    .filter(Boolean);

  return compactSeparators(items);
}

function resolveEventTarget(event) {
  if (!event) return null;
  const isHtmlElement = typeof Element !== 'undefined' && event?.target instanceof Element;
  const isSvgElement = typeof SVGElement !== 'undefined' && event?.target instanceof SVGElement;
  const initialTarget = isHtmlElement || isSvgElement ? event.target : null;

  if (
    typeof document === 'undefined' ||
    !Number.isFinite(event.clientX) ||
    !Number.isFinite(event.clientY)
  ) {
    return initialTarget;
  }

  if (
    !initialTarget ||
    initialTarget.closest?.('[data-context-menu-ignore]') ||
    initialTarget.closest?.('[data-context-menu-overlay]') ||
    initialTarget.closest?.('[role="menu"]') ||
    initialTarget.classList?.contains('context-menu-overlay')
  ) {
    try {
      const elements = document.elementsFromPoint(event.clientX, event.clientY);
      for (const el of elements) {
        if (
          el.closest?.('[data-context-menu-ignore]') ||
          el.closest?.('[data-context-menu-overlay]') ||
          el.closest?.('[role="menu"]') ||
          el.classList?.contains('context-menu-overlay')
        ) {
          continue;
        }
        return el;
      }
    } catch {
      return initialTarget;
    }
  }

  return initialTarget;
}

export function resolveContextMenu(registryMenus, pathname, event) {
  const candidates = normalizeMenuCandidates(registryMenus);
  const targetElement = resolveEventTarget(event);

  let winner = null;

  candidates.forEach((candidate) => {
    const { config, registryKey, order } = candidate;

    if (!isObject(config)) return;
    if (!isPathAllowed(config, registryKey, pathname)) return;

    const context = buildMenuContext(config, event, pathname, targetElement);

    if (!resolveAsBoolean(config.enabled, context, true)) return;
    if (!isWhenAllowed(config, event, pathname, targetElement, context)) return;

    const items = resolveMenuItems(config, context);
    if (items.length === 0) return;

    const targetScore = getTargetScore(config, targetElement);
    if (targetScore === null) return;

    const routeScore = getRouteScore(config, registryKey, pathname);
    const priority = Number.isFinite(Number(config.priority)) ? Number(config.priority) : 0;
    const score = priority * 10000 + routeScore * 100 + targetScore;

    if (!winner || score > winner.score || (score === winner.score && order < winner.order)) {
      winner = { config, context, items, score, order };
    }
  });

  return winner;
}

const MENU_SCREEN_MARGIN = 10;
const CONTEXT_MENU_LAYOUT = Object.freeze({
  wrapperRadius: 24,
  wrapperPadding: 10,
});

function joinClassNames(...values) {
  return values.filter(Boolean).join(' ');
}

function getContextMenuMetrics() {
  const { wrapperRadius, wrapperPadding } = CONTEXT_MENU_LAYOUT;

  return {
    headerIconRadius: 14,
    itemRadius: 12,
    wrapperPadding,
    wrapperRadius,
  };
}

function isImageIconSource(icon) {
  return (
    typeof icon === 'string' &&
    (icon.startsWith('http') || icon.startsWith('/') || icon.startsWith('data:image/'))
  );
}

export function extractNodeText(value) {
  if (value === null || value === undefined || typeof value === 'boolean') {
    return '';
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).trim();
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => extractNodeText(item))
      .filter(Boolean)
      .join(' ')
      .trim();
  }

  if (isValidElement(value)) {
    return extractNodeText(value.props?.children);
  }

  return '';
}

function resolveHeaderValue(value, context, fallback = null) {
  if (typeof value !== 'function') {
    return value === undefined ? fallback : value;
  }

  try {
    const resolved = value(context);
    return resolved === undefined ? fallback : resolved;
  } catch {
    return fallback;
  }
}

function resolveMenuHeader(config, menuContext) {
  if (config?.header === false || config?.showPageHeader === false) {
    return null;
  }

  const resolvedHeader = resolveHeaderValue(config?.header, menuContext, null);
  const headerSource = isObject(resolvedHeader)
    ? resolvedHeader
    : isObject(menuContext?.page)
      ? menuContext.page
      : null;

  if (!headerSource) {
    return null;
  }

  const title = resolveHeaderValue(headerSource.title, menuContext, null);
  const description = resolveHeaderValue(headerSource.description, menuContext, null);
  const icon = resolveHeaderValue(headerSource.icon, menuContext, null);
  const eyebrow = resolveHeaderValue(headerSource.eyebrow, menuContext, null);

  if (!title && !description && !icon && !eyebrow) {
    return null;
  }

  return {
    description,
    descriptionText: extractNodeText(description),
    eyebrow,
    icon,
    title,
    titleText: extractNodeText(title),
  };
}

function positionMenu(menuElement, position) {
  if (!menuElement) return;

  const rect = menuElement.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  let x = Number(position?.x) || 0;
  let y = Number(position?.y) || 0;

  if (x + rect.width > viewportWidth - MENU_SCREEN_MARGIN) {
    x = viewportWidth - rect.width - MENU_SCREEN_MARGIN;
  }

  if (y + rect.height > viewportHeight - MENU_SCREEN_MARGIN) {
    y = viewportHeight - rect.height - MENU_SCREEN_MARGIN;
  }

  menuElement.style.left = `${Math.round(Math.max(MENU_SCREEN_MARGIN, x))}px`;
  menuElement.style.top = `${Math.round(Math.max(MENU_SCREEN_MARGIN, y))}px`;
}

function isScrollLockKey(event) {
  return (
    event.key === 'ArrowDown' ||
    event.key === 'ArrowUp' ||
    event.key === 'PageDown' ||
    event.key === 'PageUp' ||
    event.key === 'Home' ||
    event.key === 'End' ||
    event.key === ' ' ||
    event.key === 'Spacebar'
  );
}

function ContextMenuHeaderIcon({ classNames, icon }) {
  const iconClassName = joinClassNames(
    'flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[14px] ring-1 ring-inset ring-white/10 bg-white/5 bg-cover bg-center bg-no-repeat text-white/70',
    classNames.headerIcon,
  );

  if (isImageIconSource(icon)) {
    return <div className={iconClassName} style={{ backgroundImage: `url(${icon})` }} />;
  }

  return (
    <div className={iconClassName}>
      {typeof icon === 'string' ? <Icon icon={icon} size={20} /> : icon}
    </div>
  );
}

function ContextMenuHeader({ classNames, header }) {
  if (!header) return null;

  const containerClassName = joinClassNames(
    'mb-2 flex items-center gap-2.5 border-b border-white/10 px-1 pb-2.5',
    classNames.header,
  );

  const eyebrowClassName = joinClassNames(
    'text-xs font-semibold text-white/40 uppercase',
    classNames.headerEyebrow,
  );

  const titleClassName = joinClassNames(
    'truncate text-sm leading-tight font-semibold text-white',
    classNames.headerTitle,
  );

  const descriptionClassName = joinClassNames(
    'text-xs leading-snug text-white/70',
    classNames.headerDescription,
  );

  return (
    <div className={containerClassName}>
      {header.icon ? <ContextMenuHeaderIcon classNames={classNames} icon={header.icon} /> : null}
      <div className="h-full w-full min-w-0 space-y-0.5">
        {header.eyebrow ? <div className={eyebrowClassName}>{header.eyebrow}</div> : null}
        {header.title ? <div className={titleClassName}>{header.title}</div> : null}
        {header.description ? (
          <div className={descriptionClassName}>{header.description}</div>
        ) : null}
      </div>
    </div>
  );
}

function ContextMenuItem({ classNames, isActive, item, onHover, onSelect, setButtonRef }) {
  if (item.type === 'separator') {
    return (
      <div
        className={joinClassNames('mx-1 my-1.5 h-px bg-white/10', classNames.separator)}
        role="separator"
      />
    );
  }

  const itemClassName = joinClassNames(
    'group flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm font-medium text-white/70 transition-all duration-200 ease-in-out hover:bg-white/10 hover:text-white focus-visible:outline-none data-[active=true]:bg-white/10 data-[active=true]:text-white disabled:pointer-events-none disabled:opacity-50',
    classNames.item,
    item.className,
    item.danger &&
      'text-error hover:bg-error/15 hover:text-error data-[active=true]:bg-error/15 data-[active=true]:text-error',
    item.danger && classNames.itemDanger,
  );

  const itemIconClassName = joinClassNames(
    'shrink-0 text-white/40 transition-colors duration-200 ease-in-out group-hover:text-white/70',
    item.danger && 'text-error/80 group-hover:text-error',
    classNames.itemIcon,
    item.itemIconClassName,
  );

  return (
    <motion.button
      ref={setButtonRef}
      className={itemClassName}
      data-active={isActive ? 'true' : undefined}
      aria-disabled={item.disabled}
      disabled={item.disabled}
      role="menuitem"
      type="button"
      whileTap={CONTEXT_MENU_ITEM_TAP}
      transition={CONTEXT_MENU_MICRO_SPRING}
      onMouseEnter={onHover}
      onClick={(event) => onSelect(item, event)}
    >
      {item.icon ? <Icon icon={item.icon} className={itemIconClassName} size={18} /> : null}
      <span className={joinClassNames('grow truncate', classNames.itemLabel)}>{item.label}</span>
      {item.shortcut ? (
        <span
          className={joinClassNames(
            'ml-2 shrink-0 rounded-md bg-white/5 px-1.5 py-0.5 text-xs text-white/40 uppercase ring-1 ring-white/10 ring-inset',
            classNames.itemShortcut,
          )}
        >
          {item.shortcut}
        </span>
      ) : null}
    </motion.button>
  );
}

function ContextMenuContent({ config, items, menuContext, position, onClose }) {
  const menuRef = useRef(null);
  const itemRefs = useRef([]);
  const classNames = isObject(config.classNames) ? config.classNames : {};
  const metrics = useMemo(() => getContextMenuMetrics(), []);
  const header = useMemo(() => resolveMenuHeader(config, menuContext), [config, menuContext]);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    setActiveIndex(-1);
    itemRefs.current = [];
  }, [items]);

  useLayoutEffect(() => {
    if (menuRef.current) {
      positionMenu(menuRef.current, position);
    }
  }, [header, items, position]);

  useEffect(() => {
    if (activeIndex < 0) {
      menuRef.current?.focus({ preventScroll: true });
      return;
    }

    itemRefs.current[activeIndex]?.focus({ preventScroll: true });
  }, [activeIndex]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('keydown', handleEscape, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('keydown', handleEscape, true);
    };
  }, [onClose]);

  useEffect(() => {
    const preventScroll = (event) => {
      event.preventDefault();
    };

    const preventScrollKeys = (event) => {
      if (menuRef.current?.contains(event.target)) {
        return;
      }

      if (isScrollLockKey(event)) {
        event.preventDefault();
      }
    };

    const listenerOptions = { capture: true, passive: false };

    window.addEventListener('wheel', preventScroll, listenerOptions);
    window.addEventListener('touchmove', preventScroll, listenerOptions);
    document.addEventListener('keydown', preventScrollKeys, true);

    return () => {
      window.removeEventListener('wheel', preventScroll, true);
      window.removeEventListener('touchmove', preventScroll, true);
      document.removeEventListener('keydown', preventScrollKeys, true);
    };
  }, []);

  const handleItemSelect = useCallback(
    (item, event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();

      if (item?.disabled) return;

      const handler = item?.onSelect || item?.onClick;

      if (typeof handler === 'function') {
        try {
          handler(event, menuContext);
        } catch (error) {
          console.error('[ContextMenu] Error executing menu item handler:', error);
        }
      }

      if (item?.closeOnSelect !== false) {
        onClose?.();
      }
    },
    [menuContext, onClose],
  );

  const handleMenuKeyDown = useCallback(
    (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((prev) => {
          const nextIndex = items.findIndex(
            (item, index) => index > prev && item.type === 'action' && !item.disabled,
          );

          return nextIndex !== -1
            ? nextIndex
            : items.findIndex((item) => item.type === 'action' && !item.disabled);
        });
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((prev) => {
          let lastValidIndex = -1;
          for (let i = items.length - 1; i >= 0; i--) {
            const item = items[i];
            if (item.type === 'action' && !item.disabled) {
              if (prev === -1 || i < prev) {
                return i;
              }
              if (lastValidIndex === -1) {
                lastValidIndex = i;
              }
            }
          }
          return lastValidIndex;
        });
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        if (activeIndex >= 0 && items[activeIndex]) {
          event.preventDefault();
          handleItemSelect(items[activeIndex], event);
        }
      }
    },
    [activeIndex, items, handleItemSelect, onClose],
  );

  return (
    <div>
      <div
        data-context-menu-overlay
        className={joinClassNames('fixed inset-0', classNames.overlay)}
        onMouseDown={onClose}
        style={{ zIndex: Z_INDEX.DEBUG_OVERLAY - 1 }}
      />
      <motion.div
        ref={menuRef}
        data-context-menu-ignore
        variants={menuPopVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className={joinClassNames(
          'max-w-sm min-w-64 overflow-hidden rounded-[24px] bg-black/80 shadow-[0_18px_56px_rgba(0,0,0,0.50)] ring-1 ring-white/10 backdrop-blur-xl ring-inset',
          classNames.content,
        )}
        role="menu"
        tabIndex={-1}
        style={{
          left: position?.x || 0,
          padding: `${metrics.wrapperPadding}px`,
          position: 'fixed',
          top: position?.y || 0,
          zIndex: Z_INDEX.DEBUG_OVERLAY,
        }}
        onMouseLeave={() => setActiveIndex(-1)}
        onKeyDown={handleMenuKeyDown}
      >
        <motion.div variants={menuContentVariants} initial="hidden" animate="visible">
          <ContextMenuHeader classNames={classNames} header={header} />
        </motion.div>
        {items.map((item, index) => (
          <motion.div
            key={item.key || `menu-item-${index}`}
            variants={menuItemVariants}
            custom={index}
            initial="hidden"
            animate="visible"
          >
            <ContextMenuItem
              item={item}
              classNames={classNames}
              isActive={index === activeIndex}
              onHover={() => {
                if (item.type === 'action' && !item.disabled) {
                  setActiveIndex(index);
                }
              }}
              setButtonRef={(node) => {
                itemRefs.current[index] = node;
              }}
              onSelect={handleItemSelect}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

export function ContextMenuRenderer() {
  const { menuConfig, menuContext, menuItems, position, isOpen, closeMenu } = useContextMenu();

  if (typeof document === 'undefined') return null;

  const resolvedItems =
    Array.isArray(menuItems) && menuItems.length > 0
      ? menuItems
      : resolveMenuItems(menuConfig, menuContext);

  return createPortal(
    <AnimatePresence>
      {isOpen && menuConfig && resolvedItems.length > 0 ? (
        <ContextMenuContent
          key="context-menu-content"
          config={menuConfig}
          items={resolvedItems}
          menuContext={menuContext}
          position={position}
          onClose={closeMenu}
        />
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

function resolveContextMenuPageMeta(navItem, pathname = '') {
  if (!isObject(navItem)) {
    return null;
  }

  const title = navItem.contextMenuTitle ?? navItem.title ?? null;
  const description = navItem.contextMenuDescription ?? navItem.description ?? null;
  const eyebrow = navItem.contextMenuEyebrow ?? navItem.eyebrow ?? null;
  const icon = navItem.contextMenuIcon ?? navItem.icon ?? null;
  const path = typeof navItem.path === 'string' && navItem.path ? navItem.path : pathname;
  const titleText =
    extractNodeText(title) || (typeof navItem.name === 'string' ? navItem.name : '') || '';
  const descriptionText = extractNodeText(description);

  if (!title && !description && !icon && !eyebrow) {
    return null;
  }

  return {
    description,
    descriptionText,
    eyebrow,
    icon,
    path,
    title,
    titleText,
  };
}

function invokeSafely(handler, ...args) {
  if (typeof handler !== 'function') {
    return undefined;
  }

  try {
    return handler(...args);
  } catch {
    return undefined;
  }
}

function mergeContextMenuPageMeta(context, pageMeta) {
  if (!pageMeta) {
    return context;
  }

  return {
    ...(isObject(context) ? context : {}),
    page: pageMeta,
  };
}

function mergeOpenResult(context, openResult) {
  if (!isObject(openResult)) {
    return context;
  }

  return {
    ...context,
    ...openResult,
  };
}

export function useContextMenuListener() {
  const { getAll } = useContextMenuRegistry();
  const { get: getNavItem } = useNavRegistry();
  const { openMenu } = useContextMenu();
  const pathname = usePathname();

  useEffect(() => {
    const handleContextMenu = (event) => {
      const resolvedMenu = resolveContextMenu(getAll(), pathname, event);

      if (!resolvedMenu) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const pageMeta = resolveContextMenuPageMeta(getNavItem(pathname), pathname);
      let nextContext = mergeContextMenuPageMeta(resolvedMenu.context, pageMeta);
      const onOpenResult = invokeSafely(resolvedMenu.config?.onOpen, event, nextContext);

      if (onOpenResult === false) {
        return;
      }

      nextContext = mergeOpenResult(nextContext, onOpenResult);

      const nextItems = resolveMenuItems(resolvedMenu.config, nextContext);

      if (!nextItems.length) {
        return;
      }

      openMenu({
        config: resolvedMenu.config,
        context: nextContext,
        items: nextItems,
        position: {
          x: event.clientX,
          y: event.clientY,
        },
      });
    };

    document.addEventListener('contextmenu', handleContextMenu, true);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, true);
    };
  }, [getAll, getNavItem, openMenu, pathname]);
}

export function ContextMenuGlobal() {
  useContextMenuListener();
  return <ContextMenuRenderer />;
}
