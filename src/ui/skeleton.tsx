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
      className={cn("skeleton-block", className)}
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
          <SkeletonBlock className="rounded-full" style={{ height, width }} />
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
    <div aria-hidden="true" className="mb-4">
      <div className="flex min-h-8 w-full items-center gap-4">
        <div className="flex min-w-0 shrink-0 items-center gap-2.5">
          <SkeletonBlock className="size-[18px] shrink-0 rounded-full" />
          <div className="flex h-4 items-center">
            <SkeletonBlock
              className="h-[7px] rounded-full"
              style={{ width: title }}
            />
          </div>
        </div>
        <SkeletonBlock className="h-px min-w-6 flex-1" />
        {actions ? (
          <div className="flex min-w-0 shrink-0">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}

export function TabsSkeleton({
  chosen,
  className,
  width,
}: {
  chosen: string;
  className?: string;
  width: string;
}): JSX.Element {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "skeleton-block h-8 shrink-0 rounded-full p-0.5",
        className,
      )}
      style={{ width }}
    >
      <SkeletonBlock className="h-7 rounded-full" style={{ width: chosen }} />
    </div>
  );
}

export function CarouselSkeleton({
  aspect,
  blockClassName,
  count,
  itemClassName,
}: {
  aspect: string;
  blockClassName?: string;
  count: number;
  itemClassName: string;
}): JSX.Element {
  return (
    <div aria-hidden="true" className="relative w-full">
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: count }, (_, index) => (
          <div className={cn("shrink-0", itemClassName)} key={index}>
            <SkeletonBlock className={cn("w-full", aspect, blockClassName)} />
          </div>
        ))}
      </div>
    </div>
  );
}
