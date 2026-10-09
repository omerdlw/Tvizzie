"use client";

import { motion, useMotionTemplate, type MotionValue } from "motion/react";

export function Foil({
  glow,
  x,
  y,
}: {
  glow: MotionValue<number>;
  x: MotionValue<number>;
  y: MotionValue<number>;
}) {
  const position = useMotionTemplate`${x}% ${y}%`;
  return (
    <>
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] mix-blend-color-dodge"
        style={{
          backgroundImage:
            "linear-gradient(115deg, transparent 28%, rgb(255 205 120 / 0.28) 42%, rgb(255 244 214 / 0.5) 50%, rgb(214 158 68 / 0.3) 58%, transparent 72%)",
          backgroundPosition: position,
          backgroundSize: "260% 260%",
          opacity: glow,
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-[rgb(226_184_104/0.4)] ring-inset"
      />
    </>
  );
}
