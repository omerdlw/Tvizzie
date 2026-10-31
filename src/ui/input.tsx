"use client";

import type { InputHTMLAttributes, Ref } from "react";
import { useTheme } from "@omerdlw/base-framework/theme";
import { cn } from "@omerdlw/base-framework/utils";
import { primitivesTheme } from "./theme";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  ref?: Ref<HTMLInputElement>;
}

export function Input({ className, ref, type = "text", ...props }: InputProps) {
  const theme = useTheme(primitivesTheme);
  return (
    <input
      ref={ref}
      type={type}
      className={cn(theme.slots.input, className)}
      {...props}
    />
  );
}
