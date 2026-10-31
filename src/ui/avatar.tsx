"use client";

import { useState, type HTMLAttributes, type ReactNode, type Ref } from "react";
import { useTheme } from "@omerdlw/base-framework/theme";
import { cn } from "@omerdlw/base-framework/utils";
import { AdaptiveImage } from "./adaptive-image";
import { primitivesTheme } from "./theme";

interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  alt?: string;
  fallback?: ReactNode;
  name?: string;
  ref?: Ref<HTMLSpanElement>;
  size?: number | string;
  src?: string | null;
}

function initialsOf(name?: string): string {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function Avatar({
  alt,
  children,
  className,
  fallback,
  name,
  ref,
  size = 36,
  src,
  style,
  ...props
}: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const theme = useTheme(primitivesTheme);
  const dimension = typeof size === "number" ? `${size}px` : size;

  return (
    <span
      ref={ref}
      style={{ height: dimension, width: dimension, ...style }}
      className={cn(theme.slots.avatar, className)}
      {...props}
    >
      {src && src !== failedSrc ? (
        <AdaptiveImage
          src={src}
          alt={alt || name || "Avatar"}
          onError={() => setFailedSrc(src)}
          className={theme.slots.avatarImage}
        />
      ) : (
        <span className={theme.slots.avatarFallback}>
          {fallback ?? children ?? initialsOf(name || alt)}
        </span>
      )}
    </span>
  );
}
