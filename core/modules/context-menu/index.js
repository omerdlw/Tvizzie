'use client';

import { isValidElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { usePathname } from 'next/navigation';

import { createPortal } from 'react-dom';

import { Z_INDEX } from '@/core/constants';
import { useContextMenuRegistry, useNavRegistry } from '@/core/modules/registry/context';
import Icon from '@/ui/icon';

import { useContextMenu } from './context';
import { isObject, resolveContextMenu, resolveMenuItems } from './menu-engine';

const MENU_SCREEN_MARGIN = 10;

function isImageIconSource(icon) {
  return (
    typeof icon === 'string' && (icon.startsWith('http') || icon.startsWith('/') || icon.startsWith('data:image/'))
  );
}

function extractNodeText(value) {
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

function resolveContextMenuPageMeta(navItem, pathname = '') {
  if (!isObject(navItem)) {
    return null;
  }

  const title = navItem.contextMenuTitle ?? navItem.title ?? null;
  const description = navItem.contextMenuDescription ?? navItem.description ?? null;
  const eyebrow = navItem.contextMenuEyebrow ?? navItem.eyebrow ?? null;
  const icon = navItem.contextMenuIcon ?? navItem.icon ?? null;
  const path = typeof navItem.path === 'string' && navItem.path ? navItem.path : pathname;
  const titleText = extractNodeText(title) || (typeof navItem.name === 'string' ? navItem.name : '') || '';
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
    eyebrow,
    icon,
    title,
  };
}

function getActionableIndexes(items = []) {
  const indexes = [];

  items.forEach((item, index) => {
    if (item?.type === 'action' && !item?.disabled) {
      indexes.push(index);
    }
  });

  return indexes;
}

function getNextActionableIndex(currentIndex, direction, indexes = []) {
  if (!indexes.length) return -1;

  const currentPointer = indexes.indexOf(currentIndex);

  if (currentPointer === -1) {
    return direction > 0 ? indexes[0] : indexes[indexes.length - 1];
  }

  const nextPointer = (currentPointer + direction + indexes.length) % indexes.length;
  return indexes[nextPointer];
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

function ContextMenuHeaderIcon({ classNames, icon }) {
  const iconClassName = [
    'flex size-10 shrink-0 items-center bg-center bg-cover justify-center overflow-hidden rounded-[12px] bg-black/5 text-black/60',
    classNames.headerIcon,
  ]
    .filter(Boolean)
    .join(' ');

  if (isImageIconSource(icon)) {
    return <div className={iconClassName} style={{ backgroundImage: `url(${icon})` }} />;
  }

  return <div className={iconClassName}>{typeof icon === 'string' ? <Icon icon={icon} size={20} /> : icon}</div>;
}

function ContextMenuHeader({ classNames, header }) {
  if (!header) {
    return null;
  }

  const containerClassName = ['mb-1.5 flex items-center gap-2 border-b border-black/10 pb-2', classNames.header]
    .filter(Boolean)
    .join(' ');
  const eyebrowClassName = ['text-[11px] font-bold tracking- text-black/60 uppercase', classNames.headerEyebrow]
    .filter(Boolean)
    .join(' ');
  const titleClassName = ['truncate text-sm font-semibold', classNames.headerTitle].filter(Boolean).join(' ');
  const descriptionClassName = ['text-[11px] text-black/70', classNames.headerDescription].filter(Boolean).join(' ');

  return (
    <div className={containerClassName}>
      {header.icon ? <ContextMenuHeaderIcon classNames={classNames} icon={header.icon} /> : null}
      <div className="h-full w-full -space-y-1">
        {header.eyebrow ? <div className={eyebrowClassName}>{header.eyebrow}</div> : null}
        {header.title ? <div className={titleClassName}>{header.title}</div> : null}
        {header.description ? <div className={descriptionClassName}>{header.description}</div> : null}
      </div>
    </div>
  );
}

function ContextMenuItem({ classNames, isActive, item, onHover, onSelect, setButtonRef }) {
  if (item.type === 'separator') {
    const separatorClassName = ['my-1 h-px bg-black/10', classNames.separator].filter(Boolean).join(' ');

    return <div className={separatorClassName} role="separator" />;
  }

  const itemClassName = [
    'flex w-full items-center gap-2 rounded-[12px] px-2.5 py-2 text-left text-[13px] font-medium text-black/70 hover:text-black transition-colors hover:bg-black/5 focus-visible:outline-none data-[active=true]:bg-black/10 disabled:pointer-events-none disabled:opacity-50',
    classNames.item,
    item.className,
    item.danger && 'text-error',
    item.danger && classNames.itemDanger,
  ]
    .filter(Boolean)
    .join(' ');
  const itemIconClassName = ['shrink-0 text-black/65', classNames.itemIcon, item.itemIconClassName]
    .filter(Boolean)
    .join(' ');
  const itemLabelClassName = ['grow truncate', classNames.itemLabel].filter(Boolean).join(' ');
  const itemShortcutClassName = [
    'ml-2 shrink-0 text-[10px] tracking-wide text-black/60 uppercase',
    classNames.itemShortcut,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      ref={setButtonRef}
      className={itemClassName}
      data-active={isActive ? 'true' : undefined}
      aria-disabled={item.disabled}
      disabled={item.disabled}
      role="menuitem"
      type="button"
      onMouseEnter={onHover}
      onClick={(event) => onSelect(item, event)}
    >
      {item.icon ? <Icon icon={item.icon} className={itemIconClassName} size={16} /> : null}
      <span className={itemLabelClassName}>{item.label}</span>
      {item.shortcut ? <span className={itemShortcutClassName}>{item.shortcut}</span> : null}
    </button>
  );
}

function ContextMenuContent({ config, items, menuContext, position, onClose }) {
  const menuRef = useRef(null);
  const itemRefs = useRef([]);
  const classNames = isObject(config.classNames) ? config.classNames : {};
  const header = useMemo(() => resolveMenuHeader(config, menuContext), [config, menuContext]);
  const actionableIndexes = useMemo(() => getActionableIndexes(items), [items]);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    setActiveIndex(-1);
    itemRefs.current = [];
  }, [items]);

  useEffect(() => {
    if (!menuRef.current) return;

    const menuElement = menuRef.current;
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

    menuElement.style.left = `${Math.max(MENU_SCREEN_MARGIN, x)}px`;
    menuElement.style.top = `${Math.max(MENU_SCREEN_MARGIN, y)}px`;
  }, [position, items]);

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

      if (
        event.key === 'ArrowDown' ||
        event.key === 'ArrowUp' ||
        event.key === 'PageDown' ||
        event.key === 'PageUp' ||
        event.key === 'Home' ||
        event.key === 'End' ||
        event.key === ' ' ||
        event.key === 'Spacebar'
      ) {
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
      event.preventDefault();
      event.stopPropagation();

      if (item.disabled) {
        return;
      }

      const actionHandler = typeof item.onSelect === 'function' ? item.onSelect : item.onClick;
      invokeSafely(actionHandler, event, menuContext);

      if (item.closeOnSelect !== false) {
        onClose();
      }
    },
    [menuContext, onClose]
  );

  const handleMenuKeyDown = useCallback(
    (event) => {
      if (!actionableIndexes.length) {
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
        }
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((current) => getNextActionableIndex(current, 1, actionableIndexes));
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((current) => getNextActionableIndex(current, -1, actionableIndexes));
        return;
      }

      if (event.key === 'Home') {
        event.preventDefault();
        setActiveIndex(actionableIndexes[0]);
        return;
      }

      if (event.key === 'End') {
        event.preventDefault();
        setActiveIndex(actionableIndexes[actionableIndexes.length - 1]);
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        if (activeIndex >= 0) {
          event.preventDefault();
          itemRefs.current[activeIndex]?.click();
        }
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    },
    [actionableIndexes, activeIndex, onClose]
  );

  return (
    <>
      <div
        className={['fixed inset-0', classNames.overlay].filter(Boolean).join(' ')}
        onMouseDown={onClose}
        style={{ zIndex: Z_INDEX.DEBUG_OVERLAY - 1 }}
      />
      <div
        ref={menuRef}
        className={[
          'max-w-[320px] min-w-[240px] overflow-hidden rounded-[16px] border border-black/10 bg-white/80 p-1 shadow-[0_20px_44px_-22px_rgba(0,0,0,0.45)] backdrop-blur-md',
          classNames.content,
        ]
          .filter(Boolean)
          .join(' ')}
        role="menu"
        tabIndex={-1}
        style={{
          left: position?.x || 0,
          position: 'fixed',
          top: position?.y || 0,
          zIndex: Z_INDEX.DEBUG_OVERLAY,
        }}
        onMouseLeave={() => setActiveIndex(-1)}
        onKeyDown={handleMenuKeyDown}
      >
        <ContextMenuHeader classNames={classNames} header={header} />
        {items.map((item, index) => (
          <ContextMenuItem
            key={item.key || `menu-item-${index}`}
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
        ))}
      </div>
    </>
  );
}

export function ContextMenuRenderer() {
  const { menuConfig, menuContext, menuItems, position, isOpen, closeMenu } = useContextMenu();

  if (!isOpen || !menuConfig) return null;

  if (typeof document === 'undefined') return null;

  const resolvedItems =
    Array.isArray(menuItems) && menuItems.length > 0 ? menuItems : resolveMenuItems(menuConfig, menuContext);

  if (!resolvedItems.length) {
    return null;
  }

  return createPortal(
    <ContextMenuContent
      config={menuConfig}
      items={resolvedItems}
      menuContext={menuContext}
      position={position}
      onClose={closeMenu}
    />,
    document.body
  );
}

export function useContextMenuListener() {
  const { getAll } = useContextMenuRegistry();
  const { get: getNavItem } = useNavRegistry();
  const { openMenu } = useContextMenu();
  const pathname = usePathname();

  useEffect(() => {
    const handleContextMenu = (event) => {
      const allMenus = getAll();
      const resolvedMenu = resolveContextMenu(allMenus, pathname, event);

      if (!resolvedMenu) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      let nextContext = resolvedMenu.context;
      const pageMeta = resolveContextMenuPageMeta(getNavItem(pathname), pathname);

      if (pageMeta) {
        nextContext = {
          ...(isObject(nextContext) ? nextContext : {}),
          page: pageMeta,
        };
      }

      const onOpenResult = invokeSafely(resolvedMenu.config?.onOpen, event, nextContext);

      if (onOpenResult === false) {
        return;
      }

      if (isObject(onOpenResult)) {
        nextContext = {
          ...nextContext,
          ...onOpenResult,
        };
      }

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

export { ContextMenuProvider, useContextMenu } from './context';
