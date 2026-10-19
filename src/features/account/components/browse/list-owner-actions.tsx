"use client";

import { useMemo, type JSX } from "react";
import {
  useDockActionClass,
  useDockActions,
} from "@omerdlw/base-framework/modules/dock";
import { Button, Icon } from "@/ui";
import { useAccountDock } from "../account-dock";
import {
  createListFormSurfaceEntry,
  type ListFormData,
} from "./list-form-surface";

function NewListAction({ username }: { username: string }): JSX.Element {
  const actionClass = useDockActionClass();
  const { openSurface } = useDockActions();
  return (
    <Button
      className={actionClass({ className: "w-full backdrop-blur-sm" })}
      onClick={() => void openSurface(createListFormSurfaceEntry({ username }))}
      type="button"
    >
      <Icon icon="solar:add-circle-bold" size={16} />
      <span className="truncate">New list</span>
    </Button>
  );
}

// On the owner's lists page, starting a list is the dock's action.
export function ListsChrome({
  isOwner,
  username,
}: {
  isOwner: boolean;
  username: string;
}): null {
  const dock = useMemo(
    () => (isOwner ? { action: <NewListAction username={username} /> } : null),
    [isOwner, username],
  );
  useAccountDock(dock);
  return null;
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
      type="button"
    >
      <Icon icon="solar:pen-bold" size={15} />
    </Button>
  );
}

export function EditListAction(props: ListFormData): JSX.Element {
  const actionClass = useDockActionClass();
  return (
    <EditListButton
      {...props}
      className={actionClass({
        className: "w-10 shrink-0 px-0 backdrop-blur-sm",
      })}
    />
  );
}
