"use client";

import { useEffect, useSyncExternalStore } from "react";

let showing = 0;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};
const notify = () => listeners.forEach((listener) => listener());

export const houseIsDown = () => showing > 0;

export function useHouseDown() {
  return useSyncExternalStore(subscribe, houseIsDown, () => false);
}

export function useShowing() {
  useEffect(() => {
    showing += 1;
    notify();
    return () => {
      showing -= 1;
      notify();
    };
  }, []);
}
