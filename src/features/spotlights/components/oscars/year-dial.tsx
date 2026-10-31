"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type JSX,
} from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import { cn } from "@omerdlw/base-framework/utils";
import { EASE } from "@/motion/stage";
import type { Laureate } from "../../lib/types";

const STEP = 14;
const DRAG_SLOP = 4;

// A tuning dial for the ceremonies: the strip of years slides under a fixed
// needle. Dragging scrubs (the plate stays molten until the hand stops),
// arrow keys, Home/End and Page keys work while it has focus. Once `shown`,
// it comes up from the needle outwards: the needle drops, the ticks rise
// out from it, and the decades follow.
export function YearDial({
  index,
  laureates,
  onPick,
  shown,
}: {
  index: number;
  laureates: Laureate[];
  onPick: (index: number) => void;
  shown: boolean;
}): JSX.Element {
  const reduced = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const x = useMotionValue(0);
  const drag = useRef<{ from: number; moved: boolean; start: number } | null>(
    null,
  );
  const last = laureates.length - 1;
  const film = laureates[index];
  const at = (i: number) => width / 2 - i * STEP;

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry?.contentRect.width ?? 0),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const placed = useRef(false);
  useEffect(() => {
    if (!width || drag.current) return;
    if (reduced || !placed.current) {
      placed.current = true;
      x.set(at(index));
      return;
    }
    const controls = animate(x, at(index), { duration: 0.9, ease: EASE.dolly });
    return () => controls.stop();
  }, [index, reduced, width]);

  const nearest = (position: number) =>
    Math.max(0, Math.min(last, Math.round((width / 2 - position) / STEP)));

  return (
    <div
      className="oscars-dial relative w-full select-none"
      data-shown={shown ? "" : undefined}
    >
      <div
        aria-label="Ceremony"
        aria-valuemax={laureates.length}
        aria-valuemin={1}
        aria-valuenow={index + 1}
        aria-valuetext={
          film ? `${film.ceremonyYear}, ${film.title}` : undefined
        }
        className="relative h-16 w-full cursor-grab touch-none overflow-hidden outline-none active:cursor-grabbing [mask-image:linear-gradient(90deg,transparent,black_18%,black_82%,transparent)]"
        onKeyDown={(event) => {
          const jump: Record<string, number> = {
            ArrowLeft: -1,
            ArrowDown: -1,
            ArrowRight: 1,
            ArrowUp: 1,
            PageDown: -10,
            PageUp: 10,
          };
          let next: number | null = null;
          if (event.key in jump) next = index + jump[event.key]!;
          if (event.key === "Home") next = 0;
          if (event.key === "End") next = last;
          if (next === null) return;
          event.preventDefault();
          onPick(Math.max(0, Math.min(last, next)));
        }}
        onPointerCancel={() => {
          drag.current = null;
          animate(x, at(index), { duration: 0.6, ease: EASE.dolly });
        }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          x.stop();
          drag.current = { from: x.get(), moved: false, start: event.clientX };
        }}
        onPointerMove={(event) => {
          const hand = drag.current;
          if (!hand) return;
          const dx = event.clientX - hand.start;
          if (!hand.moved && Math.abs(dx) < DRAG_SLOP) return;
          hand.moved = true;
          const position = Math.max(at(last), Math.min(at(0), hand.from + dx));
          x.set(position);
          const next = nearest(position);
          if (next !== index) onPick(next);
        }}
        onPointerUp={(event) => {
          const hand = drag.current;
          drag.current = null;
          if (!hand) return;
          let next = nearest(x.get());
          if (!hand.moved) {
            const box = event.currentTarget.getBoundingClientRect();
            next = nearest(x.get() - (event.clientX - box.left - width / 2));
          }
          onPick(next);
          animate(x, at(next), { duration: 0.7, ease: EASE.dolly });
        }}
        ref={root}
        role="slider"
        tabIndex={0}
      >
        <motion.div
          aria-hidden="true"
          className="absolute inset-y-0 left-0"
          style={{ x }}
        >
          {laureates.map((laureate, i) => {
            const decade =
              i > 0 &&
              Math.floor(laureate.ceremonyYear / 10) !==
                Math.floor(laureates[i - 1]!.ceremonyYear / 10);
            const on = i === index;
            return (
              <span
                className="absolute bottom-3 flex -translate-x-1/2 flex-col items-center"
                key={laureate.ceremony}
                style={
                  {
                    "--d": Math.min(48, Math.abs(i - index)),
                    left: i * STEP,
                  } as CSSProperties
                }
              >
                {decade ? (
                  <span className="oscars-decade mb-2 text-[10px] font-semibold tracking-[0.14em] text-white/35 tabular-nums">
                    {Math.floor(laureate.ceremonyYear / 10) * 10}
                  </span>
                ) : null}
                <span
                  className={cn(
                    "oscars-tick block w-px origin-bottom cine-fade",
                    on
                      ? "h-6 bg-[#e9c46a]"
                      : decade
                        ? "h-4 bg-white/40"
                        : "h-2.5 bg-white/20",
                  )}
                />
              </span>
            );
          })}
        </motion.div>
      </div>
      <span
        aria-hidden="true"
        className="oscars-needle pointer-events-none absolute bottom-2 left-1/2 h-9 w-px -translate-x-1/2 bg-gradient-to-t from-[#e9c46a] to-transparent"
      />
    </div>
  );
}
