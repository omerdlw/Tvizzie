"use client";

import {
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import type { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
  paletteVarMap,
  useAmbientTheme,
  type AmbientPalette,
} from "@omerdlw/base-framework/modules/ambient";
import { DOCK_EVENTS } from "@omerdlw/base-framework/modules/dock";
import { globalEvents } from "@omerdlw/base-framework/events";

interface Trip {
  at: number;
  grade: string | null;
  href: string;
  palette: AmbientPalette | null;
  to: string;
}

const FRESH = 20_000;

let trip: Trip | null = null;

const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};
const settle = () => listeners.forEach((listener) => listener());

const pathOf = (href: string) => {
  const path = href.split(/[?#]/)[0].replace(/\/+$/, "");
  return path || "/";
};

const FILM_PAGE = /^\/(?:movie|person)\/[^/]+$/;

const isFilmPage = (href: string) => FILM_PAGE.test(pathOf(href));

const current = (): Trip | null =>
  trip && Date.now() - trip.at < FRESH ? trip : null;

const WARM_FOR = 4 * 60_000;
const warmed = new Map<string, number>();

const foreseers = new Set<(path: string) => void>();

export function foresee(run: (path: string) => void): () => void {
  foreseers.add(run);
  return () => void foreseers.delete(run);
}

function warm(href: string, router: AppRouterInstance): void {
  if (!isFilmPage(href)) return;
  const key = pathOf(href);
  const at = warmed.get(key);
  if (at !== undefined && Date.now() - at < WARM_FOR) return;
  warmed.set(key, Date.now());
  foreseers.forEach((run) => run(key));
  try {
    router.prefetch(href, { kind: "full" as PrefetchKind });
  } catch {
    warmed.delete(key);
  }
}

const DWELL = 180;

export function watchIntent(router: AppRouterInstance): () => void {
  let resting: { href: string; timer: ReturnType<typeof setTimeout> } | null =
    null;
  const hrefOf = (target: EventTarget | null) =>
    target instanceof Element
      ? (target.closest("a[href]")?.getAttribute("href") ?? null)
      : null;
  const stop = () => {
    if (resting) clearTimeout(resting.timer);
    resting = null;
  };
  const onOver = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    const href = hrefOf(event.target);
    if (!href || !isFilmPage(href)) return stop();
    if (resting?.href === href) return;
    stop();
    resting = { href, timer: setTimeout(() => warm(href, router), DWELL) };
  };
  const onNow = (event: Event) => {
    const href = hrefOf(event.target);
    if (href) warm(href, router);
  };
  document.addEventListener("pointerover", onOver, { passive: true });
  document.addEventListener("pointerdown", onNow, { passive: true });
  document.addEventListener("focusin", onNow, { passive: true });
  return () => {
    stop();
    document.removeEventListener("pointerover", onOver);
    document.removeEventListener("pointerdown", onNow);
    document.removeEventListener("focusin", onNow);
  };
}

let held: AmbientPalette | null = null;

export function useHeldPalette(palette: AmbientPalette | null): void {
  useEffect(() => {
    held = palette;
    return () => {
      if (held === palette) held = null;
    };
  }, [palette]);
}

function beginHandoff(to: string, router?: AppRouterInstance): void {
  if (!isFilmPage(to)) return;
  const stage = document.querySelector("main[data-cinematic]");
  trip = {
    at: Date.now(),
    grade: stage
      ? getComputedStyle(stage).getPropertyValue("--grade").trim() || null
      : null,
    href: to,
    palette: held,
    to: pathOf(to),
  };
  settle();
  if (router) warm(to, router);
}

export function stepTo(to: string): void {
  beginHandoff(to);
}

export const samePage = (a: string, b: string) => pathOf(a) === pathOf(b);

type Holder = (event: PopStateEvent) => boolean;

let holder: Holder | null = null;

export function holdSteps(hold: Holder): () => void {
  holder = hold;
  return () => {
    if (holder === hold) holder = null;
  };
}

if (typeof window !== "undefined") {
  window.addEventListener(
    "popstate",
    (event) => {
      if (holder?.(event)) event.stopImmediatePropagation();
    },
    { capture: true },
  );
}

const ROUTED_PATIENCE = 20_000;

export function depart(
  to: string,
  router: AppRouterInstance,
  { onReturn, patience }: { onReturn: () => void; patience: number },
): () => void {
  beginHandoff(to, router);
  const target = pathOf(to);
  let timer = setTimeout(giveUp, patience);
  const unsubscribe = globalEvents.subscribe(
    DOCK_EVENTS.NAVIGATE_START,
    (event: { to?: string }) => {
      if (!event?.to || pathOf(event.to) !== target) return;
      clearTimeout(timer);
      timer = setTimeout(giveUp, ROUTED_PATIENCE);
    },
  );
  function giveUp() {
    unsubscribe();
    endHandoff();
    onReturn();
  }
  return () => {
    clearTimeout(timer);
    unsubscribe();
  };
}

export function endHandoff(): void {
  if (!trip) return;
  trip = null;
  settle();
}

export function useDeparture(pathname: string): string | undefined {
  const href = useSyncExternalStore(
    subscribe,
    () => trip?.href ?? null,
    () => null,
  );
  return href && pathOf(href) !== pathOf(pathname) ? href : undefined;
}

export function handoffTo(
  pathname: string,
): { grade: string | null; palette: AmbientPalette | null } | null {
  const now = current();
  if (!now || now.to !== pathOf(pathname)) return null;
  return { grade: now.grade, palette: now.palette };
}

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

export function Handoff({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const handoff = handoffTo(pathname);
  return handoff ? <Dark palette={handoff.palette} /> : children;
}
