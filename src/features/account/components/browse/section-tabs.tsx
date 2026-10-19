"use client";

import type { JSX } from "react";
import { useSelectedLayoutSegment } from "next/navigation";
import { cn } from "@omerdlw/base-framework/utils";
import { AccountLink } from "./account-link";

const SECTIONS = [
  { key: null, label: "Profile" },
  { key: "activity", label: "Activity" },
  { key: "watched", label: "Films" },
  { key: "diary", label: "Diary" },
  { key: "reviews", label: "Reviews" },
  { key: "watchlist", label: "Watchlist" },
  { key: "lists", label: "Lists" },
  { key: "likes", label: "Likes" },
] as const;

export function AccountSectionTabs({
  username,
}: {
  username: string;
}): JSX.Element {
  const active = useSelectedLayoutSegment();
  const base = `/account/${encodeURIComponent(username)}`;

  return (
    <nav
      aria-label="Profile sections"
      className="-mx-4 overflow-x-auto border-y border-white/10 [scrollbar-width:none] sm:mx-0 sm:rounded-xl sm:border sm:bg-white/[0.02]"
    >
      <ul className="flex min-w-max items-stretch px-2 sm:justify-center">
        {SECTIONS.map((section) => {
          const isActive = section.key === active;
          return (
            <li className="flex" key={section.label}>
              <AccountLink
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative inline-flex h-12 items-center px-3 text-[13px] font-medium transition-colors select-none sm:px-3.5",
                  isActive ? "text-white" : "text-white/50 hover:text-white",
                )}
                href={section.key ? `${base}/${section.key}` : base}
              >
                {section.label}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-3 -bottom-px h-0.5 bg-white transition-opacity sm:inset-x-3.5",
                    isActive ? "opacity-100" : "opacity-0",
                  )}
                />
              </AccountLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
