"use client";

import type { JSX } from "react";
import { useDockActions } from "@omerdlw/base-framework/modules/dock";
import { Button, Icon } from "@/ui";
import {
  createListFormSurfaceEntry,
  type ListFormData,
} from "./list-form-surface";

export function NewListButton({ username }: { username: string }): JSX.Element {
  const { openSurface } = useDockActions();
  return (
    <Button
      className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[13px] bg-white/10 px-3.5 text-xs font-bold text-white uppercase ring-1 ring-white/10 ring-inset hover:bg-white hover:text-black"
      onClick={() => void openSurface(createListFormSurfaceEntry({ username }))}
    >
      <Icon icon="solar:add-circle-bold" size={15} />
      New list
    </Button>
  );
}

export function EditListButton({
  className,
  list,
  username,
}: ListFormData & { className?: string }): JSX.Element {
  const { openSurface } = useDockActions();
  return (
    <Button
      aria-label={`Edit ${list?.title ?? "list"}`}
      className={
        className ??
        "center size-8 cursor-pointer rounded-full bg-black/70 text-white/80 ring-1 ring-white/10 backdrop-blur-sm ring-inset hover:bg-black hover:text-white"
      }
      onClick={() =>
        void openSurface(createListFormSurfaceEntry({ list, username }))
      }
    >
      <Icon icon="solar:pen-bold" size={14} />
    </Button>
  );
}
