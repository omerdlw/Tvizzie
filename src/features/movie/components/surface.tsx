"use client";

import {
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
  type WheelEvent,
} from "react";
import { cn } from "@omerdlw/base-framework/utils";
import { size } from "../lib/tempo";

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
    <div
      className={cn("w-full", className)}
      data-cinematic
      style={{ "--grade": grade } as CSSProperties}
    >
      {children}
    </div>
  );
}

export const SURFACE_LEAD = size(-1);

const BUTTON =
  "cine-fade center relative inline-flex cursor-pointer items-center justify-center gap-2 rounded-[20px] text-xs font-bold uppercase ring-1 ring-inset select-none outline-none focus-visible:ring-white/50 disabled:pointer-events-none";
const IDLE =
  "bg-white/5 text-white/70 ring-white/5 hover:bg-white/10 hover:text-white hover:ring-white/10";
const LIT =
  "bg-[rgb(var(--grade)/0.16)] text-[rgb(var(--grade))] ring-[rgb(var(--grade)/0.3)] hover:bg-[rgb(var(--grade)/0.24)] hover:ring-[rgb(var(--grade)/0.4)]";

export const surfaceButton = (lit: boolean) =>
  `${BUTTON} h-11 ${lit ? LIT : IDLE}`;

export const surfaceIconButton = (lit: boolean) =>
  `${BUTTON} size-10 shrink-0 p-0 ${lit ? LIT : IDLE}`;

export const surfaceRow = (lit: boolean) =>
  `cine-fade group relative flex w-full cursor-pointer items-center gap-3 rounded-[20px] p-2 text-left ring-1 ring-inset select-none outline-none focus-visible:ring-white/50 disabled:cursor-wait ${lit ? LIT : IDLE}`;

export const SURFACE_CHECK_ON =
  "bg-[rgb(var(--grade))] text-black ring-[rgb(var(--grade))]";

export const SURFACE_FIELD =
  "cine-fade rounded-[20px] bg-white/5 text-white ring-1 ring-white/5 ring-inset outline-none placeholder:text-white/50 hover:bg-white/10 focus:bg-white/10 focus:ring-white/20";

export function scrollWithin(event: WheelEvent<HTMLDivElement>) {
  const box = event.currentTarget;
  if (box.scrollHeight <= box.clientHeight) return;
  event.preventDefault();
  event.stopPropagation();
  const max = box.scrollHeight - box.clientHeight;
  box.scrollTop = Math.min(max, Math.max(0, box.scrollTop + event.deltaY));
}
