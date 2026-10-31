"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useOptionalDockState } from "@omerdlw/base-framework/modules/dock";
import { cn } from "@omerdlw/base-framework/utils";

export function StickyAside({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const resting = useOptionalDockState(
    (state) => state.surfacePhase === "idle",
  );

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () =>
      element.style.setProperty("--aside-h", `${element.offsetHeight}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element || !resting) return;
    const root = document.documentElement;
    const follow = () => {
      const height = parseFloat(root.style.getPropertyValue("--dock-h"));
      if (Number.isFinite(height)) {
        element.style.setProperty("--aside-clear", `${height}px`);
      }
    };
    follow();
    const dock = new MutationObserver(follow);
    dock.observe(root, { attributeFilter: ["style"], attributes: true });
    return () => dock.disconnect();
  }, [resting]);

  return (
    <aside
      className={cn(
        "lg:sticky lg:top-[min(1.5rem,calc(100svh-var(--aside-clear,var(--dock-h,6rem))-2rem-var(--aside-h,0px)))]",
        className,
      )}
      data-flow-scope=""
      ref={ref}
    >
      {children}
    </aside>
  );
}
