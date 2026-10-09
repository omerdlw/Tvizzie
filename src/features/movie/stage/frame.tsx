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
import {
  CueMark,
  Dust,
  RoomGrain,
  isCarriedTo,
  useCarryingFrom,
  useHouseDown,
} from "@/motion/film";
import { usePathname } from "next/navigation";
import { handoffTo, useDeparture } from "@/motion/handoff";
import { SCENE } from "../lib/motion";
import { EASE } from "../lib/tempo";
import { ExitContext, HeadContext, skipped, useExit } from "./clock";
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
    image.src = source;
    return () => {
      live = false;
      image.onload = null;
    };
  }, [set, source]);

  return null;
}

function Bars() {
  const reduced = useReducedMotion();
  const pathname = usePathname();
  const { at, height, run, shut } = SCENE.frame.bars;
  const left = useExit(SCENE.exit.backdrop);
  const open = useMotionValue(reduced ? 1 : 0);
  const head = useContext(HeadContext);
  const [veiled] = useState(
    () => handoffTo(pathname) !== null && !isCarriedTo(pathname),
  );
  const departing = useDeparture(pathname) !== undefined;
  const carrying = useCarryingFrom(pathname);
  const rest = height / shut;
  const begin = veiled ? 1 : rest;
  const end = departing && !carrying ? 1 : rest;
  const closed = useTransform([open, left], ([o, l]: number[]) =>
    Math.max(begin * (1 - o), end * l),
  );

  useEffect(() => {
    if (reduced) return;
    const controls = animate(open, 1, {
      ...skipped(at, run, head),
      ease: EASE.glide,
    });
    return () => controls.stop();
  }, [at, head, open, reduced, run]);

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

function Glow() {
  const radius = 380;
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const near = useMotionValue(0);
  const sx = useSpring(x, { damping: 26, mass: 0.9, stiffness: 70 });
  const sy = useSpring(y, { damping: 26, mass: 0.9, stiffness: 70 });
  const house = useHouseDown();
  const lights = useMotionValue(1);
  const opacity = useSpring(near, { damping: 24, stiffness: 40 });
  const shown = useTransform(
    [opacity, lights],
    ([value, on]: number[]) => value * on,
  );
  useEffect(() => lights.set(house ? 0 : 1), [house, lights]);

  useEffect(() => {
    let placed = false;
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      x.set(event.clientX - radius);
      y.set(event.clientY - radius);
      if (!placed) {
        placed = true;
        sx.jump(event.clientX - radius);
        sy.jump(event.clientY - radius);
      }
      near.set(1);
    };
    const leave = () => near.set(0);
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("mouseleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("mouseleave", leave);
    };
  }, [near, sx, sy, x, y]);

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

function HouseLights() {
  const down = useHouseDown();
  const { level, run } = SCENE.film.house;
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
  const out = useContext(ExitContext);
  const { cue } = SCENE.film;

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
        transition={{ duration: SCENE.frame.light, ease: EASE.silk }}
      />
      <RoomGrain />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-20"
        style={{
          background:
            "radial-gradient(ellipse 125% 105% at 50% 45%, transparent 58%, rgb(0 0 0 / 0.42))",
        }}
      />
      {reduced ? null : <Glow />}
      <HouseLights />
      <Bars />
      {out && !reduced ? (
        <CueMark hold={cue.hold} marks={cue.marks} out={out} />
      ) : null}
    </>
  );
}
