"use client";

import type { ButtonHTMLAttributes, Ref } from "react";
import { useTheme } from "@omerdlw/base-framework/theme";
import { cn } from "@omerdlw/base-framework/utils";
import { Loader } from "./loader";
import { primitivesTheme } from "./theme";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

export function Button({
  children,
  className,
  disabled = false,
  loading = false,
  ref,
  type = "button",
  ...props
}: ButtonProps) {
  const theme = useTheme(primitivesTheme);

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading ? true : undefined}
      className={cn(theme.slots.button, className)}
      {...props}
    >
      {loading ? (
        <span className={theme.slots.stack}>
          <span className={theme.slots.stackBase}>{children}</span>
          <span className={theme.slots.stackTop}>
            <Loader />
          </span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}
