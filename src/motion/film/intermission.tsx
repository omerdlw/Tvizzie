"use client";

import { useEffect, useState, type CSSProperties } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type TargetAndTransition,
} from "motion/react";
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

// The interval is shown on a set: lines on its glass, its face falling away
// towards the rim. Woken, the set is switched off: the picture is pressed
// into one bright line, the line runs in to a point and the point goes out,
// and the page is there behind it.
const BEAM = "rgb(255 250 242)";
const TUBE_FACE =
  "inset 0 0 18vmin 3vmin rgb(0 0 0 / 0.55), inset 0 0 3vmin 0.5vmin rgb(0 0 0 / 0.4)";
const LINE = 0.003;

type Bezier = [number, number, number, number];

function switchOff(run: number): {
  beam: TargetAndTransition;
  set: TargetAndTransition;
} {
  const pressed = 0.32;
  const point = 0.62;
  return {
    beam: {
      opacity: [0, 1, 1, 1],
      transition: { duration: run, times: [0, pressed * 0.8, point, 1] },
    },
    set: {
      opacity: [1, 1, 1, 0],
      scaleX: [1, 1, 0.004, 0.003],
      scaleY: [1, LINE, LINE, LINE],
      transition: {
        duration: run,
        ease: [
          [0.55, 0, 1, 0.45],
          [0.06, 0.62, 0.2, 1],
          [0.4, 0, 0.6, 1],
        ] as Bezier[],
        times: [0, pressed, point, 1],
      },
    },
  };
}

// Someone still down the page is reading, not resting: the interval is only
// called while the picture itself is in view.
const readingBelow = () => window.scrollY > window.innerHeight * 0.5;

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
  const [loaded, setLoaded] = useState<string | null>(null);
  const reduced = useReducedMotion();

  // The curtain only ever shows a picture that is already here.
  useEffect(() => {
    if (!image) return;
    let live = true;
    const picture = new Image();
    picture.crossOrigin = "anonymous";
    picture.decoding = "async";
    picture.onload = () => {
      if (live) setLoaded(image);
    };
    picture.src = image;
    return () => {
      live = false;
      picture.onload = null;
    };
  }, [image]);

  useEffect(() => {
    if (paused) return;
    let timer: ReturnType<typeof setTimeout>;
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (
          document.hidden ||
          houseIsDown() ||
          dialogOpen() ||
          readingBelow()
        ) {
          return arm();
        }
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

  const shown = resting && !paused && image !== null && loaded === image;
  const curve = [ease[0], ease[1], ease[2], ease[3]] as [
    number,
    number,
    number,
    number,
  ];
  const off = reduced
    ? { beam: undefined, set: { opacity: 0, transition: { duration: 0 } } }
    : switchOff(leave);

  return (
    <AnimatePresence>
      {shown ? (
        <motion.div
          animate={{
            opacity: 1,
            scaleX: 1,
            scaleY: 1,
            transition: { duration: enter, ease: curve },
          }}
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 overflow-hidden bg-black"
          exit={off.set}
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
          <div
            className="crt-scan absolute inset-0"
            style={{ "--scan-depth": 0.1 } as CSSProperties}
          />
          <div className="absolute inset-0" style={{ boxShadow: TUBE_FACE }} />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-6 p-8 sm:p-12">
            <div className="flex min-w-0 flex-col gap-3">
              <span className="crt-glow text-[10px] font-semibold tracking-[0.32em] text-white/50 uppercase">
                {label}
              </span>
              <span className="font-zuume text-6xl leading-none font-bold text-white uppercase sm:text-8xl">
                {title}
              </span>
            </div>
            <span className="crt-glow hidden shrink-0 text-[10px] font-semibold tracking-[0.32em] text-white/40 uppercase sm:block">
              Move to resume
            </span>
          </div>
          <motion.div
            className="absolute inset-0"
            exit={off.beam}
            initial={{ opacity: 0 }}
            style={{ background: BEAM }}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
