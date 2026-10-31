"use client";

import { useContext, useRef } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { cn } from "@omerdlw/base-framework/utils";
import { sinceBase } from "./grammar";
import { EASE, size } from "./tempo";
import { ClockContext, useClockStart, useExit, useProgress } from "./clock";
import { bezier, play } from "./play";

export function Hairline({
  at,
  className,
  run,
}: {
  at: number;
  className?: string;
  run: number;
}) {
  const entered = useProgress(sinceBase(at), run);
  const left = useExit(0);
  const scaleX = useTransform(
    [entered, left],
    ([a, b]: number[]) => a * (1 - b),
  );
  return (
    <motion.div
      aria-hidden="true"
      className={cn(
        "h-px w-full origin-left bg-[rgb(var(--grade)/0.4)]",
        className,
      )}
      style={{ opacity: scaleX, scaleX }}
    />
  );
}

interface LineProps {
  at?: number;
  className?: string;
  out?: number;
  run?: number;
  since?: number;
}

const RULE = "block h-px origin-left bg-white/10";

export function Line(props: LineProps) {
  return props.since === undefined ? (
    <OpeningLine {...props} />
  ) : (
    <TimedLine {...props} since={props.since} />
  );
}

function OpeningLine({ at = 0, className, out, run = size(3) }: LineProps) {
  const entered = useProgress(sinceBase(at), run);
  const left = useExit(out ?? 1e6);
  const scaleX = useTransform(
    [entered, left],
    ([a, b]: number[]) => a * (1 - b),
  );
  return (
    <motion.span
      aria-hidden="true"
      className={cn(RULE, className)}
      style={{ opacity: scaleX, scaleX }}
    />
  );
}

const DOLLY = bezier(EASE.dolly);

function TimedLine({
  className,
  out,
  run = size(3),
  since,
}: LineProps & { since: number }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const clock = useContext(ClockContext);
  const drawn = useMotionValue(clock ? 0 : 1);
  const left = useExit(out ?? 1e6);
  const scaleX = useTransform([drawn, left], ([a, b]: number[]) => a * (1 - b));
  useClockStart((time) => {
    const element = ref.current;
    if (!element) return;
    const rest = () => {
      const kept = 1 - left.get();
      element.style.opacity = String(kept);
      element.style.transform = kept >= 1 ? "none" : `scaleX(${kept})`;
      drawn.set(1);
    };
    const wait = since - time;
    if (reduced || wait + run <= 0) {
      rest();
      return;
    }
    return [
      play(
        element,
        { opacity: ["0", "1"], transform: ["scaleX(0)", "scaleX(1)"] },
        { easing: DOLLY, run, wait },
        rest,
      ),
    ];
  });
  return (
    <motion.span
      aria-hidden="true"
      className={cn(RULE, className)}
      ref={ref}
      style={{ opacity: scaleX, scaleX }}
    />
  );
}
