"use client";

import type { ReactNode, Ref } from "react";
import { motion, useReducedMotion } from "motion/react";
import { MAIN_COLUMN_CLASS, VIEW_CLASS } from "@/ui";
import type { useSmoothScroll } from "../scroll";
import { EASE, FOCUSED, blur } from "./tempo";

type Bezier = (typeof EASE)[keyof typeof EASE];

export function scrollToElement(
  engine: ReturnType<typeof useSmoothScroll>,
  element: HTMLElement,
  margin: number,
): void {
  if (engine) {
    engine.scrollTo(element, { immediate: true, offset: -margin });
    return;
  }
  window.scrollTo({
    behavior: "instant",
    top: element.getBoundingClientRect().top + window.scrollY - margin,
  });
}

export function ViewDeck<K extends string>({
  arrive,
  columnRef,
  keys,
  shown,
  switching,
  timing,
  views,
}: {
  arrive: Bezier;
  columnRef: Ref<HTMLDivElement>;
  keys: readonly K[];
  shown: K;
  switching: boolean;
  timing: { enter: number; leave: number; lift: number };
  views: Record<K, ReactNode>;
}) {
  const reduced = useReducedMotion();
  const { enter, leave, lift } = timing;

  return (
    <div className={MAIN_COLUMN_CLASS} ref={columnRef}>
      {keys.map((key) => {
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
                    ease: open ? arrive : EASE.glide,
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
