'use client';

import { useNavigationContext } from '../context';

export function useNavigationExpanded() {
  const {
    expanded,
    setExpanded,
    expand,
    collapse,
    toggle,
    expandParentForPath,
    isParentExpanded,
    toggleParent,
    setSearchQuery,
    setNavHeight,
  } = useNavigationContext();

  return {
    expanded,
    setExpanded,
    expand,
    collapse,
    toggle,
    expandParentForPath,
    isParentExpanded,
    toggleParent,
    setSearchQuery,
    setNavHeight,
  };
}
