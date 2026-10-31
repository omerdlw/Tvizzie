"use client";

import { useMemo, type JSX, type ReactNode } from "react";
import {
  paletteVarMap,
  useAmbientTheme,
  type AmbientPalette,
} from "@omerdlw/base-framework/modules/ambient";
import {
  pathOf,
  useArrival,
} from "@omerdlw/base-framework/modules/navigation";

declare module "@omerdlw/base-framework/modules/navigation" {
  interface NavigationPayload {
    /** The stage's grade (`--grade`, "r g b") when the page was left. */
    grade?: string | null;
    /** The tint of the page being left, so the next one starts from it. */
    palette?: AmbientPalette | null;
  }
}

const FILM_PAGE = /^\/(?:movie|person)\/[^/]+$/;

export const isFilmPage = (href: string): boolean =>
  FILM_PAGE.test(pathOf(href));

function Dark({ palette }: { palette: AmbientPalette | null }) {
  const colors = useMemo(
    () => (palette ? paletteVarMap(palette) : null),
    [palette],
  );
  useAmbientTheme(colors ? { colors } : null);
  return (
    <div aria-hidden="true" className="min-h-screen">
      <div className="fixed inset-0 z-20 bg-black" />
    </div>
  );
}

/**
 * A film page's loading screen: dark, in the tint of the page that led here,
 * when the visit came through the stage; the skeleton otherwise.
 */
export function Handoff({ children }: { children: ReactNode }): JSX.Element {
  const arrival = useArrival();
  return arrival ? (
    <Dark palette={arrival.payload.palette ?? null} />
  ) : (
    <>{children}</>
  );
}
