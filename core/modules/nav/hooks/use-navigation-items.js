'use client';

import { useMemo } from 'react';

import { useNavRegistry } from '@/core/modules/registry/context';

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
  const { getAll } = useNavRegistry();

  const rawItems = useMemo(() => {
    return Object.values(getAll()).map(stripChildrenSystemFields);
  }, [getAll]);

  return { rawItems };
}
