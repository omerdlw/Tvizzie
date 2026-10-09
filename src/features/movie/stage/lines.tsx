"use client";

import { motion, useTransform } from "motion/react";
import { cn } from "@omerdlw/base-framework/utils";
import { SCENE, sinceBase } from "../lib/motion";
import { size } from "../lib/tempo";
import { useExit, useProgress } from "./clock";

export function Hairline({ className }: { className?: string }) {
  const { rule } = SCENE;
  const entered = useProgress(sinceBase(rule.at), rule.run);
  const left = useExit(0);
  const scaleX = useTransform(
    [entered, left],
    ([a, b]: number[]) => a * (1 - b),
  );
  return (
    <motion.div
      aria-hidden="true"
      className={cn("h-px w-full origin-left bg-white/25", className)}
      style={{ opacity: scaleX, scaleX }}
    />
  );
}

export function Line({
  at,
  className,
  out,
}: {
  at: number;
  className?: string;
  out?: number;
}) {
  const entered = useProgress(sinceBase(at), size(3));
  const left = useExit(out ?? 1e6);
  const scaleX = useTransform(
    [entered, left],
    ([a, b]: number[]) => a * (1 - b),
  );
  return (
    <motion.span
      aria-hidden="true"
      className={cn("block h-px origin-left bg-white/10", className)}
      style={{ opacity: scaleX, scaleX }}
    />
  );
}
