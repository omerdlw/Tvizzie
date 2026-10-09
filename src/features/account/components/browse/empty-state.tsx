import type { JSX } from "react";
import { Icon } from "@/ui";

export function EmptyState({
  children,
  icon = "solar:ghost-bold",
}: {
  children: string;
  icon?: string;
}): JSX.Element {
  return (
    <div className="flex min-h-[12rem] flex-col items-center justify-center gap-3 rounded-[20px] bg-white/5 p-8 text-center ring-1 ring-white/5 ring-inset">
      <div className="center size-12 rounded-2xl bg-white/5 text-white/50 ring-1 ring-white/10 ring-inset">
        <Icon icon={icon} size={24} />
      </div>
      <p className="max-w-xs text-xs text-white/50 sm:text-sm">{children}</p>
    </div>
  );
}
