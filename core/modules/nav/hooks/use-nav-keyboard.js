'use client';

import { useCallback, useEffect } from 'react';

function isEditableTarget(target) {
  return target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
}

export function useNavKeyboard({
  expanded,
  focusedIndex,
  isOverlayActive,
  navigate,
  navigationItems,
  setExpanded,
  setFocusedIndex,
}) {
  const handleKeyDown = useCallback(
    (event) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      if (isOverlayActive || !expanded) return;

      const { key } = event;

      if (key === 'Escape') {
        event.preventDefault();
        setExpanded(false);
        return;
      }

      if (key === 'Enter' && focusedIndex !== -1) {
        event.preventDefault();
        navigate(navigationItems[focusedIndex]?.path);
        return;
      }

      if (key === 'ArrowDown') {
        event.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : navigationItems.length - 1));
        return;
      }

      if (key === 'ArrowUp') {
        event.preventDefault();
        setFocusedIndex((prev) => (prev < navigationItems.length - 1 ? prev + 1 : 0));
      }
    },
    [expanded, focusedIndex, isOverlayActive, navigate, navigationItems, setExpanded, setFocusedIndex]
  );

  useEffect(() => {
    if (!expanded) return undefined;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expanded, handleKeyDown]);
}
