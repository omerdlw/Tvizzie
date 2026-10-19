"use client";

import { useMemo, type JSX } from "react";
import { useDockActionClass } from "@omerdlw/base-framework/modules/dock";
import { Icon } from "@/ui";
import { useAccountDock } from "../account-dock";
import { AccountLink } from "./account-link";

function Step({
  direction,
  href,
}: {
  direction: "next" | "previous";
  href: string | null;
}): JSX.Element {
  const actionClass = useDockActionClass();
  const className = actionClass({
    className: "w-10 shrink-0 px-0 backdrop-blur-sm",
  });
  const icon =
    direction === "next"
      ? "solar:alt-arrow-right-linear"
      : "solar:alt-arrow-left-linear";
  const label = direction === "next" ? "Next month" : "Previous month";

  return href ? (
    <AccountLink aria-label={label} className={className} href={href}>
      <Icon icon={icon} size={16} />
    </AccountLink>
  ) : (
    <span
      aria-disabled="true"
      aria-label={label}
      className={`${className} cursor-default opacity-40`}
      role="link"
    >
      <Icon icon={icon} size={16} />
    </span>
  );
}

function MonthAction({
  label,
  latest,
  next,
  previous,
}: {
  label: string;
  latest: string | null;
  next: string | null;
  previous: string | null;
}): JSX.Element {
  const actionClass = useDockActionClass();
  const middle = actionClass({
    className: "min-w-0 flex-1 backdrop-blur-sm",
  });

  return (
    <div className="flex w-full items-center gap-2.5">
      <Step direction="previous" href={previous} />
      {latest ? (
        <AccountLink
          aria-label={`${label}, back to the latest month`}
          className={middle}
          href={latest}
        >
          <span className="truncate">{label}</span>
          <Icon icon="solar:restart-linear" size={14} />
        </AccountLink>
      ) : (
        <span className={`${middle} cursor-default`}>
          <span className="truncate">{label}</span>
        </span>
      )}
      <Step direction="next" href={next} />
    </div>
  );
}

// The diary turns its months from the dock.
export function DiaryChrome({
  label,
  latest,
  next,
  previous,
}: {
  label: string;
  // Where the latest month is, when this is not it.
  latest: string | null;
  next: string | null;
  previous: string | null;
}): null {
  const dock = useMemo(
    () => ({
      action: (
        <MonthAction
          label={label}
          latest={latest}
          next={next}
          previous={previous}
        />
      ),
    }),
    [label, latest, next, previous],
  );
  useAccountDock(dock);
  return null;
}
