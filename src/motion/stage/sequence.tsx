"use client";

import { useContext, useEffect, type ReactNode, type Ref } from "react";
import { animate, useMotionValue, useReducedMotion } from "motion/react";
import { GRAMMAR, sinceBase } from "./grammar";
import { ClockContext, OpeningContext, PaceContext } from "./clock";
import { useCue } from "./cue";
import { WaveContext, useWave } from "./wave";

export function Sequence({
  as: Tag = "div",
  children,
  className,
  gap = GRAMMAR.items.gap,
  wave: waveAt,
}: {
  as?: "aside" | "div" | "header";
  children: ReactNode;
  className?: string;
  gap?: number;
  wave?: number;
}) {
  const { at, delay, ref, shown } = useCue<HTMLDivElement>({
    at: GRAMMAR.opening.base,
  });
  const reduced = useReducedMotion();
  const time = useMotionValue(-1);
  const { length } = useContext(OpeningContext);
  const pace = useContext(PaceContext);
  const wave = useWave(
    shown && waveAt !== undefined
      ? at + ((delay + sinceBase(waveAt)) / pace) * 1000
      : null,
    gap,
  );

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

  const body = (
    <Tag className={className} ref={ref as Ref<HTMLDivElement>}>
      {children}
    </Tag>
  );
  return (
    <ClockContext value={time}>
      {waveAt === undefined ? (
        body
      ) : (
        <WaveContext value={wave}>{body}</WaveContext>
      )}
    </ClockContext>
  );
}
