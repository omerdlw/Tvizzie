"use client";

import { use, type CSSProperties } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { Room } from "@/motion/film";
import { useScrollY } from "@/motion/scroll";
import { ease, unit, useExit } from "./clock";
import { GradeContext } from "./frame";
import { GRAMMAR } from "./grammar";
import { useRoom } from "./room";
import { EASE } from "./tempo";
import { useWall } from "./wall";

const FADE = 760;
const settle = (y: number) => ease.glide(unit(y / FADE));

const FALLOFF =
  "radial-gradient(ellipse 125% 105% at 50% 32%, #000 30%, rgb(0 0 0 / 0.7))";

const SIDES = ["top", "left", "right", "bottom"] as const;
type Side = (typeof SIDES)[number];
const light = (side: Side) => `--room-${side}`;

if (typeof CSS !== "undefined" && "registerProperty" in CSS) {
  for (const side of SIDES) {
    try {
      CSS.registerProperty({
        inherits: false,
        initialValue: "transparent",
        name: light(side),
        syntax: "<color>",
      });
    } catch {}
  }
}

const SIDE_LIGHT = Object.fromEntries(
  SIDES.map((side) => [
    light(side),
    `oklch(from var(--ambient-${side}, rgb(var(--grade))) 0.74 min(c, 0.1) h)`,
  ]),
) as Record<string, string>;

const corner = (a: Side, b: Side) =>
  `color-mix(in oklab, var(${light(a)}), var(${light(b)}))`;
const shade = (color: string, mix: number, alpha: number) =>
  `color-mix(in oklab, color-mix(in oklab, ${color} ${mix}%, black) ${alpha}%, transparent)`;
const CEILING = "linear-gradient(rgb(0 0 0 / 0.08), rgb(0 0 0 / 0.14))";
const WASH = [
  `radial-gradient(90% 70% at 22% 18%, ${shade(corner("top", "left"), 34, 68)}, transparent 74%)`,
  `radial-gradient(80% 65% at 88% 82%, ${shade(corner("bottom", "right"), 26, 64)}, transparent 74%)`,
  `linear-gradient(${shade(`var(${light("top")})`, 18, 76)}, ${shade(`var(${light("bottom")})`, 14, 84)})`,
].join(", ");
const DRAWN_OVER = SIDES.map(
  (side) =>
    `${light(side)} ${GRAMMAR.film.cut}s cubic-bezier(${EASE.silk.join(", ")})`,
).join(", ");

const ROOM = { lead: 0.3, rest: 0.2 };

export function Ambient({
  rises = true,
  source,
}: {
  rises?: boolean;
  source: string;
}) {
  const scrollY = useScrollY();
  const left = useExit(GRAMMAR.exit.backdrop);
  const grade = use(GradeContext);
  const reduced = useReducedMotion();
  const { lead } = useRoom();
  const wall = useWall();
  const up = useMotionValue(1);
  const lit = wall?.page ?? up;
  const opacity = useTransform(
    [scrollY, left, lit],
    ([y, out, page]: number[]) =>
      Math.max(rises ? settle(y) : 0, 1 - page) * (1 - out),
  );

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{ maskImage: FALLOFF, opacity, WebkitMaskImage: FALLOFF }}
    >
      <motion.div
        animate={{ opacity: grade?.tone ? 1 : 0 }}
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        style={
          {
            ...SIDE_LIGHT,
            background: WASH,
            transition: reduced ? "none" : DRAWN_OVER,
          } as CSSProperties
        }
        transition={{ duration: GRAMMAR.frame.light, ease: EASE.silk }}
      />
      <motion.div
        animate={{ opacity: lead ? ROOM.lead : ROOM.rest }}
        className="absolute inset-0"
        initial={false}
        transition={{ duration: GRAMMAR.film.cut, ease: EASE.silk }}
      >
        <Room
          className="absolute inset-0 size-full"
          cut={GRAMMAR.film.cut}
          src={lead ?? source}
        />
      </motion.div>
      <div className="absolute inset-0" style={{ background: CEILING }} />
    </motion.div>
  );
}
