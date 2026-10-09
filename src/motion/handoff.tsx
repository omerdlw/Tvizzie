"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useAmbientTheme } from "@omerdlw/base-framework/modules/ambient";
import { DOCK_EVENTS } from "@omerdlw/base-framework/modules/dock";
import { globalEvents } from "@omerdlw/base-framework/events";

interface Trip {
  at: number;
  black: string;
  href: string;
  primary: string;
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

function warm(href: string, router: AppRouterInstance): void {
  if (!isFilmPage(href)) return;
  const key = pathOf(href);
  const at = warmed.get(key);
  if (at !== undefined && Date.now() - at < WARM_FOR) return;
  warmed.set(key, Date.now());
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

function beginHandoff(to: string, router: AppRouterInstance): void {
  if (!isFilmPage(to)) return;
  const style = getComputedStyle(document.documentElement);
  trip = {
    at: Date.now(),
    black: style.getPropertyValue("--black").trim(),
    href: to,
    primary: style.getPropertyValue("--primary").trim(),
    to: pathOf(to),
  };
  settle();
  warm(to, router);
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

interface Palette {
  black: string;
  primary: string;
}

export function handoffTo(
  pathname: string,
): { palette: Palette | null } | null {
  const now = current();
  if (!now || now.to !== pathOf(pathname)) return null;
  return {
    palette:
      now.black && now.primary
        ? { black: now.black, primary: now.primary }
        : null,
  };
}

function Dark({ palette }: { palette: Palette | null }) {
  useAmbientTheme(
    palette
      ? { colors: { black: palette.black, primary: palette.primary } }
      : null,
  );
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
