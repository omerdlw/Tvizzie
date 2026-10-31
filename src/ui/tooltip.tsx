"use client";

import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { useTheme } from "@omerdlw/base-framework/theme";
import { primitivesTheme } from "./theme";

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

interface TooltipProps {
  children: ReactNode;
  "data-cursor-owned"?: string;
  position?: "top" | "right" | "bottom" | "left";
  text: ReactNode;
}

export function Tooltip({
  children,
  position = "top",
  text,
  ...props
}: TooltipProps) {
  const theme = useTheme(primitivesTheme);
  const trigger = useRef<HTMLButtonElement>(null);
  const [inModule, setInModule] = useState(false);
  const owned = "data-cursor-owned" in props;

  return (
    <TooltipPrimitive.Root
      onOpenChange={(open) => {
        if (open && owned) {
          setInModule(Boolean(trigger.current?.closest(".ui-motion")));
        }
      }}
    >
      <TooltipPrimitive.Trigger asChild ref={trigger}>
        {children}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={position}
          align="center"
          sideOffset={10}
          collisionPadding={8}
          className={theme.slots.tooltip}
          style={theme.styles.tooltip as CSSProperties}
          data-cursor-owned={owned && !inModule ? "" : undefined}
        >
          <Ink text={text} />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
