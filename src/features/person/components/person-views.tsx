"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { useSmoothScroll } from "@/motion/scroll";
import { SCENE } from "../lib/motion";
import { EASE, ViewDeck, scrollToElement } from "@/motion/stage";
import type { PersonViewKey } from "../lib/types";
import { usePersonView } from "./person-view-state";

const KEYS: readonly PersonViewKey[] = ["main", "timeline", "awards"];

const TOP_MARGIN = 24;

export function PersonViews({
  views,
}: {
  views: Record<PersonViewKey, ReactNode>;
}) {
  const { focusYear, view } = usePersonView();
  const [shown, setShown] = useState<PersonViewKey>(view);
  const column = useRef<HTMLDivElement>(null);
  const engine = useSmoothScroll();
  const reduced = useReducedMotion();
  const switching = view !== shown;
  const { leave } = SCENE.view;

  const arriving = useRef<{ year: number | null } | null>(null);

  useEffect(() => {
    if (view === shown) return;
    const timer = setTimeout(
      () => {
        arriving.current = { year: focusYear };
        setShown(view);
      },
      reduced ? 0 : leave * 1000,
    );
    return () => clearTimeout(timer);
  }, [focusYear, leave, reduced, shown, view]);

  useEffect(() => {
    const target = arriving.current;
    if (!target) return;
    arriving.current = null;
    window.dispatchEvent(new Event("resize"));
    const frame = requestAnimationFrame(() => {
      const element = column.current;
      if (!element) return;
      const year =
        target.year === null
          ? null
          : element.querySelector(`[data-year="${target.year}"]`);
      if (year) {
        scrollToElement(engine, year as HTMLElement, TOP_MARGIN * 2);
        return;
      }
      const { top } = element.getBoundingClientRect();
      const wide = window.matchMedia("(min-width: 1024px)").matches;
      if (top < 0 || (!wide && top > window.innerHeight * 0.6)) {
        scrollToElement(engine, element, TOP_MARGIN);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [engine, shown]);

  return (
    <ViewDeck
      arrive={EASE.expo}
      columnRef={column}
      keys={KEYS}
      shown={shown}
      switching={switching}
      timing={SCENE.view}
      views={views}
    />
  );
}
