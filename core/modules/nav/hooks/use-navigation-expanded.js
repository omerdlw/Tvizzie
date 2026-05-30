'use client';

import { useNavigationContext } from '../context';

export function useNavigationExpanded() {
  const { expanded, setExpanded, expand, collapse, toggle, setSearchQuery, setNavHeight } = useNavigationContext();

  return {
    expanded,
    setExpanded,
    expand,
    collapse,
    toggle,
    setSearchQuery,
    setNavHeight,
  };
}
