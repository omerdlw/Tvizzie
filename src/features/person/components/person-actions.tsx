"use client";

import type { JSX } from "react";
import { StageAction } from "@/motion/stage";
import { usePersonView } from "./person-view-state";

function Action({
  active,
  ...props
}: {
  active: boolean;
  icon: { off: string; on: string };
  label: string;
  onClick: () => void;
}): JSX.Element {
  return (
    <StageAction
      {...props}
      active={active}
      className="h-auto p-4"
      grow
      hoverLabel={active ? "Back" : undefined}
    />
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
          icon={ICONS.timeline}
          label="Timeline"
          onClick={() => toggle("timeline")}
        />
      ) : null}
      {awards ? (
        <Action
          active={view === "awards"}
          icon={ICONS.awards}
          label="Awards"
          onClick={() => toggle("awards")}
        />
      ) : null}
    </div>
  );
}
