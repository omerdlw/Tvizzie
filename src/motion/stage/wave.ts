"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { animate, useMotionValue, useReducedMotion } from "motion/react";
import { GRAMMAR } from "./grammar";
import { PHI, settle, size } from "./tempo";

const MARGIN = "0px 0px -6% 0px";

// Long enough for every layer inside an arrival to have come to rest.
const LOCAL_END = size(4);

interface Waiting {
  element: HTMLElement;
  open: (delay: number) => void;
}

export interface Wave {
  begin: (at: number) => void;
  dispose: () => void;
  watch: (element: HTMLElement, open: (delay: number) => void) => () => void;
}

// Reading order: by row, then along it. Two boxes share a row when the second
// starts before the first is half way down.
function readingOrder(batch: Waiting[]): Waiting[] {
  const placed = batch
    .map((entry) => ({ box: entry.element.getBoundingClientRect(), entry }))
    .sort((a, b) => a.box.top - b.box.top);
  let row = -1;
  let rowTop = -Infinity;
  let rowHeight = 0;
  return placed
    .map(({ box, entry }) => {
      if (box.top - rowTop > rowHeight / 2) {
        row += 1;
        rowTop = box.top;
        rowHeight = box.height;
      } else {
        rowHeight = Math.min(rowHeight, box.height);
      }
      return { entry, left: box.left, row };
    })
    .sort((a, b) => a.row - b.row || a.left - b.left)
    .map(({ entry }) => entry);
}

// A wave lets things arrive only once they are on screen, and in the order the
// eye meets them. Whatever is seen together goes in one pass, a step apart;
// what scrolls in later starts where the eye already is, waiting no more than
// a beat for the pass before it.
//
// An eager wave does not wait for things to be seen: what it holds is on
// screen as soon as it is there.
export function createWave({
  eager = false,
  gap,
}: {
  eager?: boolean;
  gap: number;
}): Wave {
  const watched = new Map<Element, Waiting>();
  const seen: Waiting[] = [];
  let from: number | null = null;
  let free = 0;
  let frame = 0;
  let observer: IntersectionObserver | null = null;

  const flush = () => {
    frame = 0;
    if (from === null || seen.length === 0) return;
    const now = performance.now();
    const batch = readingOrder(seen.splice(0));
    const wait = GRAMMAR.items.wait * 1000;
    const base = Math.max(now, from, Math.min(free, now + wait));
    const total = (batch.length - 1) * gap;
    batch.forEach((entry, index) => {
      const offset = settle(index, batch.length, total, GRAMMAR.items.bend);
      entry.open((base - now) / 1000 + offset);
    });
    free = base + (total + gap) * 1000;
  };

  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(flush);
  };

  const observe = () =>
    (observer ??= new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const waiting = watched.get(entry.target);
          if (!waiting) continue;
          observer?.unobserve(entry.target);
          watched.delete(entry.target);
          seen.push(waiting);
        }
        schedule();
      },
      { rootMargin: MARGIN },
    ));

  return {
    begin(at) {
      if (from !== null) return;
      from = at;
      free = at;
      schedule();
    },
    dispose() {
      observer?.disconnect();
      observer = null;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    },
    watch(element, open) {
      const waiting = { element, open };
      if (eager) {
        seen.push(waiting);
        schedule();
        return () => {
          const index = seen.indexOf(waiting);
          if (index >= 0) seen.splice(index, 1);
        };
      }
      watched.set(element, waiting);
      observe().observe(element);
      return () => {
        watched.delete(element);
        observer?.unobserve(element);
        const index = seen.indexOf(waiting);
        if (index >= 0) seen.splice(index, 1);
      };
    },
  };
}

export const WaveContext = createContext<Wave | null>(null);

// How things arrive where this is given: at what pace, and whether they wait
// to be seen.
export interface Arrival {
  eager: boolean;
  pace: number;
}

export const ArrivalContext = createContext<Arrival>({
  eager: false,
  pace: 1,
});

// A dock surface is on screen the moment it opens, and the dock keeps a
// quicker time than the page: what is in it arrives φ² as fast, a step apart,
// without waiting to be seen.
export const IN_DOCK: Arrival = Object.freeze({ eager: true, pace: PHI ** 2 });

// `from` is the moment, on the performance clock, the wave may begin.
export function useWave(from: number | null, gap: number, eager = false) {
  const [wave] = useState(() => createWave({ eager, gap }));
  useEffect(() => {
    if (from !== null) wave.begin(from);
  }, [from, wave]);
  useEffect(() => () => wave.dispose(), [wave]);
  return wave;
}

// When this element arrives: never before it is on screen, and in turn with
// whatever else its wave lets in.
export function useArrival<T extends HTMLElement>() {
  const wave = useContext(WaveContext);
  const reduced = useReducedMotion();
  const ref = useRef<T>(null);
  const [delay, setDelay] = useState<number | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || delay !== null) return;
    if (!wave || reduced) {
      setDelay(0);
      return;
    }
    return wave.watch(element, setDelay);
  }, [reduced, wave]);

  return { delay: delay ?? 0, ref, shown: delay !== null };
}

// Everything that arrives keeps its own time from the moment it starts, so
// what is inside it can be revealed in order on that time: the frame first,
// then the picture in it, then its words.
export function useArrivalClock(shown: boolean, delay: number) {
  const time = useMotionValue(-1);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!shown) return;
    if (reduced) {
      time.set(LOCAL_END);
      return;
    }
    time.set(-delay);
    const controls = animate(time, LOCAL_END, {
      duration: LOCAL_END + delay,
      ease: "linear",
    });
    return () => controls.stop();
  }, [delay, reduced, shown, time]);
  return time;
}
