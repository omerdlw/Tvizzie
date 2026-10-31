"use client";

import { useId, useState, type JSX, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { LayoutGroup } from "motion/react";
import { cn } from "@omerdlw/base-framework/utils";
import { Icon } from "@/ui";
import { SlidingHighlight } from "@/ui/sliding-highlight";
import { AccountLink } from "./account-link";

function windowOf(page: number, count: number): (number | "gap")[] {
  const wanted = new Set([1, count, page - 1, page, page + 1]);
  const pages = [...wanted]
    .filter((value) => value >= 1 && value <= count)
    .sort((a, b) => a - b);
  const result: (number | "gap")[] = [];
  pages.forEach((value, index) => {
    const previous = pages[index - 1];
    if (previous !== undefined && value - previous > 1) result.push("gap");
    result.push(value);
  });
  return result;
}

export function Pagination({
  page,
  pageCount,
}: {
  page: number;
  pageCount: number;
}): JSX.Element | null {
  const pathname = usePathname();
  const search = useSearchParams();
  const highlightGroupId = useId();
  const [hoveredTarget, setHoveredTarget] = useState<string | null>(null);
  const [focusedTarget, setFocusedTarget] = useState<string | null>(null);
  const activeTarget = hoveredTarget ?? focusedTarget;
  if (pageCount <= 1) return null;

  const hrefFor = (target: number) => {
    const params = new URLSearchParams(search.toString());
    if (target > 1) params.set("page", String(target));
    else params.delete("page");
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const step =
    "center size-9 shrink-0 rounded-full text-xs font-semibold ring-1 ring-inset";
  const pageLink = (
    target: string,
    href: string,
    children: ReactNode,
    className: string,
    ariaLabel?: string,
    ariaCurrent?: "page",
    key?: string,
  ) => (
    <AccountLink
      aria-current={ariaCurrent}
      aria-label={ariaLabel}
      className={cn(className, "relative isolate")}
      href={href}
      key={key}
      onFocus={() => setFocusedTarget(target)}
      onPointerEnter={() => setHoveredTarget(target)}
    >
      {activeTarget === target ? (
        <SlidingHighlight
          className="rounded-full bg-white/[0.06]"
          layoutId="pagination-highlight"
        />
      ) : null}
      <span className="relative z-10">{children}</span>
    </AccountLink>
  );

  return (
    <LayoutGroup id={`pagination-${highlightGroupId}`}>
      <nav
        aria-label="Pages"
        className="mt-8 flex flex-wrap items-center justify-center gap-1.5"
        onBlurCapture={(event) => {
          if (
            !(event.relatedTarget instanceof Node) ||
            !event.currentTarget.contains(event.relatedTarget)
          ) {
            setFocusedTarget(null);
          }
        }}
        onPointerLeave={() => setHoveredTarget(null)}
      >
        {page > 1
          ? pageLink(
              "previous",
              hrefFor(page - 1),
              <Icon icon="solar:alt-arrow-left-linear" size={14} />,
              cn(step, "text-white/70 ring-white/5 hover:text-white"),
              "Previous page",
            )
          : null}
        {windowOf(page, pageCount).map((entry, index) =>
          entry === "gap" ? (
            <span className="px-1 text-white/30" key={`gap-${index}`}>
              …
            </span>
          ) : (
            pageLink(
              `page-${entry}`,
              hrefFor(entry),
              entry,
              cn(
                step,
                entry === page
                  ? "text-white ring-white/[0.12]"
                  : "text-white/70 ring-white/5 hover:text-white",
              ),
              undefined,
              entry === page ? "page" : undefined,
              `page-${entry}`,
            )
          ),
        )}
        {page < pageCount
          ? pageLink(
              "next",
              hrefFor(page + 1),
              <Icon icon="solar:alt-arrow-right-linear" size={14} />,
              cn(step, "text-white/70 ring-white/5 hover:text-white"),
              "Next page",
            )
          : null}
      </nav>
    </LayoutGroup>
  );
}
