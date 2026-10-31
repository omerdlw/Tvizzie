"use client";

import type { ReactNode } from "react";
import { BouncingDots } from "loading-dev";
import { useTheme } from "@omerdlw/base-framework/theme";
import { cn } from "@omerdlw/base-framework/utils";
import { primitivesTheme } from "./theme";

export function Loader({
  children,
  className,
  color,
  size = 14,
}: {
  children?: ReactNode;
  className?: string;
  color?: string;
  size?: number;
}) {
  const theme = useTheme(primitivesTheme);
  const dots = <BouncingDots size={size} color={color} />;

  if (children) {
    return (
      <span
        className={cn(theme.slots.loader, theme.slots.stack, className)}
        role="status"
        aria-label="Loading"
      >
        <span className={theme.slots.stackBase}>{children}</span>
        <span className={theme.slots.stackTop}>{dots}</span>
      </span>
    );
  }

  return (
    <span
      className={cn(theme.slots.loader, theme.slots.loaderInline, className)}
      style={theme.styles.loaderInline}
      role="status"
      aria-label="Loading"
    >
      {dots}
    </span>
  );
}
