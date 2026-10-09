"use client";

import { useEffect, type RefObject } from "react";

const NEAR = 520;
const AWAY = "-9999px";

export function useBeam(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    let queued = 0;
    let lit = false;
    let at: [number, number] = [0, 0];

    const darken = () => {
      if (!lit) return;
      lit = false;
      root.querySelectorAll<HTMLElement>("[data-beam]").forEach((word) => {
        word.style.setProperty("--bx", AWAY);
        word.style.setProperty("--by", AWAY);
      });
    };
    const paint = () => {
      queued = 0;
      const [x, y] = at;
      const box = root.getBoundingClientRect();
      const far =
        x < box.left - NEAR ||
        x > box.right + NEAR ||
        y < box.top - NEAR ||
        y > box.bottom + NEAR;
      if (far) return darken();
      lit = true;
      root.querySelectorAll<HTMLElement>("[data-beam]").forEach((word) => {
        const rect = word.getBoundingClientRect();
        word.style.setProperty("--bx", `${x - rect.left}px`);
        word.style.setProperty("--by", `${y - rect.top}px`);
      });
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      at = [event.clientX, event.clientY];
      if (!queued) queued = requestAnimationFrame(paint);
    };
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("mouseleave", darken);
    return () => {
      cancelAnimationFrame(queued);
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("mouseleave", darken);
    };
  }, [ref]);
}
