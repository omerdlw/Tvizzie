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

  // The page's own bar, across the top of the hero: the words side by side
  // between short rules, on a hairline that runs the width of the screen.
  return (
    <nav
      aria-label="Profile sections"
      className="relative w-full bg-black/40 backdrop-blur-md"
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-px bg-white/12"
      />
      <div className="relative mx-auto w-full max-w-6xl overflow-x-auto [scrollbar-width:none] sm:px-6 lg:px-8">
        <ul className="flex min-w-max items-center justify-center px-2 sm:px-0">
          {SECTIONS.map((section, index) => {
            const isActive = section.key === active;
            return (
              <li className="flex items-center" key={section.label}>
                {index > 0 ? (
                  <span aria-hidden="true" className="h-3 w-px bg-white/15" />
                ) : null}
                <AccountLink
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative inline-flex h-12 items-center px-3.5 text-[13px] font-medium transition-colors select-none sm:px-4",
                    isActive ? "text-white" : "text-white/50 hover:text-white",
                  )}
                  href={section.key ? `${base}/${section.key}` : base}
                >
                  {section.label}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-x-3.5 bottom-0 h-px bg-white transition-opacity sm:inset-x-4",
                      isActive ? "opacity-100" : "opacity-0",
                    )}
                  />
                </AccountLink>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
