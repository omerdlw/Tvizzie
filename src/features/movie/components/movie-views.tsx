"use client";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { motion, useReducedMotion } from "motion/react";
import { useSmoothScroll } from "@/motion/scroll";
import { MAIN_COLUMN_CLASS, VIEW_CLASS } from "../lib/layout";
import { SCENE } from "../lib/motion";
import { EASE, FOCUSED, blur } from "../lib/tempo";

type MovieViewKey = "overview" | "awards";

const KEYS: readonly MovieViewKey[] = ["overview", "awards"];

const TOP_MARGIN = 24;

interface MovieViewState {
  toggle: (view: MovieViewKey) => void;
  view: MovieViewKey;
}

const MovieViewContext = createContext<MovieViewState | null>(null);

export function MovieViewProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<MovieViewKey>("overview");
  const toggle = useCallback(
    (next: MovieViewKey) =>
      setView((current) => (current === next ? "overview" : next)),
    [],
  );
  const value = useMemo(() => ({ toggle, view }), [toggle, view]);
  return <MovieViewContext value={value}>{children}</MovieViewContext>;
}

export function useMovieView(): MovieViewState {
  const state = use(MovieViewContext);
  if (!state) {
    throw new Error("useMovieView needs a MovieViewProvider above it");
  }
  return state;
}

export function MovieViews({
  views,
}: {
  views: Record<MovieViewKey, ReactNode>;
}) {
  const { view } = useMovieView();
  const [shown, setShown] = useState<MovieViewKey>(view);
  const column = useRef<HTMLDivElement>(null);
  const engine = useSmoothScroll();
  const reduced = useReducedMotion();
  const switching = view !== shown;
  const { enter, leave, lift } = SCENE.view;

  useEffect(() => {
    if (view === shown) return;
    const timer = setTimeout(
      () => {
        const element = column.current;
        if (element) {
          const { top } = element.getBoundingClientRect();
          const wide = window.matchMedia("(min-width: 1024px)").matches;
          if (top < 0 || (!wide && top > window.innerHeight * 0.6)) {
            if (engine) {
              engine.scrollTo(element, {
                immediate: true,
                offset: -TOP_MARGIN,
              });
            } else {
              window.scrollTo({
                behavior: "instant",
                top: top + window.scrollY - TOP_MARGIN,
              });
            }
          }
        }
        setShown(view);
        requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
      },
      reduced ? 0 : leave * 1000,
    );
    return () => clearTimeout(timer);
  }, [engine, leave, reduced, shown, view]);

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
