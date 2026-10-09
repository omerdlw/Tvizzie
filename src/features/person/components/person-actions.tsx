"use client";

import type { JSX } from "react";
import { cn } from "@omerdlw/base-framework/utils";
import { Button, Icon } from "@/ui";
import { Magnet } from "@/motion/film";
import { SCENE } from "../lib/motion";
import { Rise, trackSpotlight } from "../stage";
import { usePersonView } from "./person-view-state";

const BASE =
  "cine-card cine-fade cine-spot group center relative h-auto w-full cursor-pointer gap-2.5 overflow-hidden rounded-[20px] p-4 text-xs font-bold uppercase ring-1 ring-inset select-none outline-none focus-visible:ring-white/50";
const IDLE =
  "bg-white/5 text-white/70 ring-white/5 hover:bg-white/10 hover:text-white hover:ring-white/10";
const ACTIVE =
  "bg-[rgb(var(--grade)/0.16)] text-[rgb(var(--grade))] ring-[rgb(var(--grade)/0.3)] hover:bg-[rgb(var(--grade)/0.24)] hover:ring-[rgb(var(--grade)/0.4)]";

function Action({
  active,
  from,
  icon,
  label,
  onClick,
  order,
}: {
  active: boolean;
  from: "left" | "right";
  icon: { off: string; on: string };
  label: string;
  onClick: () => void;
  order: number;
}): JSX.Element {
  return (
    <Rise
      at={SCENE.buttons.at + order * SCENE.buttons.gap}
      className="min-w-0 flex-1"
      from={from}
    >
      <Button
        aria-pressed={active}
        className={cn(BASE, active ? ACTIVE : IDLE)}
        onClick={onClick}
        onPointerMove={trackSpotlight}
      >
        <Magnet className="gap-2.5">
          <span
            className={cn(
              "inline-flex shrink-0 transition-[scale] duration-slow ease-out-expo",
              active ? "scale-110" : "group-hover:scale-110",
            )}
          >
            <Icon icon={active ? icon.on : icon.off} size={16} />
          </span>
          <span className="relative">
            <span className={cn(active && "cine-fade group-hover:opacity-0")}>
              {label}
            </span>
            {active ? (
              <span className="cine-fade absolute inset-0 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100">
                Back
              </span>
            ) : null}
          </span>
        </Magnet>
      </Button>
    </Rise>
  );
}

const ICONS = {
  awards: { off: "solar:cup-star-linear", on: "solar:cup-star-bold" },
  timeline: { off: "solar:sort-by-time-linear", on: "solar:sort-by-time-bold" },
};

export function PersonViewActions(): JSX.Element | null {
  const { awards, hasTimeline, toggle, view } = usePersonView();
  if (!hasTimeline && !awards) return null;

  return (
    <div className="flex gap-3">
      {hasTimeline ? (
        <Action
          active={view === "timeline"}
          from="left"
          icon={ICONS.timeline}
          label="Timeline"
          onClick={() => toggle("timeline")}
          order={0}
        />
      ) : null}
      {awards ? (
        <Action
          active={view === "awards"}
          from="right"
          icon={ICONS.awards}
          label="Awards"
          onClick={() => toggle("awards")}
          order={1}
        />
      ) : null}
    </div>
  );
}
