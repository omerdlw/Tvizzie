"use client";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  type AnimationPlaybackControls,
  type MotionValue,
} from "motion/react";
import { useSmoothScroll } from "@/motion/scroll";
import { ClockContext } from "./clock";
import { Develop } from "./develop";
import { GRAMMAR } from "./grammar";
import { EASE } from "./tempo";
import { useArrival, useArrivalClock } from "./wave";

// "page": the film's page is up. "leaving": it is rolling back to its head
// and going dark. "wall": the gallery hangs on its own. "closing": the wall is
// going dark. "returning": the page is coming back up where it was left.
export type WallPhase = "page" | "leaving" | "wall" | "closing" | "returning";

export interface WallState {
  close: () => void;
  // Hangs the wall on `set`, remembering `from` to come back to.
  open: (set: string, from: HTMLElement | null) => void;
  // How much of the page is in light, from 1 down to 0 as the wall goes up.
  page: MotionValue<number>;
  phase: WallPhase;
  set: string | null;
}

export const WallContext = createContext<WallState | null>(null);

export const useWall = () => use(WallContext);

const TOP_MARGIN = 24;

const dialogOpen = () =>
  Boolean(document.querySelector("[role='dialog'], [aria-modal='true']"));

const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value));

export function useWallScene(): WallState & { hung: () => void } {
  const [phase, setPhase] = useState<WallPhase>("page");
  const [set, setSet] = useState<string | null>(null);
  const page = useMotionValue(1);
  const anchor = useRef<HTMLElement | null>(null);
  const controls = useRef<AnimationPlaybackControls | null>(null);
  const smooth = useSmoothScroll();
  const reduced = useReducedMotion();
  const { back, dim, roll } = GRAMMAR.wall;

  const open = useCallback(
    (next: string, from: HTMLElement | null) => {
      if (phase !== "page") return;
      anchor.current = from;
      setSet(next);
      controls.current?.stop();
      if (reduced) {
        page.set(0);
        setPhase("wall");
        return;
      }
      const y = window.scrollY;
      const run = clamp(y / roll.per, roll.min, roll.max);
      if (y > 0) {
        if (smooth) smooth.scrollTo(0, { duration: run });
        else window.scrollTo({ behavior: "smooth", top: 0 });
      }
      setPhase("leaving");
      controls.current = animate(page, 0, {
        delay: Math.max(0, run - dim),
        duration: dim,
        ease: EASE.glide,
        onComplete: () => setPhase("wall"),
      });
    },
    [dim, page, phase, reduced, roll, smooth],
  );

  const close = useCallback(() => {
    if (phase === "wall") setPhase(reduced ? "returning" : "closing");
  }, [phase, reduced]);

  const hung = useCallback(() => {
    setPhase((current) => (current === "closing" ? "returning" : current));
  }, []);

  // The wall is hung at the head of the page, however the roll ended; the
  // page coming back is set where the gallery was before it is lit.
  useLayoutEffect(() => {
    if (phase === "wall") {
      window.scrollTo({ behavior: "instant", top: 0 });
      smooth?.resync();
      return;
    }
    if (phase !== "returning") return;
    const from = anchor.current;
    if (from?.isConnected) {
      const top = from.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ behavior: "instant", top: top - TOP_MARGIN });
    }
    smooth?.resync();
    window.dispatchEvent(new Event("resize"));
    controls.current?.stop();
    if (reduced) {
      page.set(1);
      setPhase("page");
      return;
    }
    controls.current = animate(page, 1, {
      duration: back,
      ease: EASE.pour,
      onComplete: () => setPhase("page"),
    });
  }, [back, page, phase, reduced, smooth]);

  useEffect(() => () => controls.current?.stop(), []);

  useEffect(() => {
    if (phase !== "wall") return;
    const key = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || dialogOpen()) return;
      close();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [close, phase]);

  return useMemo(
    () => ({ close, hung, open, page, phase, set }),
    [close, hung, open, page, phase, set],
  );
}

// Whether the page itself is off the screen while the wall is up.
export const pageDown = (phase: WallPhase | undefined) =>
  phase === "wall" || phase === "closing";

// What hangs on the wall, once the page has gone dark, and goes dark itself
// before the page comes back.
export function Hung({
  children,
  onDown,
}: {
  children: ReactNode;
  onDown: () => void;
}) {
  const wall = useWall();
  return (
    <AnimatePresence onExitComplete={onDown}>
      {wall?.phase === "wall" ? (
        <motion.div
          className="relative z-10"
          exit={{
            opacity: 0,
            transition: { duration: GRAMMAR.wall.down, ease: EASE.glide },
          }}
          key="wall"
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

// One picture on the wall: it develops like a slide does, once it is in
// view and in its turn.
export function Tile({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { delay, ref, shown } = useArrival<HTMLDivElement>();
  const clock = useArrivalClock(shown, delay);
  const { run, zoom } = GRAMMAR.slides;
  return (
    <div className={className} ref={ref}>
      <ClockContext value={clock}>
        <Develop
          className="h-full rounded-[inherit]"
          radius={20}
          run={run}
          zoom={zoom}
        >
          {children}
        </Develop>
      </ClockContext>
    </div>
  );
}
