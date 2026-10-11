"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@omerdlw/base-framework/utils";
import { useDockLinkClick } from "../motion/dock-link";
import { AdaptiveImage, Icon, Tooltip } from "./";

const ASPECT = {
  free: "",
  poster: "aspect-[2/3]",
  square: "aspect-square",
  video: "aspect-video",
} as const;

export type MediaCardAspect = keyof typeof ASPECT;

interface MediaCardImage {
  priority?: boolean;
  sizes?: string;
  src: string | null;
  srcSet?: string;
}

type DataAttributes = { [key: `data-${string}`]: string | undefined };

interface MediaCardProps extends DataAttributes {
  aspect?: MediaCardAspect;
  caption?: ReactNode;
  className?: string;
  fallbackIcon?: string;
  fallbackIconSize?: number;
  frameClassName?: string;
  framed?: boolean;
  href?: string;
  image: MediaCardImage;
  label?: string;
  onNavigated?: () => void;
  onClick?: () => void;
  overlay?: ReactNode;
  radius?: number;
  tooltip?: string;
}

export function MediaCard({
  aspect = "poster",
  caption,
  className,
  fallbackIcon = "solar:gallery-bold",
  fallbackIconSize = 22,
  frameClassName,
  framed = true,
  href,
  image,
  label,
  onClick,
  onNavigated,
  overlay,
  radius = 20,
  tooltip,
  ...rest
}: MediaCardProps) {
  const style: CSSProperties = { borderRadius: radius };
  const classes = cn(
    "cine-card group/media flex min-w-0 flex-col gap-1.5 outline-none",
    aspect !== "free" && "w-full",
    className,
  );

  const body = (
    <>
      <div
        className={cn(
          "cine-fade relative isolate overflow-hidden",
          ASPECT[aspect],
          framed &&
            "bg-white/5 ring-1 ring-white/5 ring-inset group-hover/media:ring-white/50 group-focus-visible/media:ring-white/50",
          frameClassName,
        )}
        style={style}
      >
        <AdaptiveImage
          alt=""
          className="cine-zoom object-cover"
          fallback={
            <div className="center h-full w-full text-white/40">
              <Icon icon={fallbackIcon} size={fallbackIconSize} />
            </div>
          }
          fetchPriority={image.priority ? "high" : undefined}
          loading={image.priority ? "eager" : undefined}
          sizes={image.sizes}
          src={image.src}
          srcSet={image.srcSet}
        />
        {overlay}
      </div>
      {caption}
    </>
  );

  let card: ReactNode;
  if (href) {
    card = (
      <LinkCard
        className={classes}
        data-cursor="card"
        href={href}
        label={label}
        onNavigated={onNavigated}
        style={style}
        {...rest}
      >
        {body}
      </LinkCard>
    );
  } else if (onClick) {
    card = (
      <button
        {...rest}
        aria-label={label}
        className={cn(classes, "cursor-pointer text-left")}
        data-cursor="card"
        onClick={onClick}
        style={style}
        type="button"
      >
        {body}
      </button>
    );
  } else {
    card = (
      <div className={classes} style={style}>
        {body}
      </div>
    );
  }

  return tooltip ? (
    <Tooltip position="top" text={tooltip}>
      {card}
    </Tooltip>
  ) : (
    card
  );
}

function LinkCard({
  children,
  className,
  href,
  label,
  onNavigated,
  style,
  ...rest
}: {
  children: ReactNode;
  className: string;
  href: string;
  label?: string;
  onNavigated?: () => void;
  style: CSSProperties;
} & DataAttributes) {
  const handleClick = useDockLinkClick(href, onNavigated);
  return (
    <Link
      {...rest}
      aria-label={label}
      className={className}
      href={href}
      onClick={handleClick}
      prefetch={false}
      style={style}
    >
      {children}
    </Link>
  );
}
