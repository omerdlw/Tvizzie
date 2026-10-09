"use client";

import { motion, useTransform, type MotionValue } from "motion/react";

export function CueMark({
  hold,
  marks,
  out,
}: {
  hold: number;
  marks: readonly number[];
  out: MotionValue<number>;
}) {
  const opacity = useTransform(out, (time) =>
    marks.some((at) => time >= at && time < at + hold) ? 1 : 0,
  );

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed top-[14vh] right-[7vw] z-20 size-[clamp(1.75rem,2.6vw,2.75rem)] rounded-full"
      style={{
        background:
          "radial-gradient(circle at 46% 44%, rgb(255 250 240 / 0.95) 0 38%, rgb(255 240 215 / 0.75) 52%, rgb(40 24 12 / 0.55) 64%, transparent 72%)",
        opacity,
      }}
    />
  );
}
