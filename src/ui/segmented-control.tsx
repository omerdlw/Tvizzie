"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { DockSurfaceExtension } from "@omerdlw/base-framework/modules/dock";
import { cn } from "@omerdlw/base-framework/utils";
import { Button } from "./button";
import { Icon } from "./icon";

interface SegmentedItem<K extends string> {
  count?: number;
  icon?: string;
  key: K;
  label: string;
}

interface SegmentedControlProps<K extends string> {
  ariaLabel?: string;
  className?: string;
  fill?: boolean;
  items: readonly SegmentedItem<K>[];
  onChange: (key: K) => void;
  round?: boolean;
  value: K;
}

interface PillBox {
  width: number;
  x: number;
}

const PILL_SPRING = {
  damping: 32,
  mass: 1.1,
  stiffness: 150,
  type: "spring",
} as const;

export function useSlidingPill<T extends HTMLElement>(
  selector: string,
  key: unknown,
) {
  const ref = useRef<T>(null);
  const [box, setBox] = useState<PillBox | null>(null);

  useLayoutEffect(() => {
    const list = ref.current;
    if (!list) return;
    const measure = () => {
      const chosen = list.querySelector<HTMLElement>(selector);
      if (!chosen) return;
      const next = { width: chosen.offsetWidth, x: chosen.offsetLeft };
      setBox((prev) =>
        prev && prev.x === next.x && prev.width === next.width ? prev : next,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    for (const child of list.children) observer.observe(child);
    return () => observer.disconnect();
  }, [key, selector]);

  return { box, ref };
}

export function SlidingPill({
  box,
  className,
}: {
  box: PillBox;
  className: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.span
      animate={{ width: box.width, x: box.x }}
      aria-hidden="true"
      className={cn("pointer-events-none absolute left-0", className)}
      data-pill=""
      initial={false}
      transition={reduced ? { duration: 0 } : PILL_SPRING}
    />
  );
}

export function SegmentedControl<K extends string>({
  ariaLabel,
  className,
  fill = false,
  items,
  onChange,
  round = false,
  value,
}: SegmentedControlProps<K>) {
  const [hoveredKey, setHoveredKey] = useState<K | null>(null);
  const [focusedKey, setFocusedKey] = useState<K | null>(null);
  const hovered = items.some((item) => item.key === hoveredKey)
    ? hoveredKey
    : null;
  const focused = items.some((item) => item.key === focusedKey)
    ? focusedKey
    : null;
  const pillKey = hovered ?? focused ?? value;
  const { box: pill, ref: listRef } = useSlidingPill<HTMLDivElement>(
    "[data-pill-target]",
    pillKey,
  );

  if (items.length === 0) return null;

  return (
    <div
      aria-label={ariaLabel}
      className={cn(
        "relative h-8 max-w-full items-stretch gap-0.5 overflow-x-auto bg-white/[0.06] p-0.5 ring-1 ring-white/[0.04] ring-inset select-none scrollbar-none",
        fill ? "flex w-full" : "inline-flex w-fit",
        round && "rounded-full",
        className,
      )}
      onBlurCapture={(event) => {
        if (
          !(event.relatedTarget instanceof Node) ||
          !event.currentTarget.contains(event.relatedTarget)
        ) {
          setFocusedKey(null);
        }
      }}
      onPointerLeave={() => setHoveredKey(null)}
      ref={listRef}
      role="tablist"
    >
      {pill ? (
        <SlidingPill
          box={pill}
          className={cn(
            "inset-y-0.5 bg-white/[0.12] shadow-sm",
            round && "rounded-full",
          )}
        />
      ) : null}
      {items.map((item) => {
        const active = item.key === value;
        return (
          <Button
            aria-selected={active}
            data-pill-target={item.key === pillKey ? "" : undefined}
            className={cn(
              "relative inline-flex min-w-fit cursor-pointer items-center justify-center gap-1.5 px-3.5 text-xs font-medium whitespace-nowrap cine-fade outline-none focus-visible:ring-1 focus-visible:ring-white/[0.16] focus-visible:ring-inset",
              fill && "flex-1",
              round && "rounded-full",
              active
                ? "text-white"
                : "text-white/70 hover:text-white focus-visible:text-white",
              active && !pill && "bg-white/[0.12]",
            )}
            key={item.key}
            onClick={() => onChange(item.key)}
            onFocus={() => setFocusedKey(item.key)}
            onPointerEnter={() => setHoveredKey(item.key)}
            role="tab"
          >
            {item.icon ? <Icon icon={item.icon} size={12} /> : null}
            <span>{item.label}</span>
            {item.count !== undefined && item.count > 0 ? (
              <span className="-ml-0.5 tabular-nums">{item.count}</span>
            ) : null}
          </Button>
        );
      })}
    </div>
  );
}

export function SurfaceSegmentedControl<K extends string>({
  align = "center",
  id,
  ...props
}: Omit<SegmentedControlProps<K>, "round"> & {
  align?: "center" | "left" | "right";
  id: string;
}) {
  return (
    <DockSurfaceExtension align={align} id={id}>
      <SegmentedControl round {...props} />
    </DockSurfaceExtension>
  );
}
