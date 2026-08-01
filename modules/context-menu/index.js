'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

import { useContextMenuRegistry, useNavRegistry } from '@/modules/registry/registry-context';

import { useContextMenu } from './context-menu-context';
import { isObject, resolveContextMenu, resolveMenuItems } from './menu-engine';
import { ContextMenuRenderer, extractNodeText } from './renderer';

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

export { ContextMenuProvider, useContextMenu } from './context-menu-context';
export { ContextMenuRenderer } from './renderer';
