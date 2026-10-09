"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
import { cn } from "@omerdlw/base-framework/utils";

export function Magnet({
  children,
  className,
  reach = 4,
}: {
  children: ReactNode;
  className?: string;
  reach?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const spring = { damping: 16, mass: 0.6, stiffness: 180 };
  const sx = useSpring(x, spring);
  const sy = useSpring(y, spring);

  useEffect(() => {
    const own = ref.current;
    const host =
      own?.parentElement?.closest<HTMLElement>("button, a") ??
      own?.parentElement;
    if (!host) return;
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const box = host.getBoundingClientRect();
      const nx = ((event.clientX - box.left) / box.width - 0.5) * 2;
      const ny = ((event.clientY - box.top) / box.height - 0.5) * 2;
      x.set(nx * reach);
      y.set(ny * reach * 0.6);
    };
    const leave = () => {
      x.set(0);
      y.set(0);
    };
    host.addEventListener("pointermove", move);
    host.addEventListener("pointerleave", leave);
    return () => {
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerleave", leave);
    };
  }, [reach, x, y]);

  return (
    <motion.span
      className={cn("inline-flex items-center", className)}
      ref={ref}
      style={{ x: sx, y: sy }}
    >
      {children}
    </motion.span>
  );
}
