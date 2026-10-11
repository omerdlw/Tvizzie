"use client";

import type { JSX } from "react";
import Link from "next/link";
import { motion, usePresenceData, type Variants } from "motion/react";
import { movieHref } from "@config/routes";

// The pieces the home page sets its credits with, shared by every section so a
// title changes the same way wherever it sits.

const SETTLE = [0.22, 1, 0.36, 1] as const;
const LEAVE = [0.55, 0, 0.75, 0.2] as const;

export const MONO =
  "font-mono text-[10px] uppercase tracking-[0.24em] sm:text-[11px]";

interface Glyph {
  direction: number;
  index: number;
}

// Credits change the way a projector changes focus: each letter comes out of
// a soft blur a beat after the one before it, and the outgoing title melts
// away in the direction the scroll is going.
const glyph: Variants = {
  enter: ({ direction }: Glyph) => ({
    filter: "blur(12px)",
    opacity: 0,
    y: `${direction * 0.32}em`,
  }),
  leave: ({ direction, index }: Glyph) => ({
    filter: "blur(10px)",
    opacity: 0,
    transition: { delay: index * 0.008, duration: 0.55, ease: LEAVE },
    y: `${direction * -0.22}em`,
  }),
  show: ({ index }: Glyph) => ({
    filter: "blur(0px)",
    opacity: 1,
    transition: { delay: 0.18 + index * 0.024, duration: 1.2, ease: SETTLE },
    y: "0em",
  }),
};

export const creditLine: Variants = {
  enter: (direction: number) => ({
    filter: "blur(8px)",
    opacity: 0,
    y: direction * 10,
  }),
  leave: {
    filter: "blur(6px)",
    opacity: 0,
    transition: { duration: 0.45, ease: LEAVE },
  },
  show: {
    filter: "blur(0px)",
    opacity: 1,
    transition: { delay: 0.45, duration: 1.1, ease: SETTLE },
    y: 0,
  },
};

// A leaving credit follows the scroll as it is now, not as it arrived.
export function usePresenceDirection(direction: number): number {
  const presence = usePresenceData();
  return typeof presence === "number" ? presence : direction;
}

export function CreditTitle({
  className,
  direction,
  title,
}: {
  className: string;
  direction: number;
  title: string;
}): JSX.Element {
  let count = 0;
  const words = title
    .split(/\s+/)
    .map((text) => Array.from(text).map((char) => ({ char, index: count++ })));

  return (
    <h3 aria-label={title} className={className}>
      {words.map((letters, w) => (
        <span key={w} aria-hidden className="inline-block whitespace-nowrap">
          {letters.map(({ char, index }) => (
            <motion.span
              key={index}
              className="inline-block will-change-[transform,filter]"
              custom={{ direction, index }}
              variants={glyph}
            >
              {char}
            </motion.span>
          ))}
          {w < words.length - 1 ? <span>&nbsp;</span> : null}
        </span>
      ))}
    </h3>
  );
}

export function OpenFilm({ id }: { id: number }): JSX.Element {
  return (
    <Link
      className={`group inline-flex items-center gap-3 py-1 text-white/90 ${MONO}`}
      href={movieHref(id)}
    >
      Open film
      <span
        aria-hidden
        className="block h-px w-8 origin-left bg-white/60 transition-transform duration-slow ease-out-quint group-hover:scale-x-[1.75]"
        data-cinematic
      />
    </Link>
  );
}
