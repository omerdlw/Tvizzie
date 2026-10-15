"use client";

import { useContext, useEffect, type ReactNode, type Ref } from "react";
import { animate, useMotionValue, useReducedMotion } from "motion/react";
import { GRAMMAR } from "./grammar";
import { ClockContext, OpeningContext, PaceContext } from "./clock";
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
    at: GRAMMAR.opening.base,
  });
  const reduced = useReducedMotion();
  const time = useMotionValue(-1);
  const { length } = useContext(OpeningContext);
  const pace = useContext(PaceContext);

  useEffect(() => {
    if (!shown) return;
    if (reduced) {
      time.set(length);
      return;
    }
    time.set(-delay);
    const controls = animate(time, length, {
      duration: (length + delay) / pace,
      ease: "linear",
    });
    return () => controls.stop();
  }, [delay, length, pace, reduced, shown, time]);

  return (
    <ClockContext value={time}>
      <Tag className={className} ref={ref as Ref<HTMLDivElement>}>
        {children}
      </Tag>
    </ClockContext>
  );
}
