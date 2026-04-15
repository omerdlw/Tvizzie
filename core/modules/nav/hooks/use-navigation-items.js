'use client';

import { useMemo } from 'react';

import { useNavRegistry } from '@/core/modules/registry/context';

import { useNavigationContext } from '../context';

function getConfigItemKeys(items) {
  return Object.values(items || {}).map((item) => item.path || item.name);
}

function orderNavigationItems(registeredItems, orderedKeys) {
  const orderedItems = [];
  const includedKeys = new Set();

  orderedKeys.forEach((key) => {
    const item = registeredItems[key];

    if (!item) {
      return;
    }

    orderedItems.push(item);
    includedKeys.add(key);
  });

  Object.entries(registeredItems).forEach(([key, item]) => {
    if (includedKeys.has(key)) {
      return;
    }

    orderedItems.push(item);
  });

  return orderedItems;
}

function stripChildrenSystemFields(item) {
  if (!item || typeof item !== 'object') {
    return item;
  }

  return {
    ...item,
    activeChild: null,
    children: null,
    hasActiveChild: false,
    isChild: false,
    isExpanded: false,
    isParent: false,
    parentName: null,
    parentPath: null,
  };
}

export function useNavigationItems() {
  const { config } = useNavigationContext();
  const { getAll } = useNavRegistry();

  const rawItems = useMemo(() => {
    const registeredItems = getAll();
    const orderedKeys = getConfigItemKeys(config?.items);

    return orderNavigationItems(registeredItems, orderedKeys).map(stripChildrenSystemFields);
  }, [getAll, config?.items]);

  return { rawItems };
}
