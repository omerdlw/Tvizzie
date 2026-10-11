"use client";

import type { JSX } from "react";
import { motion } from "motion/react";

// The only thing beside the word: a quiet line that says there is more below.
export function ScrollCue(): JSX.Element {
  return (
    <motion.div
      animate={{ opacity: 1 }}
      aria-hidden
      className="absolute left-1/2 flex -translate-x-1/2 flex-col items-center gap-3"
      initial={{ opacity: 0 }}
      style={{
        top: "calc(100% - var(--word-bottom, 30svh) + clamp(1.75rem, 5svh, 3.5rem))",
      }}
      transition={{ delay: 1.8, duration: 1.6, ease: [0.33, 1, 0.68, 1] }}
    >
      <span className="font-mono text-[10px] tracking-[0.32em] text-white/55 uppercase sm:text-[11px]">
        Scroll
      </span>
      <span className="relative block h-10 w-px overflow-hidden bg-white/12">
        <span className="absolute inset-x-0 top-0 h-2/5 animate-[scroll-cue_2.8s_cubic-bezier(0.65,0,0.35,1)_infinite] bg-white/80" />
      </span>
    </motion.div>
  );
}
