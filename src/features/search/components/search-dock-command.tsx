"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { REGISTRY_SOURCES } from "@omerdlw/base-framework/kernel";
import {
  useDockContextActions,
  useDockRegistration,
  useDockSelector,
} from "@omerdlw/base-framework/modules/dock";
import {
  SEARCH_ACTION_KEY,
  SEARCH_ACTION_ORDER,
  SEARCH_ICON,
} from "../lib/constants";
import { SearchAction } from "./search-action";

const SEARCH_REGISTRATION = {
  priority: 1000,
  source: REGISTRY_SOURCES.DYNAMIC,
} as const;

export function SearchDockCommand(): null {
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  // The card in front, which is not always the one at this path: on your own
  // profile the account card stands in for it. Search opens on that one.
  const frontPath = useDockSelector((state) => state.activeItem?.path ?? null);

  const toggle = useCallback(() => {
    setOpenPath((current) => (current === pathname ? null : pathname));
  }, [pathname]);

  const close = useCallback(() => setOpenPath(null), []);

  const dock = useMemo(
    () =>
      open
        ? {
            action: <SearchAction autoFocus onClose={close} />,
            ...(frontPath ? { path: frontPath } : {}),
          }
        : null,
    [close, frontPath, open],
  );
  useDockRegistration(dock, SEARCH_REGISTRATION);

  const actions = useMemo(
    () => [
      {
        icon: SEARCH_ICON,
        key: SEARCH_ACTION_KEY,
        onClick: toggle,
        order: SEARCH_ACTION_ORDER,
        tooltip: "Search",
      },
    ],
    [toggle],
  );

  useDockContextActions(actions);
  return null;
}
