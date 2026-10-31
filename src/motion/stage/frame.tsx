"use client";

import { createContext, use, useEffect } from "react";
import { motion } from "motion/react";
import { RoomGrain, useHouseDown } from "@/motion/film";
import { GRAMMAR } from "./grammar";
import { EASE } from "./tempo";
import { toneOf } from "./grade";
import { readable } from "@/motion/gl";

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

// A black room keeps only what darkens the image; the frame never lifts #000.
export function Frame({ black, wash }: { black: boolean; wash: boolean }) {
  const grade = use(GradeContext);
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
      <HouseLights />
    </>
  );
}
