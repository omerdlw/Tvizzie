import type { JSX, ReactNode } from "react";
import { cn } from "@omerdlw/base-framework/utils";
import { AccountLink } from "./account-link";

interface ProfileStat {
  count: number;
  href: string;
  label: string;
}

const CELL = "group/stat flex flex-col items-center gap-1 px-1 sm:px-4";

function Figure({ count, label }: { count: number; label: string }) {
  return (
    <>
      <span className="text-xl leading-7 font-semibold text-white tabular-nums sm:text-2xl sm:leading-8">
        {count.toLocaleString("en-US")}
      </span>
      <span className="text-[9px] leading-3 font-semibold tracking-[0.02em] whitespace-nowrap text-white/40 uppercase group-hover/stat:text-white/75 min-[400px]:text-[10px] min-[400px]:tracking-[0.08em] sm:tracking-[0.12em]">
        {label}
      </span>
    </>
  );
}

function ProfileStatLink({ count, href, label }: ProfileStat) {
  return (
    <li className="flex justify-center">
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
    <li className="flex justify-center">
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
  return (
    <ul className="grid auto-cols-fr grid-flow-col divide-x divide-white/10">
      {children}
    </ul>
  );
}
