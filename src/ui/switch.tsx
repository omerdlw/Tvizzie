"use client";

import type { ButtonHTMLAttributes, Ref } from "react";
import { useTheme } from "@omerdlw/base-framework/theme";
import { cn } from "@omerdlw/base-framework/utils";
import { primitivesTheme } from "./theme";

interface SwitchProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onChange"
> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  ref?: Ref<HTMLButtonElement>;
}

export function Switch({
  checked = false,
  className,
  disabled = false,
  onCheckedChange,
  onClick,
  ref,
  type = "button",
  ...props
}: SwitchProps) {
  const theme = useTheme(primitivesTheme);
  const state = checked ? "checked" : "unchecked";

  return (
    <button
      ref={ref}
      type={type}
      role="switch"
      aria-checked={checked}
      data-state={state}
      disabled={disabled}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented && !disabled) onCheckedChange?.(!checked);
      }}
      className={cn(theme.slots.switch, className)}
      {...props}
    >
      <span data-state={state} className={theme.slots.switchThumb} />
    </button>
  );
}
