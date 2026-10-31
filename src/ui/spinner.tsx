"use client";

import { useTheme } from "@omerdlw/base-framework/theme";
import { cn } from "@omerdlw/base-framework/utils";
import { Icon } from "./icon";
import { primitivesTheme } from "./theme";

export function Spinner({
  className,
  size = 15,
}: {
  className?: string;
  size?: number;
}) {
  const theme = useTheme(primitivesTheme);
  return (
    <div
      className={cn(theme.slots.spinner, className)}
      aria-label="Loading"
      role="status"
    >
      <Icon icon="mingcute:loading-3-fill" size={size} />
    </div>
  );
}
