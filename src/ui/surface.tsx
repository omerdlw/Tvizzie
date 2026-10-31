"use client";

import type { WheelEvent } from "react";

const BUTTON =
  "center relative inline-flex cursor-pointer items-center justify-center gap-2 rounded-[16px] text-[13px] font-medium ring-1 ring-inset select-none outline-none focus-visible:ring-white/[0.16] disabled:pointer-events-none";
const IDLE =
  "bg-white/[0.06] text-white/75 ring-white/[0.04] hover:bg-white/10 hover:text-white hover:ring-white/[0.08]";
const LIT =
  "bg-[rgb(var(--grade)/0.16)] text-[rgb(var(--grade))] ring-[rgb(var(--grade)/0.3)] hover:bg-[rgb(var(--grade)/0.24)] hover:ring-[rgb(var(--grade)/0.4)]";
const ROW_IDLE =
  "bg-white/[0.06] text-white/75 ring-white/[0.04] hover:text-white hover:ring-white/[0.08]";
const ROW_LIT =
  "bg-[rgb(var(--grade)/0.16)] text-[rgb(var(--grade))] ring-[rgb(var(--grade)/0.3)] hover:ring-[rgb(var(--grade)/0.4)]";

export const surfaceButton = (lit: boolean) =>
  `${BUTTON} h-10 ${lit ? LIT : IDLE}`;

export const surfaceIconButton = (lit: boolean) =>
  `${BUTTON} size-10 shrink-0 p-0 ${lit ? LIT : IDLE}`;

export const SURFACE_STACK = "flex w-full flex-col gap-2.5";

const TILE_SHAPE =
  "flex min-w-0 items-center gap-3 rounded-[16px] p-1.5 ring-1 ring-inset";
export const SURFACE_TILE = `${TILE_SHAPE} bg-white/[0.06] ring-white/[0.04]`;
export const SURFACE_TILE_HOVER = "hover:bg-white/10 hover:ring-white/[0.08]";
export const SURFACE_TILE_INNER = "rounded-[10px]";
export const SURFACE_TILE_END = "pr-3.5";

export const SURFACE_POSTER = "h-[60px] w-10 shrink-0 overflow-hidden";

export const SURFACE_TEXT =
  "flex min-w-0 flex-1 flex-col justify-center gap-1 text-left";
export const SURFACE_TITLE =
  "truncate text-sm leading-tight font-semibold text-white";
export const SURFACE_META = "truncate text-xs leading-tight text-white/50";

export const surfaceRow = (lit: boolean) =>
  `group relative isolate w-full cursor-pointer ${TILE_SHAPE} ${SURFACE_TILE_END} select-none outline-none focus-visible:ring-white/[0.16] disabled:cursor-wait ${lit ? ROW_LIT : ROW_IDLE}`;

export const SURFACE_PANEL =
  "rounded-[16px] bg-white/[0.06] ring-1 ring-white/[0.04] ring-inset";

export const SURFACE_CHECK_ON =
  "bg-[rgb(var(--grade))] text-black ring-[rgb(var(--grade))]";

export const SURFACE_FIELD =
  "rounded-[16px] bg-white/[0.06] text-white ring-1 ring-white/[0.04] ring-inset outline-none placeholder:text-white/40 hover:bg-white/10 focus:bg-white/10 focus:ring-white/[0.12]";

export const SURFACE_SCROLL =
  "overflow-y-auto overscroll-contain rounded-[16px] [clip-path:inset(0_round_16px)] scrollbar-none";

export function scrollWithin(event: WheelEvent<HTMLElement>) {
  const box = event.currentTarget;
  if (box.scrollHeight <= box.clientHeight) return;
  event.preventDefault();
  event.stopPropagation();
  const max = box.scrollHeight - box.clientHeight;
  box.scrollTop = Math.min(max, Math.max(0, box.scrollTop + event.deltaY));
}

export function SurfaceProse({ text }: { text: string }) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  return (
    <div
      className={`${SURFACE_PANEL} ${SURFACE_SCROLL} max-h-[min(52dvh,24rem)] p-4`}
      data-lenis-prevent
      data-lenis-prevent-wheel
      onWheel={scrollWithin}
    >
      <div className="flex flex-col gap-3 text-sm leading-6 text-pretty [overflow-wrap:anywhere] text-white/75 select-text">
        {paragraphs.map((paragraph, index) => (
          <p className="whitespace-pre-line" key={index}>
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
}
