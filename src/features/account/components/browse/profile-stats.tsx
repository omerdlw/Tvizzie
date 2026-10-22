import type { JSX, ReactNode } from "react";
import { cn } from "@omerdlw/base-framework/utils";
import { AccountLink } from "./account-link";

export interface ProfileStat {
  count: number;
  href: string;
  label: string;
}

// A count over its name in small capitals, as the hero's figures are set on
// Letterboxd. A link for what has a page, a button for what opens in the dock.
const CELL =
  "group/stat flex flex-col items-center gap-1 px-1 transition-colors sm:px-3";

function Figure({ count, label }: { count: number; label: string }) {
  return (
    <>
      <span className="text-lg leading-6 font-semibold text-white tabular-nums">
        {count.toLocaleString("en-US")}
      </span>
      <span className="text-[10px] leading-3 font-semibold tracking-[0.12em] whitespace-nowrap text-white/40 uppercase transition-colors group-hover/stat:text-white/75">
        {label}
      </span>
    </>
  );
}

export function ProfileStatLink({ count, href, label }: ProfileStat) {
  return (
    <li className="flex flex-1 justify-center sm:flex-none">
      <AccountLink className={CELL} href={href}>
        <Figure count={count} label={label} />
      </AccountLink>
    </li>
  );
}

export function ProfileStatButton({
  count,
  label,
  onClick,
}: {
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <li className="flex flex-1 justify-center sm:flex-none">
      <button
        className={cn(CELL, "cursor-pointer")}
        onClick={onClick}
        type="button"
      >
        <Figure count={count} label={label} />
      </button>
    </li>
  );
}

// The library's figures; the hero adds following and followers after them.
export function ProfileStats({
  stats,
}: {
  stats: readonly ProfileStat[];
}): JSX.Element {
  return (
    <>
      {stats.map((stat) => (
        <ProfileStatLink key={stat.label} {...stat} />
      ))}
    </>
  );
}

export function ProfileStatRow({ children }: { children: ReactNode }) {
  return <ul className="flex divide-x divide-white/10">{children}</ul>;
}
