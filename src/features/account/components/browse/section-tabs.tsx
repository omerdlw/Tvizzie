"use client";

import type { JSX } from "react";
import { useSelectedLayoutSegment } from "next/navigation";
import { cn } from "@omerdlw/base-framework/utils";
import { Icon } from "@/ui";
import type { LibraryCounts } from "../../lib/library-view";
import { AccountLink } from "./account-link";

const SECTIONS = [
  { count: null, icon: "solar:widget-bold", key: null, label: "Overview" },
  { count: null, icon: "solar:bolt-bold", key: "activity", label: "Activity" },
  {
    count: "diary",
    icon: "solar:calendar-mark-bold",
    key: "diary",
    label: "Diary",
  },
  { count: "likes", icon: "solar:heart-bold", key: "likes", label: "Likes" },
  {
    count: "watched",
    icon: "solar:eye-bold",
    key: "watched",
    label: "Watched",
  },
  {
    count: "watchlist",
    icon: "solar:bookmark-bold",
    key: "watchlist",
    label: "Watchlist",
  },
  {
    count: "reviews",
    icon: "solar:chat-round-bold",
    key: "reviews",
    label: "Reviews",
  },
  { count: "lists", icon: "solar:list-bold", key: "lists", label: "Lists" },
] as const;

export function AccountSectionTabs({
  counts,
  username,
}: {
  counts: LibraryCounts;
  username: string;
}): JSX.Element {
  const active = useSelectedLayoutSegment();
  const base = `/account/${encodeURIComponent(username)}`;

  return (
    <nav
      aria-label="Account sections"
      className="mx-auto w-full max-w-6xl overflow-x-auto px-4 py-3 sm:px-6 lg:px-8"
    >
      <div className="inline-flex items-center gap-1">
        {SECTIONS.map((section) => {
          const isActive = (section.key ?? null) === active;
          const count = section.count ? counts[section.count] : null;
          return (
            <AccountLink
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "center shrink-0 gap-1.5 rounded-full px-3 py-2 text-xs font-semibold uppercase select-none",
                isActive
                  ? "bg-white/15 font-bold text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white",
              )}
              href={section.key ? `${base}/${section.key}` : base}
              key={section.label}
            >
              <Icon
                className={isActive ? "text-white" : "text-white/50"}
                icon={section.icon}
                size={14}
              />
              <span className="leading-none">{section.label}</span>
              {count ? (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 font-mono text-[10px] leading-none font-medium",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-white/10 text-white/50",
                  )}
                >
                  {count}
                </span>
              ) : null}
            </AccountLink>
          );
        })}
      </div>
    </nav>
  );
}
