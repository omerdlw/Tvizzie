"use client";

import { use } from "react";
import { motion, useTransform } from "motion/react";
import { Room } from "@/motion/film";
import { useScrollY } from "@/motion/scroll";
import { ease, unit, useExit } from "./clock";
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
// than a second picture. A still someone lingers over throws its own light.
const ROOM = { lead: 0.3, rest: 0.2 };

export function Ambient({ source }: { source: string }) {
  const scrollY = useScrollY();
  const left = useExit(GRAMMAR.exit.backdrop);
  const grade = use(GradeContext);
  const { lead } = useRoom();
  const opacity = useTransform(
    [scrollY, left],
    ([y, out]: number[]) => settle(y) * (1 - out),
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
        style={{ background: WASH }}
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
