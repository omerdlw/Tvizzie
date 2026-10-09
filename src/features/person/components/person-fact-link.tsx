"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useDockLinkClick } from "@/motion";

export function FactLink({
  children,
  href,
  label,
}: {
  children: ReactNode;
  href: string;
  label: string;
}) {
  const handleClick = useDockLinkClick(href);
  return (
    <Link
      aria-label={label}
      className="cine-fade border-b border-white/25 outline-none hover:border-white/70 focus-visible:border-white"
      href={href}
      onClick={handleClick}
      prefetch={false}
    >
      {children}
    </Link>
  );
}
