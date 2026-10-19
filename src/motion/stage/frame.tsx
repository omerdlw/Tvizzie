"use client";

import { createContext, use, useContext, useEffect, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { Dust, RoomGrain, readable, useHouseDown } from "@/motion/film";
import { GRAMMAR } from "./grammar";
import { EASE } from "./tempo";
import { PaceContext, TimelineContext, useExit } from "./clock";
import { toneOf } from "./grade";

export const GradeContext = createContext<{
  set: (tone: string) => void;
  tone: string | null;
} | null>(null);

const READ_WIDTH = 48;

export function Grade({ source }: { source: string | null }) {
  const grade = use(GradeContext);
  const set = grade?.set;

  useEffect(() => {
    if (!source || !set) return;
    let live = true;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.onload = () => {
      if (!live || !image.naturalWidth) return;
      const height = Math.max(
        1,
        Math.round((READ_WIDTH * image.naturalHeight) / image.naturalWidth),
      );
      const canvas = document.createElement("canvas");
      canvas.width = READ_WIDTH;
      canvas.height = height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;
      context.drawImage(image, 0, 0, READ_WIDTH, height);
      const tone = toneOf(context.getImageData(0, 0, READ_WIDTH, height).data);
      if (tone) set(tone.join(" "));
    };
    image.src = readable(source);
    return () => {
      live = false;
      image.onload = null;
    };
  }, [set, source]);

  return null;
}

// The letterbox the film is shown in. A page opens out of it and closes back
// into it, so from one film page to the next the frame is never lost: the bars
// stand at the same height as one page leaves and the next opens.
function Bars() {
  const reduced = useReducedMotion();
  const { at, height, run, shut } = GRAMMAR.frame.bars;
  const left = useExit(GRAMMAR.exit.backdrop);
  const open = useMotionValue(reduced ? 1 : 0);
  const pace = useContext(PaceContext);
  const timeline = useContext(TimelineContext);
  const rest = height / shut;
  const closed = useTransform([open, left], ([o, l]: number[]) =>
    Math.max(rest * (1 - o), rest * l),
  );

  // The bars part on the first frame of the picture, not on the page.
  useEffect(() => {
    if (reduced) return;
    let controls: ReturnType<typeof animate> | null = null;
    const part = () => {
      controls = animate(open, 1, {
        delay: at / pace,
        duration: run / pace,
        ease: EASE.glide,
      });
    };
    const cancel = timeline ? timeline.rolled(part) : (part(), () => {});
    return () => {
      cancel();
      controls?.stop();
    };
  }, [at, open, pace, reduced, run, timeline]);

  const bar = "pointer-events-none fixed inset-x-0 z-20 bg-black";
  const style = { height: `${shut}vh`, scaleY: closed } as const;
  return (
    <>
      <motion.div
        aria-hidden="true"
        className={`${bar} top-0 origin-top`}
        style={style}
        suppressHydrationWarning
      />
      <motion.div
        aria-hidden="true"
        className={`${bar} bottom-0 origin-bottom`}
        style={style}
        suppressHydrationWarning
      />
    </>
  );
}

// Where the pointer last was, kept across pages: the light under it is the
// same light on the next page, not one that goes out at the cut.
let lastPointer: { x: number; y: number } | null = null;

const GLOW_DRIFT = { damping: 19, mass: 1, stiffness: 36 };

function Glow() {
  const radius = 380;
  const [start] = useState(() => lastPointer);
  const x = useMotionValue(start ? start.x - radius : 0);
  const y = useMotionValue(start ? start.y - radius : 0);
  const near = useMotionValue(start ? 1 : 0);
  // A cloud of light, not a spotlight: it drifts after the hand.
  const sx = useSpring(x, GLOW_DRIFT);
  const sy = useSpring(y, GLOW_DRIFT);
  const house = useHouseDown();
  const lights = useMotionValue(1);
  const opacity = useSpring(near, { damping: 24, stiffness: 40 });
  const shown = useTransform(
    [opacity, lights],
    ([value, on]: number[]) => value * on,
  );
  useEffect(() => lights.set(house ? 0 : 1), [house, lights]);

  useEffect(() => {
    let placed = start !== null;
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      lastPointer = { x: event.clientX, y: event.clientY };
      x.set(event.clientX - radius);
      y.set(event.clientY - radius);
      if (!placed) {
        placed = true;
        sx.jump(event.clientX - radius);
        sy.jump(event.clientY - radius);
      }
      near.set(1);
    };
    const leave = () => {
      lastPointer = null;
      near.set(0);
    };
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("mouseleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("mouseleave", leave);
    };
  }, [near, start, sx, sy, x, y]);

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 z-20"
      style={{
        background:
          "radial-gradient(circle closest-side, rgb(var(--grade) / 0.085), rgb(var(--grade) / 0.035) 45%, transparent)",
        height: radius * 2,
        opacity: shown,
        width: radius * 2,
        willChange: "transform",
        x: sx,
        y: sy,
      }}
    >
      <Dust opacity={opacity} radius={radius} x={sx} y={sy} />
    </motion.div>
  );
}

// The face of the tube: the picture falls away towards its rim, more where
// two edges meet, so the corners curve off as a set's glass does, and the
// room's light leaves a faint sheen high on the left.
const GLASS = [
  "radial-gradient(60% 45% at 16% 0%, rgb(255 255 255 / 0.018), transparent 70%)",
  "radial-gradient(ellipse 125% 105% at 50% 45%, transparent 58%, rgb(0 0 0 / 0.42))",
  "linear-gradient(to right, rgb(0 0 0 / 0.1), transparent 6%, transparent 94%, rgb(0 0 0 / 0.1))",
  "linear-gradient(to bottom, rgb(0 0 0 / 0.09), transparent 8%, transparent 92%, rgb(0 0 0 / 0.09))",
].join(", ");

function HouseLights() {
  const down = useHouseDown();
  const { level, run } = GRAMMAR.film.house;
  return (
    <motion.div
      animate={{ opacity: down ? level : 0 }}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-20 bg-black"
      initial={false}
      transition={{ duration: run, ease: EASE.silk }}
    />
  );
}

export function Frame() {
  const grade = use(GradeContext);
  const reduced = useReducedMotion();
  return (
    <>
      <motion.div
        animate={{ opacity: grade?.tone ? 1 : 0 }}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        initial={{ opacity: 0 }}
        style={{
          background:
            "radial-gradient(70% 55% at 22% 38%, rgb(var(--grade) / 0.1), transparent 70%), radial-gradient(60% 50% at 88% 92%, rgb(var(--grade) / 0.06), transparent 70%)",
        }}
        transition={{ duration: GRAMMAR.frame.light, ease: EASE.silk }}
      />
      <RoomGrain />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-20"
        style={{ background: GLASS }}
      />
      <div
        aria-hidden="true"
        className="crt-scan crt-scan-page pointer-events-none fixed inset-0 z-20"
      />
      {reduced ? null : <Glow />}
      <HouseLights />
      <Bars />
    </>
  );
}
