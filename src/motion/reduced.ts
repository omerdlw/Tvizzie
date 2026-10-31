"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(change: () => void) {
  const media = matchMedia(QUERY);
  media.addEventListener("change", change);
  return () => media.removeEventListener("change", change);
}

const read = () => matchMedia(QUERY).matches;
const onServer = () => false;

// useReducedMotion for render branches: false while hydrating, so the
// server's markup matches, then the viewer's preference.
export function useHydratedReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, read, onServer);
}
