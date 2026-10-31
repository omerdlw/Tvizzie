"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useDockLinkClick } from "./dock-link";

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
      className="cine-fade group relative z-10 flex h-16 items-center gap-3 rounded-[16px] p-2 pr-4 outline-none focus-visible:bg-white/[0.07]"
      href={href}
      onClick={handleClick}
      prefetch={false}
    >
      <span className="ui-glyph center w-8 shrink-0 in-data-active:scale-[1.08]">
        {thumb}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-sm leading-tight font-semibold text-white">
          {title}
        </span>
        <span className="flex min-w-0 items-center gap-1.5 text-xs leading-tight text-white/50 group-hover:text-white/70 group-focus-visible:text-white/70 in-data-active:text-white/70">
          {meta}
        </span>
      </span>
    </Link>
  );
}
