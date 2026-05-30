'use client';

import { isValidElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Z_INDEX } from '@/core/constants';
import Icon from '@/ui/icon';

import { useContextMenu } from './context';
import { isObject, resolveMenuItems } from './menu-engine';

const MENU_SCREEN_MARGIN = 10;
const CONTEXT_MENU_LAYOUT = Object.freeze({
  wrapperRadius: 18,
  wrapperPadding: 7,
});

function joinClassNames(...values) {
  return values.filter(Boolean).join(' ');
}

function getContextMenuMetrics() {
  const wrapperRadius = CONTEXT_MENU_LAYOUT.wrapperRadius;
  const wrapperPadding = CONTEXT_MENU_LAYOUT.wrapperPadding;

  return {
    headerIconRadius: Math.max(10, wrapperRadius - wrapperPadding - 2),
    itemRadius: Math.max(10, wrapperRadius - wrapperPadding - 1),
    wrapperPadding,
    wrapperRadius,
  };
}

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

function getActionableIndexes(items = []) {
  return items.reduce((indexes, item, index) => {
    if (item?.type === 'action' && !item?.disabled) {
      indexes.push(index);
    }

    return indexes;
  }, []);
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

function positionMenu(menuElement, position) {
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

function ContextMenuHeaderIcon({ classNames, icon, metrics }) {
  const iconClassName = joinClassNames(
    'flex size-10 shrink-0 items-center justify-center overflow-hidden border border-black/10 bg-black/[0.04] bg-cover bg-center text-black/65',
    classNames.headerIcon
  );
  const iconStyle = {
    borderRadius: `${metrics.headerIconRadius}px`,
  };

  if (isImageIconSource(icon)) {
    return <div className={iconClassName} style={{ ...iconStyle, backgroundImage: `url(${icon})` }} />;
  }

  return (
    <div className={iconClassName} style={iconStyle}>
      {typeof icon === 'string' ? <Icon icon={icon} size={20} /> : icon}
    </div>
  );
}

function ContextMenuHeader({ classNames, header, metrics }) {
  if (!header) {
    return null;
  }

  const containerClassName = joinClassNames(
    'mb-1.5 flex items-center gap-2.5 border-b border-black/10 px-1 pb-3',
    classNames.header
  );
  const eyebrowClassName = joinClassNames(
    'text-[10px] font-semibold tracking-wide text-black/45 uppercase',
    classNames.headerEyebrow
  );
  const titleClassName = joinClassNames('truncate text-[15px] leading-tight font-semibold text-black', classNames.headerTitle);
  const descriptionClassName = joinClassNames('text-[12px] leading-snug text-black/60', classNames.headerDescription);

  return (
    <div className={containerClassName}>
      {header.icon ? <ContextMenuHeaderIcon classNames={classNames} icon={header.icon} metrics={metrics} /> : null}
      <div className="h-full w-full min-w-0 space-y-0.5">
        {header.eyebrow ? <div className={eyebrowClassName}>{header.eyebrow}</div> : null}
        {header.title ? <div className={titleClassName}>{header.title}</div> : null}
        {header.description ? <div className={descriptionClassName}>{header.description}</div> : null}
      </div>
    </div>
  );
}

function ContextMenuItem({ classNames, isActive, item, metrics, onHover, onSelect, setButtonRef }) {
  if (item.type === 'separator') {
    return <div className={joinClassNames('my-1 h-px bg-black/10', classNames.separator)} role="separator" />;
  }

  const itemClassName = joinClassNames(
    'group flex h-10 w-full items-center gap-2.5 px-3 text-left text-[13px] font-medium text-black/75 transition-colors hover:bg-black/5 hover:text-black focus-visible:outline-none data-[active=true]:bg-black/5 data-[active=true]:text-black disabled:pointer-events-none disabled:opacity-45',
    classNames.item,
    item.className,
    item.danger && 'text-error',
    item.danger && classNames.itemDanger
  );
  const itemIconClassName = joinClassNames(
    'shrink-0 text-black/55 transition-colors group-hover:text-black/80',
    item.danger && 'text-error/80 group-hover:text-error',
    classNames.itemIcon,
    item.itemIconClassName
  );
  const itemLabelClassName = joinClassNames('grow truncate', classNames.itemLabel);
  const itemShortcutClassName = joinClassNames(
    'ml-2 shrink-0 text-[10px] tracking-wide text-black/45 uppercase',
    classNames.itemShortcut
  );

  return (
    <button
      ref={setButtonRef}
      className={itemClassName}
      style={{
        borderRadius: `${metrics.itemRadius}px`,
      }}
      data-active={isActive ? 'true' : undefined}
      aria-disabled={item.disabled}
      disabled={item.disabled}
      role="menuitem"
      type="button"
      onMouseEnter={onHover}
      onClick={(event) => onSelect(item, event)}
    >
      {item.icon ? <Icon icon={item.icon} className={itemIconClassName} size={17} /> : null}
      <span className={itemLabelClassName}>{item.label}</span>
      {item.shortcut ? <span className={itemShortcutClassName}>{item.shortcut}</span> : null}
    </button>
  );
}

function ContextMenuContent({ config, items, menuContext, position, onClose }) {
  const menuRef = useRef(null);
  const itemRefs = useRef([]);
  const classNames = isObject(config.classNames) ? config.classNames : {};
  const metrics = useMemo(() => getContextMenuMetrics(), []);
  const header = useMemo(() => resolveMenuHeader(config, menuContext), [config, menuContext]);
  const actionableIndexes = useMemo(() => getActionableIndexes(items), [items]);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    setActiveIndex(-1);
    itemRefs.current = [];
  }, [items]);

  useEffect(() => {
    if (menuRef.current) {
      positionMenu(menuRef.current, position);
    }
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
        className={joinClassNames('fixed inset-0', classNames.overlay)}
        onMouseDown={onClose}
        style={{ zIndex: Z_INDEX.DEBUG_OVERLAY - 1 }}
      />
      <div
        ref={menuRef}
        className={joinClassNames(
          'max-w-sm min-w-64 overflow-hidden border border-black/10 bg-white/88 shadow-[0_24px_64px_rgba(0,0,0,0.28)] backdrop-blur-xl',
          classNames.content
        )}
        role="menu"
        tabIndex={-1}
        style={{
          borderRadius: `${metrics.wrapperRadius}px`,
          left: position?.x || 0,
          padding: `${metrics.wrapperPadding}px`,
          position: 'fixed',
          top: position?.y || 0,
          zIndex: Z_INDEX.DEBUG_OVERLAY,
        }}
        onMouseLeave={() => setActiveIndex(-1)}
        onKeyDown={handleMenuKeyDown}
      >
        <ContextMenuHeader classNames={classNames} header={header} metrics={metrics} />
        {items.map((item, index) => (
          <ContextMenuItem
            key={item.key || `menu-item-${index}`}
            item={item}
            classNames={classNames}
            isActive={index === activeIndex}
            metrics={metrics}
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
