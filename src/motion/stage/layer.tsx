"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion, useTransform } from "motion/react";
import { useScrollY } from "@/motion/scroll";

export function Layer({
  children,
  className,
  opacity,
  range,
}: {
  children: ReactNode;
  className?: string;
  opacity: readonly [number, number];
  range: readonly [number, number];
}) {
  const scrollY = useScrollY();
  const reduced = useReducedMotion();
  const dimmed = useTransform(scrollY, [...range], [...opacity]);
  return (
    <motion.div
      className={className}
      style={
        reduced
          ? undefined
          : {
              opacity: dimmed,
              willChange: "opacity",
            }
      }
      suppressHydrationWarning
    >
      {children}
    </motion.div>
  );
}
