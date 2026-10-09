"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { REGISTRY_SOURCES } from "@omerdlw/base-framework/kernel";
import {
  useDockContextActions,
  useDockRegistration,
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
  const open = openPath === pathname && pathname !== "/";

  const toggle = useCallback(() => {
    setOpenPath((current) => (current === pathname ? null : pathname));
  }, [pathname]);

  const close = useCallback(() => setOpenPath(null), []);

  const dock = useMemo(
    () =>
      open ? { action: <SearchAction autoFocus onClose={close} /> } : null,
    [close, open],
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
        visible: pathname !== "/",
      },
    ],
    [pathname, toggle],
  );

  useDockContextActions(actions);
  return null;
}
