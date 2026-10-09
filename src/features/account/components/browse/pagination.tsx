"use client";

import type { JSX } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@omerdlw/base-framework/utils";
import { Icon } from "@/ui";
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
  if (pageCount <= 1) return null;

  const hrefFor = (target: number) => {
    const params = new URLSearchParams(search.toString());
    if (target > 1) params.set("page", String(target));
    else params.delete("page");
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const step =
    "center size-9 shrink-0 rounded-[12px] text-xs font-semibold ring-1 ring-inset";

  return (
    <nav
      aria-label="Pages"
      className="mt-8 flex flex-wrap items-center justify-center gap-1.5"
    >
      {page > 1 ? (
        <AccountLink
          aria-label="Previous page"
          className={cn(step, "text-white/70 ring-white/5 hover:bg-white/10")}
          href={hrefFor(page - 1)}
        >
          <Icon icon="solar:alt-arrow-left-linear" size={14} />
        </AccountLink>
      ) : null}
      {windowOf(page, pageCount).map((entry, index) =>
        entry === "gap" ? (
          <span className="px-1 text-white/30" key={`gap-${index}`}>
            …
          </span>
        ) : (
          <AccountLink
            aria-current={entry === page ? "page" : undefined}
            className={cn(
              step,
              entry === page
                ? "bg-white/15 text-white ring-white/20"
                : "text-white/70 ring-white/5 hover:bg-white/10",
            )}
            href={hrefFor(entry)}
            key={entry}
          >
            {entry}
          </AccountLink>
        ),
      )}
      {page < pageCount ? (
        <AccountLink
          aria-label="Next page"
          className={cn(step, "text-white/70 ring-white/5 hover:bg-white/10")}
          href={hrefFor(page + 1)}
        >
          <Icon icon="solar:alt-arrow-right-linear" size={14} />
        </AccountLink>
      ) : null}
    </nav>
  );
}
