"use client";

import type { Ref, TextareaHTMLAttributes } from "react";
import { useTheme } from "@omerdlw/base-framework/theme";
import { cn } from "@omerdlw/base-framework/utils";
import { primitivesTheme } from "./theme";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  maxHeight?: number;
  minHeight?: number;
  ref?: Ref<HTMLTextAreaElement>;
}

export function Textarea({
  className,
  maxHeight,
  minHeight,
  ref,
  style,
  ...props
}: TextareaProps) {
  const theme = useTheme(primitivesTheme);
  return (
    <textarea
      ref={ref}
      className={cn(theme.slots.textarea, className)}
      style={{ maxHeight, minHeight, ...style }}
      {...props}
    />
  );
}
