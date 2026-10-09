"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { useLeaving, useReveal, useScore } from "@/motion";
import { EASE, blur } from "@/motion/cinema/score";
import { SCENE } from "../lib/motion";

export function AvatarStage({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  label: string;
}) {
  const score = useScore();
  const leaving = useLeaving();
  const { delay, ref, shown } = useReveal<HTMLDivElement>({
    intro: score.poster.delay,
  });
  const { duration, shine, zoom } = score.poster;
  const { exit } = score;

  return (
    <motion.div
      animate={
        leaving
          ? { filter: blur(8), opacity: 0, scale: 0.85 }
          : shown
            ? { filter: blur(0), opacity: 1, scale: 1 }
            : undefined
      }
      aria-label={label}
      className={className}
      initial={{
        filter: blur(14),
        opacity: 0,
        scale: SCENE.avatar.from,
      }}
      ref={ref}
      role="img"
      transition={
        leaving
          ? {
              delay: exit.poster.delay,
              duration: exit.poster.duration,
              ease: EASE.glide,
            }
          : {
              filter: { delay, duration, ease: EASE.silk },
              opacity: { delay, duration, ease: EASE.silk },
              scale: { delay, duration: zoom, ease: EASE.expo },
            }
      }
    >
      {children}
      <motion.div
        animate={
          shown ? { opacity: [0, 1, 0], x: ["-140%", "140%"] } : undefined
        }
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 -inset-x-1/3 skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/25 to-transparent"
        initial={{ opacity: 0, x: "-140%" }}
        transition={{
          delay: delay + (shine - score.poster.delay),
          duration: 1.9,
          ease: EASE.glide,
        }}
      />
    </motion.div>
  );
}
