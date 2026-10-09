"use client";

import { useState, type FormEvent, type JSX } from "react";
import { useRouter } from "next/navigation";
import {
  useDockActions,
  type SurfaceEntry,
} from "@omerdlw/base-framework/modules/dock";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { cn, report, toUserMessage } from "@omerdlw/base-framework/utils";
import { Button, Icon, Input, Switch, Textarea } from "@/ui";
import { LIST_DESCRIPTION_MAX } from "../../lib/browse-data";
import { LIST_TITLE_MAX } from "../../lib/lists";
import { deleteListAction, saveListAction } from "../../server/browse-actions";

export interface ListFormData {
  list?: {
    description: string;
    id: string;
    isPrivate: boolean;
    isRanked: boolean;
    slug: string;
    title: string;
  };
  username: string;
}

export function createListFormSurfaceEntry(data: ListFormData): SurfaceEntry {
  return {
    component: ListFormSurface,
    description: data.list ? "Change this list" : "Name it and make it yours",
    icon: data.list ? "solar:pen-bold" : "solar:add-circle-bold",
    props: { data },
    title: data.list ? "Edit List" : "New List",
  };
}

const FIELD =
  "w-full rounded-[20px] bg-white/5 px-4 text-sm text-white ring-1 ring-white/5 ring-inset placeholder:text-white/40 hover:bg-white/10 focus:bg-white/10 focus:outline-none";

function Toggle({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  label: string;
  onChange: (value: boolean) => void;
}): JSX.Element {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-[20px] bg-white/5 px-4 py-3 ring-1 ring-white/5 ring-inset hover:bg-white/10">
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-white">{label}</span>
        <span className="block text-xs text-white/50">{description}</span>
      </span>
      <Switch aria-label={label} checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function ListFormSurface({ data }: { data: ListFormData }): JSX.Element {
  const router = useRouter();
  const toast = useToast();
  const { closeSurface } = useDockActions();
  const list = data.list;

  const [title, setTitle] = useState(list?.title ?? "");
  const [description, setDescription] = useState(list?.description ?? "");
  const [isPrivate, setIsPrivate] = useState(list?.isPrivate ?? false);
  const [isRanked, setIsRanked] = useState(list?.isRanked ?? false);
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || busy) return;
    setBusy("save");
    try {
      const result = await saveListAction(list?.id ?? null, {
        description,
        isPrivate,
        isRanked,
        title,
      });
      if (!result.success) {
        toast(result.error);
        return;
      }
      closeSurface?.();
      if (list) router.refresh();
      else {
        router.push(
          `/account/${encodeURIComponent(data.username)}/lists/${result.slug}`,
        );
      }
    } catch (error) {
      report("ListFormSurface save", error);
      toast(toUserMessage(error, { fallback: "Could not save your list" }));
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!list || busy) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setBusy("delete");
    try {
      const result = await deleteListAction(list.id);
      if (!result.success) {
        toast(result.error);
        return;
      }
      closeSurface?.();
      router.push(`/account/${encodeURIComponent(data.username)}/lists`);
      router.refresh();
    } catch (error) {
      report("ListFormSurface delete", error);
      toast(toUserMessage(error, { fallback: "Could not delete this list" }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <form className="flex w-full flex-col gap-2.5" onSubmit={save}>
      <Input
        aria-label="List name"
        className={cn(FIELD, "h-11")}
        disabled={busy !== null}
        maxLength={LIST_TITLE_MAX}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="List name"
        value={title}
      />
      <Textarea
        aria-label="Description"
        className={cn(FIELD, "py-3")}
        disabled={busy !== null}
        maxLength={LIST_DESCRIPTION_MAX}
        minHeight={88}
        maxHeight={180}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="What is this list about? (optional)"
        value={description}
      />
      <Toggle
        checked={isRanked}
        description="Number the films in the order you keep them"
        label="Ranked"
        onChange={setIsRanked}
      />
      <Toggle
        checked={isPrivate}
        description="Only you can see it, and it stays out of your activity"
        label="Private"
        onChange={setIsPrivate}
      />

      <div className="mt-1 flex items-center gap-2.5">
        {list ? (
          <Button
            className={cn(
              "inline-flex h-11 cursor-pointer items-center gap-2 rounded-[20px] px-4 text-xs font-bold uppercase ring-1 ring-inset disabled:cursor-wait",
              confirmingDelete
                ? "bg-red-600 text-white ring-red-400"
                : "bg-white/5 text-white/60 ring-white/5 hover:bg-white/10 hover:text-white",
            )}
            disabled={busy !== null}
            loading={busy === "delete"}
            onClick={() => void remove()}
          >
            <Icon icon="solar:trash-bin-trash-bold" size={15} />
            {confirmingDelete ? "Delete for good" : "Delete"}
          </Button>
        ) : null}
        <Button
          className="ml-auto inline-flex h-11 cursor-pointer items-center gap-2 rounded-[20px] bg-white px-5 text-xs font-bold text-black uppercase hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!title.trim() || busy !== null}
          loading={busy === "save"}
          type="submit"
        >
          {list ? "Save" : "Create list"}
        </Button>
      </div>
    </form>
  );
}
