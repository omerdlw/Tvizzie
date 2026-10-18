"use client";

import type { CSSProperties, ReactNode } from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { useTheme } from "@omerdlw/base-framework/theme";
import { cn } from "@omerdlw/base-framework/utils";
import { primitivesTheme } from "./theme";
import { resolveSlotClasses } from "./utils";
import { TooltipProps } from "./types";

// A tooltip is lit by the film it belongs to: its rule takes the scene's grade,
// read from the page when it opens, since it is portalled out of the scene.
function gradeOf(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const scene = document.querySelector<HTMLElement>("main[data-cinematic]");
  const grade = scene
    ? getComputedStyle(scene).getPropertyValue("--grade").trim()
    : "";
  return grade || undefined;
}

// A title with its year (and a role after it) is set as a slate: the name,
// and the year and role in small figures after a hairline.
const SLATE = /^(.*\S)\s+\((\d{4})\)(?:,\s*(.+))?$/;

function Ink({ text }: { text: ReactNode }) {
  const slate = typeof text === "string" ? SLATE.exec(text) : null;
  return (
    <span className="tooltip-ink">
      {slate ? (
        <>
          {slate[1]}
          <span className="tooltip-meta">
            {slate[3] ? `${slate[2]} · ${slate[3]}` : slate[2]}
          </span>
        </>
      ) : (
        text
      )}
    </span>
  );
}

function Tooltip({
  ref,
  children,
  className,
  classNames = {},
  collisionPadding = 8,
  defaultOpen,
  delayMs,
  onOpenChange,
  open,
  position = "top",
  sideOffset = 10,
  text,
  ...props
}: TooltipProps) {
  const theme = useTheme(primitivesTheme);
  const classes = resolveSlotClasses(className, classNames);

  return (
    <TooltipPrimitive.Root
      defaultOpen={defaultOpen}
      delayDuration={delayMs}
      onOpenChange={onOpenChange}
      open={open}
    >
      <TooltipPrimitive.Trigger asChild className={cn(classes.trigger)}>
        {children}
      </TooltipPrimitive.Trigger>

      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          ref={ref}
          side={position}
          align="center"
          sideOffset={sideOffset}
          collisionPadding={collisionPadding}
          className={cn(theme.slots.tooltip, classes.content, classes.root)}
          style={
            { ...theme.styles.tooltip, "--grade": gradeOf() } as CSSProperties
          }
          {...props}
        >
          <Ink text={text} />
          {classes.arrow && (
            <TooltipPrimitive.Arrow className={classes.arrow} />
          )}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

Tooltip.displayName = "Tooltip";
export { Tooltip };
