import type { CSSProperties, JSX, ReactNode } from "react";
import { cn } from "@omerdlw/base-framework/utils";

export function SkeletonBlock({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}): JSX.Element {
  return (
    <div
      aria-hidden="true"
      className={cn("skeleton-block rounded-full", className)}
      style={style}
    />
  );
}

export function SkeletonLines({
  className,
  height = "0.62em",
  widths,
}: {
  className?: string;
  height?: string;
  widths: readonly string[];
}): JSX.Element {
  return (
    <div aria-hidden="true" className={className}>
      {widths.map((width, index) => (
        <div className="flex h-[1lh] items-center" key={index}>
          <SkeletonBlock style={{ height, width }} />
        </div>
      ))}
    </div>
  );
}

export function SectionHeaderSkeleton({
  actions,
  title = "5.5rem",
}: {
  actions?: ReactNode;
  title?: string;
}): JSX.Element {
  return (
    <div
      aria-hidden="true"
      className="mb-4 flex min-h-8 w-full items-center gap-4"
    >
      <div className="flex min-w-0 shrink-0 items-center gap-2.5">
        <SkeletonBlock className="size-[18px] shrink-0" />
        <SkeletonBlock className="h-[11px]" style={{ width: title }} />
      </div>
      <SkeletonBlock className="h-px min-w-6 flex-1 rounded-none" />
      {actions}
    </div>
  );
}

export function TabsSkeleton({ width }: { width: string }): JSX.Element {
  return (
    <div aria-hidden="true" className="mb-4 flex w-full items-center">
      <SkeletonBlock className="h-8 rounded-[13px]" style={{ width }} />
    </div>
  );
}

export function CarouselSkeleton({
  aspect,
  count,
  itemClassName,
}: {
  aspect: string;
  count: number;
  itemClassName: string;
}): JSX.Element {
  return (
    <div aria-hidden="true" className="relative w-full">
      <div className="flex gap-3 overflow-hidden rounded-[20px]">
        {Array.from({ length: count }, (_, index) => (
          <div
            className={cn("shrink-0 rounded-[20px]", itemClassName)}
            key={index}
          >
            <SkeletonBlock className={cn("w-full rounded-[20px]", aspect)} />
          </div>
        ))}
      </div>
    </div>
  );
}
