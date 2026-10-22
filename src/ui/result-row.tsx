"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useDockLinkClick } from "../motion/dock-link";

// One search answer: a picture, a name and a line of what it is. Every row
// is one height, so a page of them holds its size from page to page.
export function ResultRow({
  href,
  label,
  meta,
  onNavigated,
  thumb,
  title,
}: {
  href: string;
  label: string;
  meta: ReactNode;
  onNavigated?: () => void;
  thumb: ReactNode;
  title: ReactNode;
}) {
  const handleClick = useDockLinkClick(href, onNavigated);

  return (
    <Link
      aria-label={label}
      className="cine-fade flex h-16 items-center gap-3 rounded-control p-0.5 pr-3 outline-none hover:bg-white/10 focus-visible:bg-white/10 in-data-active:bg-white/10"
      href={href}
      onClick={handleClick}
      prefetch={false}
    >
      <span className="center w-10 shrink-0">{thumb}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-sm leading-tight font-semibold text-white">
          {title}
        </span>
        <span className="flex min-w-0 items-center gap-1.5 text-xs leading-tight text-white/50">
          {meta}
        </span>
      </span>
    </Link>
  );
}
