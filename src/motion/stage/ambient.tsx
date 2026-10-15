"use client";

import { use, useEffect, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { Room } from "@/motion/film";
import { useScrollY } from "@/motion/scroll";
import { TimelineContext, ease, unit, useExit } from "./clock";
import { GradeContext } from "./frame";
import { GRAMMAR } from "./grammar";
import { useRoom } from "./room";
import { EASE } from "./tempo";

const FADE = 760;
const settle = (y: number) => ease.glide(unit(y / FADE));

const FALLOFF =
  "radial-gradient(ellipse 125% 105% at 50% 32%, #000 30%, rgb(0 0 0 / 0.7))";
const shade = (mix: number, alpha: number) =>
  `color-mix(in oklab, color-mix(in oklab, rgb(var(--grade)) ${mix}%, black) ${alpha}%, transparent)`;
const CEILING = "linear-gradient(rgb(0 0 0 / 0.08), rgb(0 0 0 / 0.14))";
const WASH = [
  `radial-gradient(90% 70% at 22% 18%, ${shade(34, 68)}, transparent 74%)`,
  `radial-gradient(80% 65% at 88% 82%, ${shade(26, 64)}, transparent 74%)`,
  `linear-gradient(${shade(18, 76)}, ${shade(14, 84)})`,
].join(", ");

// Once the backdrop has drifted out of focus and off the top of the page, the
// room keeps its light: the page's grade carries it, with the picture thrown
// far out of focus behind. It fades in step with the backdrop's own fade-out,
// so the one hands over to the other. The ceiling keeps it a room tint rather
// than a second picture.
//
// The room also takes other light. Arriving from another film page it is still
// lit by the scene that was clicked, until this page's picture comes up; a
// still someone lingers over throws its light; and leaving, the next scene's
// light rises as the page goes.
const ROOM = { lead: 0.3, lit: 0.9, rest: 0.2 };

export function Ambient({ source }: { source: string }) {
  const scrollY = useScrollY();
  const left = useExit(GRAMMAR.exit.backdrop);
  const grade = use(GradeContext);
  const timeline = use(TimelineContext);
  const { arrival, destination, lead } = useRoom();
  const [settled, setSettled] = useState(arrival === null);
  const lit = useMotionValue(arrival ? 1 : 0);

  useEffect(() => {
    if (!arrival || !timeline) return;
    let controls: ReturnType<typeof animate> | null = null;
    const cancel = timeline.rolled(() => {
      setSettled(true);
      controls = animate(lit, 0, {
        duration: GRAMMAR.film.arrive,
        ease: EASE.silk,
      });
    });
    return () => {
      cancel();
      controls?.stop();
    };
  }, [arrival, lit, timeline]);

  const scene = destination ?? lead ?? (settled ? source : arrival) ?? source;
  const opacity = useTransform(
    [scrollY, left, lit],
    ([y, out, light]: number[]) =>
      Math.max(settle(y) * (1 - out), destination ? out : 0, light),
  );
  const level = useTransform([left, lit], ([out, light]: number[]) => {
    const rising = Math.max(destination ? out : 0, light);
    const resting = lead ? ROOM.lead : ROOM.rest;
    return resting + (ROOM.lit - resting) * rising;
  });

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
        style={{ background: WASH }}
        transition={{ duration: GRAMMAR.frame.light, ease: EASE.silk }}
      />
      <motion.div className="absolute inset-0" style={{ opacity: level }}>
        <Room
          className="absolute inset-0 size-full"
          cut={GRAMMAR.film.cut}
          src={scene}
        />
      </motion.div>
      <div className="absolute inset-0" style={{ background: CEILING }} />
    </motion.div>
  );
}
