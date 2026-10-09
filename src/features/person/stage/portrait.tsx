"use client";

import { useEffect, useRef, type PointerEvent, type ReactNode } from "react";
import {
  animate,
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { cn } from "@omerdlw/base-framework/utils";
import { useLanding } from "@/motion/film";
import { SCENE, sinceBase } from "../lib/motion";
import { EASE, size } from "../lib/tempo";
import { ease, useExit, useProgress } from "./clock";

export function Portrait({
  children,
  className,
  light,
  target,
}: {
  children: ReactNode;
  className?: string;
  light?: (light: {
    glow: MotionValue<number>;
    x: MotionValue<number>;
    y: MotionValue<number>;
  }) => ReactNode;
  target?: Record<string, string>;
}) {
  const { exit, portrait } = SCENE;
  const start = sinceBase(portrait.at);
  const unveiled = useProgress(start, portrait.run, ease.silk);
  const settled = useProgress(start, portrait.run);
  const sweep = useProgress(
    sinceBase(portrait.shine.at),
    portrait.shine.run,
    ease.glide,
  );
  const folded = useExit(exit.portrait);
  const frame = useRef<HTMLDivElement>(null);
  const { carried, shown } = useLanding(frame, {
    reveal: SCENE.film.carry.reveal,
  });
  const landing = useRef(carried);
  useEffect(() => {
    landing.current = carried;
  }, [carried]);
  const opened = useTransform(unveiled, (p) => (landing.current ? 1 : p));
  const rested = useTransform(settled, (p) => (landing.current ? 1 : p));
  const clipPath = useTransform([opened, folded], ([a, b]: number[]) =>
    a >= 1 && b <= 0
      ? "none"
      : `inset(${((1 - a) * 100).toFixed(2)}% 0% ${(b * 100).toFixed(2)}% 0% round 20px)`,
  );
  const zoom = useTransform(
    [rested, folded],
    ([a, b]: number[]) => 1 + (1 - a) * 0.35 + b * 0.14,
  );
  const shineX = useTransform(sweep, (p) => `${-140 + 280 * p}%`);
  const shineOpacity = useTransform(sweep, (p) =>
    p >= 1 ? 0 : Math.sin(Math.PI * p),
  );

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const glow = useMotionValue(0);
  const spring = { damping: 18, mass: 0.8, stiffness: 90 };
  const sx = useSpring(x, spring);
  const sy = useSpring(y, spring);
  const rotateY = useTransform(sx, [-0.5, 0.5], [-9, 9]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [9, -9]);
  const gx = useTransform(sx, [-0.5, 0.5], [0, 100]);
  const gy = useTransform(sy, [-0.5, 0.5], [0, 100]);
  const glare = useMotionTemplate`radial-gradient(560px circle at ${gx}% ${gy}%, rgb(var(--white-rgb) / 0.18), transparent 55%)`;

  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    const box = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - box.left) / box.width - 0.5);
    y.set((event.clientY - box.top) / box.height - 0.5);
  };
  const onEnter = () =>
    animate(glow, 1, { duration: size(1), ease: EASE.expo });
  const onLeave = () => {
    x.set(0);
    y.set(0);
    animate(glow, 0, { duration: size(2), ease: EASE.expo });
  };

  return (
    <div
      className={cn("[perspective:1400px]", className)}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onPointerMove={onMove}
    >
      <motion.div
        {...target}
        className="relative aspect-[2/3] w-full overflow-hidden rounded-[20px]"
        data-carry-slot=""
        ref={frame}
        style={{ clipPath, opacity: shown ? 1 : 0, rotateX, rotateY }}
      >
        <motion.div className="absolute inset-0" style={{ scale: zoom }}>
          {children}
        </motion.div>
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 -inset-x-1/3 skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/25 to-transparent"
          style={{ opacity: shineOpacity, x: shineX }}
        />
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{ background: glare, opacity: glow }}
        />
        {light?.({ glow, x: gx, y: gy })}
      </motion.div>
    </div>
  );
}
