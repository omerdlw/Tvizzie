"use client";

import {
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@omerdlw/base-framework/utils";
import { size } from "./tempo";
import { ArrivalContext, IN_DOCK } from "./wave";

export const SURFACE_LEAD = size(-2);

const WHITE = "252 252 251";

function readGrade(): string {
  const scene = document.querySelector<HTMLElement>("main[data-cinematic]");
  const grade = scene
    ? getComputedStyle(scene).getPropertyValue("--grade").trim()
    : "";
  return grade || WHITE;
}

const noChange = () => () => {};

export function SurfaceScene({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const grade = useSyncExternalStore(noChange, readGrade, () => WHITE);
  return (
    <ArrivalContext value={IN_DOCK}>
      <div
        className={cn("w-full", className)}
        data-cinematic
        style={{ "--grade": grade } as CSSProperties}
      >
        {children}
      </div>
    </ArrivalContext>
  );
}
