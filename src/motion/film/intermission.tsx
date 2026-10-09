"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Z_INDEX } from "@omerdlw/base-framework/tokens";
import { houseIsDown } from "./house";

const WAKE = [
  "pointermove",
  "pointerdown",
  "keydown",
  "wheel",
  "touchstart",
  "scroll",
] as const;

const dialogOpen = () =>
  Boolean(document.querySelector("[role='dialog'], [aria-modal='true']")) ||
  getComputedStyle(document.body).overflowY === "hidden" ||
  getComputedStyle(document.documentElement).overflowY === "hidden";

export function Intermission({
  after,
  drift,
  ease,
  enter,
  image,
  label = "Intermission",
  leave,
  paused,
  title,
}: {
  after: number;
  drift: number;
  ease: readonly number[];
  enter: number;
  image: string | null;
  label?: string;
  leave: number;
  paused: boolean;
  title: string;
}) {
  const [resting, setResting] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (paused) return;
    let timer: ReturnType<typeof setTimeout>;
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (document.hidden || houseIsDown() || dialogOpen()) return arm();
        setResting(true);
      }, after * 1000);
    };
    const wake = () => {
      setResting(false);
      arm();
    };
    arm();
    WAKE.forEach((name) =>
      window.addEventListener(name, wake, { capture: true, passive: true }),
    );
    return () => {
      clearTimeout(timer);
      WAKE.forEach((name) =>
        window.removeEventListener(name, wake, { capture: true }),
      );
    };
  }, [after, paused]);

  const shown = resting && !paused && Boolean(image);
  const curve = [ease[0], ease[1], ease[2], ease[3]] as [
    number,
    number,
    number,
    number,
  ];

  return (
    <AnimatePresence>
      {shown ? (
        <motion.div
          animate={{ opacity: 1, transition: { duration: enter, ease: curve } }}
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 overflow-hidden bg-black"
          exit={{ opacity: 0, transition: { duration: leave, ease: curve } }}
          initial={{ opacity: 0 }}
          style={{ zIndex: Z_INDEX.DOCK + 5 }}
        >
          <div
            className={
              reduced ? "absolute inset-0" : "film-drift absolute inset-0"
            }
            style={{
              animationDuration: `${drift}s`,
              backgroundImage: `url(${image})`,
              backgroundPosition: "center 30%",
              backgroundSize: "cover",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 120% 100% at 50% 45%, transparent 40%, rgb(0 0 0 / 0.7)), linear-gradient(to top, rgb(0 0 0 / 0.75), transparent 45%)",
            }}
          />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-6 p-8 sm:p-12">
            <div className="flex min-w-0 flex-col gap-3">
              <span className="text-[10px] font-semibold tracking-[0.32em] text-white/50 uppercase">
                {label}
              </span>
              <span className="font-zuume text-6xl leading-none font-bold text-white uppercase sm:text-8xl">
                {title}
              </span>
            </div>
            <span className="hidden shrink-0 text-[10px] font-semibold tracking-[0.32em] text-white/40 uppercase sm:block">
              Move to resume
            </span>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
