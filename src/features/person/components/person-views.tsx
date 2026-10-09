"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useSmoothScroll } from "@/motion/scroll";
import { MAIN_COLUMN_CLASS, VIEW_CLASS } from "../lib/layout";
import { SCENE } from "../lib/motion";
import { EASE, FOCUSED, blur } from "../lib/tempo";
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
  const { enter, leave, lift } = SCENE.view;

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
    const scrollTo = (element: Element, margin: number) => {
      if (engine) {
        engine.scrollTo(element as HTMLElement, {
          immediate: true,
          offset: -margin,
        });
      } else {
        window.scrollTo({
          behavior: "instant",
          top: element.getBoundingClientRect().top + window.scrollY - margin,
        });
      }
    };
    window.dispatchEvent(new Event("resize"));
    const frame = requestAnimationFrame(() => {
      const element = column.current;
      if (!element) return;
      const year =
        target.year === null
          ? null
          : element.querySelector(`[data-year="${target.year}"]`);
      if (year) {
        scrollTo(year, TOP_MARGIN * 2);
        return;
      }
      const { top } = element.getBoundingClientRect();
      const wide = window.matchMedia("(min-width: 1024px)").matches;
      if (top < 0 || (!wide && top > window.innerHeight * 0.6)) {
        scrollTo(element, TOP_MARGIN);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [engine, shown]);

  return (
    <div className={MAIN_COLUMN_CLASS} ref={column}>
      {KEYS.map((key) => {
        const open = key === shown && !switching;
        return (
          <motion.div
            animate={
              open
                ? { filter: FOCUSED.filter, opacity: 1, y: 0 }
                : {
                    filter: blur(12),
                    opacity: 0,
                    y: key === shown ? -lift : lift,
                  }
            }
            className={VIEW_CLASS}
            hidden={key !== shown}
            initial={false}
            key={key}
            transition={
              reduced
                ? { duration: 0 }
                : {
                    duration: open ? enter : leave,
                    ease: open ? EASE.expo : EASE.glide,
                  }
            }
          >
            {views[key]}
          </motion.div>
        );
      })}
    </div>
  );
}
