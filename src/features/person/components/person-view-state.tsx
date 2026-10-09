"use client";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Awards } from "@/infrastructure/tmdb/types";
import type { AwardTotals, PersonViewKey } from "../lib/types";
import { toggleView } from "../lib/utils";

interface PersonViewState {
  awards: AwardTotals | null;
  focusYear: number | null;
  hasTimeline: boolean;
  openTimeline: (year: number) => void;
  toggle: (view: Exclude<PersonViewKey, "main">) => void;
  view: PersonViewKey;
}

const PersonViewContext = createContext<PersonViewState | null>(null);

export function PersonViewProvider({
  awards,
  children,
  hasTimeline,
}: {
  awards: Promise<Awards | null>;
  children: ReactNode;
  hasTimeline: boolean;
}) {
  const [view, setView] = useState<PersonViewKey>("main");
  const [focusYear, setFocusYear] = useState<number | null>(null);
  const [totals, setTotals] = useState<AwardTotals | null>(null);

  useEffect(() => {
    let current = true;
    void awards.then((resolved) => {
      if (!current) return;
      setTotals(
        resolved && resolved.organizations.length > 0
          ? { nominations: resolved.nominations, wins: resolved.wins }
          : null,
      );
    });
    return () => {
      current = false;
    };
  }, [awards]);

  const toggle = useCallback((target: Exclude<PersonViewKey, "main">) => {
    setFocusYear(null);
    setView((current) => toggleView(current, target));
  }, []);
  const openTimeline = useCallback((year: number) => {
    setFocusYear(year);
    setView("timeline");
  }, []);

  const value = useMemo(
    () => ({
      awards: totals,
      focusYear,
      hasTimeline,
      openTimeline,
      toggle,
      view,
    }),
    [focusYear, hasTimeline, openTimeline, toggle, totals, view],
  );
  return <PersonViewContext value={value}>{children}</PersonViewContext>;
}

export function usePersonView(): PersonViewState {
  const state = use(PersonViewContext);
  if (!state) {
    throw new Error("usePersonView needs a PersonViewProvider above it");
  }
  return state;
}
