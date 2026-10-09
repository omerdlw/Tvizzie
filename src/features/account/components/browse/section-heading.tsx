import type { JSX, ReactNode } from "react";
import { Icon } from "@/ui";
import { AccountLink } from "./account-link";

export function SectionHeading({
  action,
  href,
  icon,
  summary,
  title,
}: {
  action?: ReactNode;
  href?: string;
  icon: string;
  summary?: string;
  title: string;
}): JSX.Element {
  return (
    <header className="mb-3 flex w-full items-center justify-between gap-4 sm:mb-4">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="shrink-0 text-white/50" icon={icon} size={16} />
        <h2 className="min-w-0 truncate text-xs font-semibold text-white/70 uppercase sm:text-sm">
          {title}
        </h2>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {summary ? (
          <span className="text-xs font-semibold text-white/50 uppercase">
            {summary}
          </span>
        ) : null}
        {action}
        {href ? (
          <AccountLink
            className="inline-flex items-center gap-1 text-xs font-semibold text-white/50 uppercase hover:text-white"
            href={href}
          >
            See more
            <Icon icon="solar:alt-arrow-right-linear" size={12} />
          </AccountLink>
        ) : null}
      </div>
    </header>
  );
}
