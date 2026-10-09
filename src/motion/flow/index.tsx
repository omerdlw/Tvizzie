"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

export function layoutTop(element: HTMLElement): number {
  let top = 0;
  let node: HTMLElement | null = element;
  while (node) {
    top += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return top;
}

const FLOW = "data-flow";
const FLOW_SCOPE = "data-flow-scope";

const ITEMS = `[${FLOW}]`;
const SCOPES = `[${FLOW}],[${FLOW_SCOPE}]`;
const FAR = 300;

function place(element: HTMLElement): number | null {
  if (!element.offsetParent) return null;
  const scope = element.parentElement?.closest<HTMLElement>(SCOPES);
  const base = scope?.offsetParent ? layoutTop(scope) : 0;
  return layoutTop(element) - base;
}

function offsetOf(element: HTMLElement): number {
  const value = getComputedStyle(element).translate;
  if (!value || value === "none") return 0;
  return Number.parseFloat(value.split(/\s+/)[1] ?? "0") || 0;
}

export function Flowing({
  ease,
  run,
}: {
  ease: readonly number[];
  run: number;
}) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const easing = `cubic-bezier(${ease.join(",")})`;
    const places = new Map<HTMLElement, number | null>();
    const docs = new Map<HTMLElement, number>();
    const running = new Map<HTMLElement, Animation>();
    let settled = 0;

    const watcher = new ResizeObserver(() => follow());

    const sync = () => {
      const now = new Set(document.querySelectorAll<HTMLElement>(ITEMS));
      for (const element of places.keys()) {
        if (now.has(element)) continue;
        places.delete(element);
        docs.delete(element);
        running.get(element)?.cancel();
        running.delete(element);
        watcher.unobserve(element);
      }
      for (const element of now) {
        if (places.has(element)) continue;
        places.set(element, place(element));
        docs.set(element, layoutTop(element));
        watcher.observe(element);
      }
    };

    const follow = () => {
      const calm =
        performance.now() < settled ||
        document.documentElement.hasAttribute("data-scrolling");
      const view = window.innerHeight;
      const y = window.scrollY;
      const reach = view * 3;
      const moves: [HTMLElement, number][] = [];
      for (const [element, before] of places) {
        const now = place(element);
        const doc = layoutTop(element);
        const was = docs.get(element) ?? doc;
        places.set(element, now);
        docs.set(element, doc);
        if (calm || before === null || now === null) continue;
        const shift = before - now;
        if (Math.abs(shift) < 0.5) continue;
        const height = element.offsetHeight;
        const below = y + view + FAR;
        const above = y - FAR;
        if (
          (doc + height < above && was + height < above) ||
          (doc > below && was > below)
        ) {
          continue;
        }
        moves.push([element, shift + offsetOf(element)]);
      }
      for (const [element, from] of moves) {
        running.get(element)?.cancel();
        const start = Math.max(-reach, Math.min(reach, from));
        if (Math.abs(start) < 0.5) continue;
        const animation = element.animate(
          [{ translate: `0 ${start}px` }, { translate: "0 0" }],
          { duration: run * 1000, easing },
        );
        running.set(element, animation);
        const done = () => {
          if (running.get(element) === animation) running.delete(element);
        };
        animation.onfinish = done;
        animation.oncancel = done;
      }
    };

    const rebase = () => {
      settled = performance.now() + 200;
    };

    let queued = 0;
    const mutations = new MutationObserver(() => {
      if (queued) return;
      queued = requestAnimationFrame(() => {
        queued = 0;
        sync();
      });
    });

    sync();
    watcher.observe(document.body);
    mutations.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", rebase, { passive: true });
    return () => {
      cancelAnimationFrame(queued);
      watcher.disconnect();
      mutations.disconnect();
      window.removeEventListener("resize", rebase);
      for (const animation of running.values()) animation.cancel();
    };
  }, [ease, reduced, run]);

  return null;
}

export function useHeldHeight(id: string) {
  const box = useRef<HTMLDivElement>(null);
  const held = useRef<number | null>(null);
  const waiting = useRef(false);
  const first = useRef(true);

  const relax = useCallback(() => {
    const element = box.current;
    const content = element?.firstElementChild as HTMLElement | null;
    if (!element || !content || held.current === null || waiting.current) {
      return;
    }
    const natural = content.offsetHeight;
    const bare =
      document.documentElement.scrollHeight - (element.offsetHeight - natural);
    const lacking = Math.ceil(window.scrollY + window.innerHeight - bare);
    if (lacking <= 0) {
      held.current = null;
      element.style.minHeight = "";
      return;
    }
    element.style.minHeight = `${Math.min(held.current, natural + lacking)}px`;
  }, []);

  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const element = box.current;
    if (!element) return;
    held.current = Math.max(held.current ?? 0, element.offsetHeight);
    element.style.minHeight = `${held.current}px`;
    waiting.current = true;
    const timer = setTimeout(() => {
      waiting.current = false;
      relax();
    }, 2500);
    return () => clearTimeout(timer);
  }, [id, relax]);

  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const mutations = new MutationObserver((records) => {
      if (records.some((record) => record.addedNodes.length > 0)) {
        waiting.current = false;
      }
      relax();
    });
    mutations.observe(element, { childList: true });
    window.addEventListener("scroll", relax, { passive: true });
    window.addEventListener("resize", relax);
    return () => {
      mutations.disconnect();
      window.removeEventListener("scroll", relax);
      window.removeEventListener("resize", relax);
    };
  }, [relax]);

  return box;
}
