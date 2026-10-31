"use client";

import type { ComponentProps } from "react";
import { Icon as IconifyIcon } from "@iconify-icon/react";

interface IconProps extends Omit<
  ComponentProps<typeof IconifyIcon>,
  "icon" | "size"
> {
  color?: string;
  icon: ComponentProps<typeof IconifyIcon>["icon"];
  size?: number | string;
}

export function Icon({
  className = "center",
  color,
  icon,
  size = 20,
  ...props
}: IconProps) {
  return (
    <IconifyIcon
      className={className}
      height={size}
      icon={icon}
      style={{ color, height: size, width: size }}
      width={size}
      {...props}
    />
  );
}
