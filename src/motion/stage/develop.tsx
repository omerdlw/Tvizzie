"use client";

import { useContext, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@omerdlw/base-framework/utils";
import { ARRIVE, EASE, PHI } from "./tempo";
import { ClockContext, useClockStart } from "./clock";
import { bezier, play } from "./play";

const POUR = bezier(EASE.pour);

export function Develop({
  at = 0,
  children,
  className,
  radius,
  run = ARRIVE.run,
  zoom = 1.12,
}: {
  at?: number;
  children: ReactNode;
  className?: string;
  radius?: number | string;
  run?: number;
  zoom?: number;
}) {
  const reduced = useReducedMotion();
  const gate = useRef<HTMLDivElement>(null);
  const hold = useRef<HTMLDivElement>(null);
  const clock = useContext(ClockContext);
  const [closed] = useState(() => clock !== null);

  useClockStart((time) => {
    const door = gate.current;
    const picture = hold.current;
    if (!door || !picture) return;
    const open = () => {
      door.style.removeProperty("translate");
      picture.style.removeProperty("translate");
      picture.style.removeProperty("scale");
    };
    const wait = at - time;
    if (reduced || wait + run * PHI <= 0) {
      open();
      return;
    }
    const timing = { easing: POUR, run, wait };
    return [
      play(door, { translate: ["0 100%", "0 0"] }, timing, () =>
        door.style.removeProperty("translate"),
      ),
      play(picture, { translate: ["0 -100%", "0 0"] }, timing, () =>
        picture.style.removeProperty("translate"),
      ),
      play(
        picture,
        { scale: [String(zoom), "1"] },
        { ...timing, run: run * PHI },
        () => picture.style.removeProperty("scale"),
      ),
    ];
  });

  const round = radius === undefined ? undefined : { borderRadius: radius };
  return (
    <div className={cn("overflow-hidden", className)} style={round}>
      <div
        className="h-full overflow-hidden"
        ref={gate}
        style={closed ? { ...round, translate: "0 100%" } : round}
      >
        <div
          className="h-full"
          ref={hold}
          style={closed ? { scale: String(zoom), translate: "0 -100%" } : {}}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
