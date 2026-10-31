"use client";

import { createContext, use, useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { Dust, RoomGrain, useHouseDown } from "@/motion/film";
import { GRAMMAR } from "./grammar";
import { EASE } from "./tempo";
import { toneOf } from "./grade";
import { readable } from "@/motion/gl";
import { useHydratedReducedMotion } from "@/motion/reduced";

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

let lastPointer: { x: number; y: number } | null = null;

const GLOW_DRIFT = { damping: 19, mass: 1, stiffness: 36 };

function Glow() {
  const radius = 380;
  const [start] = useState(() => lastPointer);
  const x = useMotionValue(start ? start.x - radius : 0);
  const y = useMotionValue(start ? start.y - radius : 0);
  const near = useMotionValue(start ? 1 : 0);
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

const SHEEN =
  "radial-gradient(60% 45% at 16% 0%, rgb(255 255 255 / 0.018), transparent 70%)";
const GLASS = [
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

// A black room keeps only what darkens (the glass's falloff, the scan
// lines, the house lights): nothing of the frame's own lifts #000.
export function Frame({ black, wash }: { black: boolean; wash: boolean }) {
  const grade = use(GradeContext);
  const reduced = useHydratedReducedMotion();
  return (
    <>
      <motion.div
        animate={{ opacity: wash && grade?.tone ? 1 : 0 }}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        initial={{ opacity: 0 }}
        style={{
          background:
            "radial-gradient(70% 55% at 22% 38%, rgb(var(--grade) / 0.1), transparent 70%), radial-gradient(60% 50% at 88% 92%, rgb(var(--grade) / 0.06), transparent 70%)",
        }}
        transition={{ duration: GRAMMAR.frame.light, ease: EASE.silk }}
      />
      {black ? null : <RoomGrain />}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-20"
        style={{ background: black ? GLASS : `${SHEEN}, ${GLASS}` }}
      />
      <div
        aria-hidden="true"
        className="crt-scan crt-scan-page pointer-events-none fixed inset-0 z-20"
      />
      {reduced || black ? null : <Glow />}
      <HouseLights />
    </>
  );
}
