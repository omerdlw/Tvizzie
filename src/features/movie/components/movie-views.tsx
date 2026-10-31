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
import { useReducedMotion } from "motion/react";
import { useSmoothScroll } from "@/motion/scroll";
import { SCENE } from "../lib/motion";
import { EASE, ViewDeck, scrollToElement } from "@/motion/stage";

type MovieViewKey = "overview" | "awards";

const KEYS: readonly MovieViewKey[] = ["overview", "awards"];

const TOP_MARGIN = 24;

interface MovieViewState {
  show: (view: MovieViewKey) => void;
  toggle: (view: MovieViewKey) => void;
  view: MovieViewKey;
}

const MovieViewContext = createContext<MovieViewState | null>(null);

export function MovieViewProvider({
  children,
  initialView = "overview",
}: {
  children: ReactNode;
  initialView?: MovieViewKey;
}) {
  const [view, setView] = useState<MovieViewKey>(initialView);
  const toggle = useCallback(
    (next: MovieViewKey) =>
      setView((current) => (current === next ? "overview" : next)),
    [],
  );
  const value = useMemo(
    () => ({ show: setView, toggle, view }),
    [toggle, view],
  );
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
  const { leave } = SCENE.view;

  useEffect(() => {
    if (view === shown) return;
    const timer = setTimeout(
      () => {
        const element = column.current;
        if (element) {
          const { top } = element.getBoundingClientRect();
          const wide = window.matchMedia("(min-width: 1024px)").matches;
          if (top < 0 || (!wide && top > window.innerHeight * 0.6)) {
            scrollToElement(engine, element, TOP_MARGIN);
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
    <ViewDeck
      arrive={EASE.pour}
      columnRef={column}
      keys={KEYS}
      shown={shown}
      switching={switching}
      timing={SCENE.view}
      views={views}
    />
  );
}
