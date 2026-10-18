"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import {
  cubicBezier,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "motion/react";
import { GRAMMAR, sinceBase } from "./grammar";
import { EASE, size } from "./tempo";
import { bezier, play } from "./play";
import type { Opening } from "./grammar";
import type { Timeline } from "./timeline";

export const TimelineContext = createContext<Timeline | null>(null);
export const ClockContext = createContext<MotionValue<number> | null>(null);
export const ExitContext = createContext<MotionValue<number> | null>(null);

export const OpeningContext = createContext<Opening>({ end: 0, length: 0 });

// How fast the opening runs: quicker cut to from another film page, and
// quicker still for a page seen before.
export const PaceContext = createContext(1);

const curve = (bezier: readonly number[]) =>
  cubicBezier(bezier[0], bezier[1], bezier[2], bezier[3]);

export const ease = {
  dolly: curve(EASE.dolly),
  expo: curve(EASE.expo),
  fade: curve(EASE.fade),
  glide: curve(EASE.glide),
  linear: (progress: number) => progress,
  pour: curve(EASE.pour),
  silk: curve(EASE.silk),
};

export const unit = (value: number) => Math.min(1, Math.max(0, value));

// The clock an arrival keeps sits here until the arrival starts.
const UNSTARTED = -1;

// Calls `start` once, when the clock this sits in starts, with the time it
// shows then; whatever it plays is stopped if the element goes first. With no
// clock around there is nothing to wait for and it is never called.
export function useClockStart(
  start: (time: number) => Animation[] | undefined,
) {
  const clock = useContext(ClockContext);
  const latest = useRef(start);
  useEffect(() => {
    latest.current = start;
  });

  useEffect(() => {
    if (!clock) return;
    let running: Animation[] = [];
    const begin = (time: number) => {
      running = latest.current(time) ?? [];
    };
    const stopAll = () => running.forEach((animation) => animation.cancel());

    if (clock.isAnimating() || clock.get() !== UNSTARTED) {
      begin(clock.get());
      return stopAll;
    }
    const unsubscribe = clock.on("change", (time) => {
      unsubscribe();
      begin(time);
    });
    return () => {
      unsubscribe();
      stopAll();
    };
  }, [clock]);

  return clock !== null;
}

const PAST = 1e6;

function useClock() {
  const clock = useContext(ClockContext);
  const past = useMotionValue(PAST);
  return clock ?? past;
}

function useExitClock() {
  const out = useContext(ExitContext);
  const idle = useMotionValue(-1);
  return out ?? idle;
}

export function useProgress(
  at: number,
  run: number,
  shape: (progress: number) => number = ease.expo,
) {
  const clock = useClock();
  return useTransform(clock, (time) => shape(unit((time - at) / run)));
}

export function useExit(at: number, run: number = GRAMMAR.exit.run) {
  const out = useExitClock();
  return useTransform(out, (time) => ease.glide(unit((time - at) / run)));
}

type FadeTag = "dd" | "div" | "span";

interface FadeProps {
  as?: FadeTag;
  at?: number;
  children: ReactNode;
  className?: string;
  out?: number;
  run?: number;
  since?: number;
}

export function Fade(props: FadeProps) {
  return props.since === undefined ? (
    <OpeningFade {...props} />
  ) : (
    <TimedFade {...props} since={props.since} />
  );
}

// On the opening, light follows the opening's own clock, whatever its pace.
function OpeningFade({
  as = "div",
  at = 0,
  children,
  className,
  out,
  run = size(-1),
}: FadeProps) {
  const entered = useProgress(sinceBase(at), run);
  const left = useExit(out ?? PAST);
  const opacity = useTransform(
    [entered, left],
    ([a, b]: number[]) => a * (1 - b),
  );
  const Tag = motion[as] as typeof motion.div;
  return (
    <Tag className={className} style={{ opacity }}>
      {children}
    </Tag>
  );
}

const FADE = bezier(EASE.fade);

// Timed on an arrival, light comes up on the compositor once the arrival
// starts. It stays dark until then, and hands over to the exit once lit.
function TimedFade({
  as = "div",
  children,
  className,
  out,
  run = size(-1),
  since,
}: FadeProps & { since: number }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const clock = useContext(ClockContext);
  const lit = useMotionValue(clock ? 0 : 1);
  const left = useExit(out ?? PAST);
  const opacity = useTransform([lit, left], ([a, b]: number[]) => a * (1 - b));
  useClockStart((time) => {
    const element = ref.current;
    if (!element) return;
    const rest = () => {
      element.style.opacity = String(1 - left.get());
      lit.set(1);
    };
    const wait = since - time;
    if (reduced || wait + run <= 0) {
      rest();
      return;
    }
    return [
      play(element, { opacity: ["0", "1"] }, { easing: FADE, run, wait }, rest),
    ];
  });
  const Tag = motion[as] as typeof motion.div;
  return (
    <Tag className={className} ref={ref} style={{ opacity }}>
      {children}
    </Tag>
  );
}
