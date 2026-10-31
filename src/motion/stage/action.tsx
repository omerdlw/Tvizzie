"use client";

import type { JSX, ReactNode } from "react";
import { cn } from "@omerdlw/base-framework/utils";
import { Button, Icon, TONE } from "@/ui";
import { Magnet } from "../film/magnet";
import { Fade } from "./clock";
import { Item } from "./section";
import { trackSpotlight } from "./spotlight";

const BASE =
  "cine-card cine-fade cine-spot group center relative w-full cursor-pointer gap-2.5 overflow-hidden rounded-full text-[13px] leading-4 font-medium select-none";

export function StageAction({
  active,
  ariaLabel,
  className,
  disabled = false,
  fade,
  grow = false,
  hoverLabel,
  icon,
  iconSize = 16,
  label,
  loading,
  onClick,
}: {
  active: boolean;
  ariaLabel?: string;
  className: string;
  disabled?: boolean;
  fade?: { run: number; since: number };
  grow?: boolean;
  hoverLabel?: string;
  icon: { off: string; on: string };
  iconSize?: number;
  label: ReactNode;
  loading?: boolean;
  onClick: () => void;
}): JSX.Element {
  const content = (
    <Magnet className="gap-2.5">
      <span
        className={cn(
          "inline-flex shrink-0 transition-[scale] duration-slow ease-out-expo",
          active ? "scale-110" : "group-hover:scale-110",
        )}
      >
        <Icon icon={active ? icon.on : icon.off} size={iconSize} />
      </span>
      <span className="relative">
        <span className={cn(hoverLabel && "cine-fade group-hover:opacity-0")}>
          {label}
        </span>
        {hoverLabel ? (
          <span className="cine-fade absolute inset-0 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100">
            {hoverLabel}
          </span>
        ) : null}
      </span>
    </Magnet>
  );

  return (
    <Item className={cn("min-w-0", grow && "flex-1")} exit={false} from="light">
      <Button
        aria-label={ariaLabel}
        aria-pressed={active}
        className={cn(BASE, className, active ? TONE.chosen : TONE.surface)}
        disabled={disabled}
        loading={loading}
        onClick={onClick}
        onPointerMove={trackSpotlight}
      >
        {fade ? (
          <Fade
            as="span"
            className="flex min-w-0 items-center justify-center"
            run={fade.run}
            since={fade.since}
          >
            {content}
          </Fade>
        ) : (
          content
        )}
      </Button>
    </Item>
  );
}
