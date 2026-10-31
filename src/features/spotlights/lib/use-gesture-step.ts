"use client";

import { useEffect, useEffectEvent } from "react";

const THRESHOLD = 28;
const GESTURE_END_MS = 220;

const typing = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName));

// One wheel or trackpad gesture moves exactly one step, however long its
// momentum runs; arrow keys step too. `step` gets -1 or 1.
export function useGestureStep(
  step: (direction: -1 | 1) => void,
  { enabled = true, keys = true }: { enabled?: boolean; keys?: boolean } = {},
): void {
  const onStep = useEffectEvent(step);

  useEffect(() => {
    if (!enabled) return;
    let total = 0;
    let locked = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      const delta =
        Math.abs(event.deltaY) >= Math.abs(event.deltaX)
          ? event.deltaY
          : event.deltaX;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        total = 0;
        locked = false;
      }, GESTURE_END_MS);
      if (locked) return;
      total += delta * (event.deltaMode === 1 ? 16 : 1);
      if (Math.abs(total) < THRESHOLD) return;
      locked = true;
      onStep(total > 0 ? 1 : -1);
    };

    const onKey = (event: KeyboardEvent) => {
      if (!keys || event.defaultPrevented || typing(event.target)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        onStep(1);
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        onStep(-1);
      }
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, [enabled, keys]);
}
