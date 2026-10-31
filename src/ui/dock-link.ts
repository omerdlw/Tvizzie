"use client";

import type { MouseEvent } from "react";
import { useDockActions } from "@omerdlw/base-framework/modules/dock";

export function useDockLinkClick(href: string, onNavigated?: () => void) {
  const { navigate } = useDockActions();

  return (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey)
      return;
    event.preventDefault();
    void navigate(href).then((committed) => {
      if (committed) onNavigated?.();
    });
  };
}
