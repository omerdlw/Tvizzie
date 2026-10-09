"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@omerdlw/base-framework/utils";
import { Button, Icon } from "./";

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
  value: K;
}

export function SegmentedControl<K extends string>({
  ariaLabel,
  className,
  fill = false,
  items,
  onChange,
  value,
}: SegmentedControlProps<K>) {
  const pill = useId();
  const reduced = useReducedMotion();
  if (items.length === 0) return null;

  return (
    <div
      aria-label={ariaLabel}
      className={cn(
        "h-8 max-w-full items-stretch gap-0.5 overflow-x-auto rounded-[13px] bg-white/5 p-[3px] ring-1 ring-white/5 ring-inset select-none",
        fill ? "flex w-full" : "inline-flex w-fit",
        className,
      )}
      role="tablist"
    >
      {items.map((item) => {
        const active = item.key === value;
        return (
          <Button
            aria-selected={active}
            className={cn(
              "cine-fade relative inline-flex min-w-fit cursor-pointer items-center justify-center gap-1.5 rounded-[10px] px-3 text-xs whitespace-nowrap outline-none focus-visible:ring-1 focus-visible:ring-white/50 focus-visible:ring-inset",
              fill && "flex-1",
              active ? "text-white" : "text-white/70 hover:text-white",
            )}
            key={item.key}
            onClick={() => onChange(item.key)}
            role="tab"
          >
            {active ? (
              <motion.span
                aria-hidden="true"
                className="absolute inset-0 rounded-[10px] bg-white/10 shadow-sm"
                layoutId={pill}
                transition={
                  reduced
                    ? { duration: 0 }
                    : { damping: 32, mass: 1.1, stiffness: 150, type: "spring" }
                }
              />
            ) : null}
            {item.icon ? (
              <Icon className="relative" icon={item.icon} size={12} />
            ) : null}
            <span className="relative">{item.label}</span>
            {item.count !== undefined && item.count > 0 ? (
              <span
                className={cn(
                  "relative text-[10px] font-bold tabular-nums",
                  active ? "text-white/70" : "text-white/50",
                )}
              >
                {item.count}
              </span>
            ) : null}
          </Button>
        );
      })}
    </div>
  );
}
