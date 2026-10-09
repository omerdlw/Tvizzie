"use client";

import { useEffect, type ReactNode, type Ref } from "react";
import { animate, useMotionValue, useReducedMotion } from "motion/react";
import { SCENE } from "../lib/motion";
import { ClockContext } from "./clock";
import { useCue } from "./cue";

export function Sequence({
  as: Tag = "div",
  children,
  className,
}: {
  as?: "aside" | "div" | "header";
  children: ReactNode;
  className?: string;
}) {
  const { delay, ref, shown } = useCue<HTMLDivElement>({
    at: SCENE.opening.base,
  });
  const reduced = useReducedMotion();
  const time = useMotionValue(-1);
  const { length } = SCENE.opening;

  useEffect(() => {
    if (!shown) return;
    if (reduced) {
      time.set(length);
      return;
    }
    time.set(-delay);
    const controls = animate(time, length, {
      duration: length + delay,
      ease: "linear",
    });
    return () => controls.stop();
  }, [delay, length, reduced, shown, time]);

  return (
    <ClockContext value={time}>
      <Tag className={className} ref={ref as Ref<HTMLDivElement>}>
        {children}
      </Tag>
    </ClockContext>
  );
}
