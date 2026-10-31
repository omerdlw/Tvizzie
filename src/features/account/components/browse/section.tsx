import type { JSX, ReactNode } from "react";
import { cn } from "@omerdlw/base-framework/utils";
import { AccountLink } from "./account-link";

export const counted = (count: number, one: string, many = `${one}s`) =>
  `${count.toLocaleString("en-US")} ${count === 1 ? one : many}`;

const LABEL =
  "text-[11px] leading-4 font-semibold tracking-[0.14em] text-white/60 uppercase";
const AFTER =
  "text-[11px] leading-4 font-semibold tracking-[0.14em] uppercase tabular-nums";

export function ViewAll({
  href,
  label = "All",
}: {
  href: string;
  label?: string;
}): JSX.Element {
  return (
    <AccountLink
      className={cn(AFTER, "text-white/40 hover:text-white")}
      href={href}
    >
      {label}
    </AccountLink>
  );
}

export function Section({
  action,
  children,
  className,
  summary,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  summary?: ReactNode;
  title: string;
}): JSX.Element {
  return (
    <section className={cn("flex w-full min-w-0 flex-col", className)}>
      <header className="mb-4 flex min-h-7 items-end justify-between gap-4 border-b border-white/10 pb-2">
        <h2 className={LABEL}>{title}</h2>
        {summary || action ? (
          <div className="flex shrink-0 items-center gap-4">
            {summary ? (
              <span className={cn(AFTER, "text-white/40")}>{summary}</span>
            ) : null}
            {action}
          </div>
        ) : null}
      </header>
      {children}
    </section>
  );
}

export function CountLink({
  count,
  href,
}: {
  count: number;
  href: string;
}): JSX.Element {
  return (
    <AccountLink
      className={cn(AFTER, "text-white/40 hover:text-white")}
      href={href}
    >
      {count.toLocaleString("en-US")}
    </AccountLink>
  );
}
