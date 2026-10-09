"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { MotionValue } from "motion/react";
import { imagesReady } from "./ready";
import { TimelineContext } from "./stage";

interface Opened {
  at: number;
  delay: number;
}

interface SectionState {
  enter: MotionValue<number>;
  after: (step: number) => number;
  opened: Opened | null;
  through: MotionValue<number>;
  report: (key: string, seconds: number | null) => void;
}

export const SectionContext = createContext<SectionState | null>(null);

export const GroupContext = createContext<{ opened: Opened | null } | null>(
  null,
);

export const useSection = () => useContext(SectionContext);

export const LeadContext = createContext(0);

export function remaining(opened: Opened, step: number, now: number) {
  return Math.max(0, (opened.at + (opened.delay + step) * 1000 - now) / 1000);
}

export function useCue<T extends HTMLElement>({
  at = 0,
  gate = false,
  margin = "0px 0px -6% 0px",
  span,
  step,
}: {
  at?: number;
  gate?: boolean;
  margin?: string;
  span?: () => number;
  step?: number;
} = {}) {
  const ref = useRef<T>(null);
  const timeline = useContext(TimelineContext);
  const group = useContext(GroupContext);
  const [mountedAt] = useState(() => performance.now());
  const [opened, setOpened] = useState<Opened | null>(null);
  const follow = step !== undefined && group !== null;

  useEffect(() => {
    if (follow) return;
    const element = ref.current;
    if (!element) return;
    let withdraw: (() => void) | null = null;
    let present = true;
    const open = (delay: number) => {
      observer.disconnect();
      setOpened((current) => current ?? { at: performance.now(), delay });
    };
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (!entry) return;
        withdraw?.();
        withdraw = null;
        if (!entry.isIntersecting) return;
        if (gate && timeline) {
          const ticket = timeline.request(
            () => element.getBoundingClientRect().top,
            open,
            true,
            span,
          );
          withdraw = ticket.withdraw;
          void imagesReady(element).then(() => {
            if (present) ticket.ready();
          });
        } else {
          open(timeline ? timeline.until(at) : 0);
        }
      },
      { rootMargin: margin },
    );
    observer.observe(element);
    return () => {
      present = false;
      observer.disconnect();
      withdraw?.();
    };
  }, [at, follow, gate, margin, span, timeline]);

  const reveal = follow ? group.opened : opened;
  let delay = 0;
  if (reveal) {
    delay = follow
      ? mountedAt >= reveal.at
        ? remaining(reveal, step, mountedAt)
        : reveal.delay + step
      : reveal.delay;
  }

  return { at: reveal?.at ?? 0, delay, ref, shown: reveal !== null };
}
