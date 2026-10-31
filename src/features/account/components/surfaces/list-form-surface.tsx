"use client";

import { useId, useState, type FormEvent, type JSX } from "react";
import { LayoutGroup } from "motion/react";
import { useRouter } from "next/navigation";
import {
  useDockActions,
  type SurfaceEntry,
} from "@omerdlw/base-framework/modules/dock";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { cn, report, toUserMessage } from "@omerdlw/base-framework/utils";
import {
  Button,
  Icon,
  Input,
  SURFACE_FIELD,
  SURFACE_META,
  SURFACE_STACK,
  SURFACE_TEXT,
  SURFACE_TILE,
  SURFACE_TILE_END,
  SURFACE_TILE_INNER,
  SURFACE_TITLE,
  surfaceButton,
  Switch,
  Textarea,
} from "@/ui";
import { SlidingHighlight } from "@/ui/sliding-highlight";
import { Cascade, Item, SURFACE_LEAD, SurfaceScene } from "@/motion/stage";
import { LIST_DESCRIPTION_MAX } from "../../lib/browse-data";
import { LIST_TITLE_MAX } from "../../lib/lists";
import { deleteListAction, saveListAction } from "../../server/browse-actions";
import { createListOrderSurfaceEntry } from "./list-order-surface";
import { accountHref, listHref } from "@/config/routes";

export interface ListFormData {
  list?: {
    description: string;
    id: string;
    isPrivate: boolean;
    isRanked: boolean;
    itemsCount?: number;
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

function TileMark({ icon }: { icon: string }): JSX.Element {
  return (
    <span
      className={cn(
        "center relative z-10 size-10 shrink-0 bg-white/[0.06] text-white/60 group-hover:bg-white/10 group-hover:text-white/85",
        SURFACE_TILE_INNER,
      )}
    >
      <Icon className="ui-glyph center" icon={icon} size={18} />
    </span>
  );
}

function TileText({
  description,
  label,
}: {
  description: string;
  label: string;
}): JSX.Element {
  return (
    <span className={cn(SURFACE_TEXT, "relative z-10")}>
      <span className={SURFACE_TITLE}>{label}</span>
      <span className={SURFACE_META}>{description}</span>
    </span>
  );
}

function Toggle({
  checked,
  description,
  disabled,
  highlighted,
  icon,
  label,
  onBlur,
  onChange,
  onFocus,
  onPointerEnter,
}: {
  checked: boolean;
  description: string;
  disabled: boolean;
  highlighted: boolean;
  icon: string;
  label: string;
  onBlur: () => void;
  onChange: (value: boolean) => void;
  onFocus: () => void;
  onPointerEnter: () => void;
}): JSX.Element {
  return (
    <label
      className={cn(
        SURFACE_TILE,
        SURFACE_TILE_END,
        "group relative isolate cursor-pointer select-none",
      )}
      onBlur={onBlur}
      onFocus={onFocus}
      onPointerEnter={onPointerEnter}
    >
      {highlighted ? (
        <SlidingHighlight
          className="rounded-[16px] bg-white/[0.04] ring-1 ring-white/[0.08] ring-inset"
          layoutId="list-form-control-highlight"
        />
      ) : null}
      <TileMark icon={icon} />
      <TileText description={description} label={label} />
      <span className="relative z-10">
        <Switch
          aria-label={label}
          checked={checked}
          disabled={disabled}
          onCheckedChange={onChange}
        />
      </span>
    </label>
  );
}

function ListFormSurface({ data }: { data: ListFormData }): JSX.Element {
  const highlightGroupId = useId();
  const router = useRouter();
  const toast = useToast();
  const { closeSurface, openSurface } = useDockActions();
  const list = data.list;

  const [title, setTitle] = useState(list?.title ?? "");
  const [description, setDescription] = useState(list?.description ?? "");
  const [isPrivate, setIsPrivate] = useState(list?.isPrivate ?? false);
  const [isRanked, setIsRanked] = useState(list?.isRanked ?? false);
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [hoveredControl, setHoveredControl] = useState<string | null>(null);
  const [focusedControl, setFocusedControl] = useState<string | null>(null);

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
        router.push(listHref(data.username, result.slug));
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
      router.push(`${accountHref(data.username)}/lists`);
      router.refresh();
    } catch (error) {
      report("ListFormSurface delete", error);
      toast(toUserMessage(error, { fallback: "Could not delete this list" }));
    } finally {
      setBusy(null);
    }
  }

  const canOrder = list !== undefined && (list.itemsCount ?? 0) > 1;

  return (
    <SurfaceScene>
      <form onPointerLeave={() => setHoveredControl(null)} onSubmit={save}>
        <LayoutGroup id={`list-form-${highlightGroupId}`}>
          <Cascade className={SURFACE_STACK} lead={SURFACE_LEAD}>
            <Item from="up">
              <Input
                aria-label="List name"
                className={cn(SURFACE_FIELD, "h-10 w-full px-4 text-sm")}
                disabled={busy !== null}
                maxLength={LIST_TITLE_MAX}
                onPointerEnter={() => setHoveredControl(null)}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="List name"
                value={title}
              />
            </Item>
            <Item from="up">
              <Textarea
                aria-label="Description"
                className={cn(
                  SURFACE_FIELD,
                  "w-full px-4 py-3 text-sm leading-6",
                )}
                disabled={busy !== null}
                maxLength={LIST_DESCRIPTION_MAX}
                minHeight={96}
                maxHeight={180}
                onPointerEnter={() => setHoveredControl(null)}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What is this list about? (optional)"
                value={description}
              />
            </Item>
            <Item from="up">
              <Toggle
                checked={isRanked}
                description="Number the films in the order you keep them"
                disabled={busy !== null}
                highlighted={(hoveredControl ?? focusedControl) === "ranked"}
                icon="solar:ranking-bold"
                label="Ranked"
                onBlur={() => setFocusedControl(null)}
                onChange={setIsRanked}
                onFocus={() => setFocusedControl("ranked")}
                onPointerEnter={() => setHoveredControl("ranked")}
              />
            </Item>
            <Item from="up">
              <Toggle
                checked={isPrivate}
                description="Only you see it, and it stays out of your activity"
                disabled={busy !== null}
                highlighted={(hoveredControl ?? focusedControl) === "private"}
                icon="solar:lock-keyhole-bold"
                label="Private"
                onBlur={() => setFocusedControl(null)}
                onChange={setIsPrivate}
                onFocus={() => setFocusedControl("private")}
                onPointerEnter={() => setHoveredControl("private")}
              />
            </Item>
            {canOrder ? (
              <Item from="up">
                <button
                  className={cn(
                    SURFACE_TILE,
                    SURFACE_TILE_END,
                    "group relative isolate w-full cursor-pointer outline-none focus-visible:ring-white/[0.16] disabled:cursor-wait",
                  )}
                  disabled={busy !== null}
                  onBlur={() => setFocusedControl(null)}
                  onClick={() =>
                    void openSurface?.(
                      createListOrderSurfaceEntry({
                        listId: list.id,
                        title: list.title,
                      }),
                    )
                  }
                  onFocus={() => setFocusedControl("film-order")}
                  onPointerEnter={() => setHoveredControl("film-order")}
                  type="button"
                >
                  {(hoveredControl ?? focusedControl) === "film-order" ? (
                    <SlidingHighlight
                      className="rounded-[16px] bg-white/[0.04] ring-1 ring-white/[0.08] ring-inset"
                      layoutId="list-form-control-highlight"
                    />
                  ) : null}
                  <TileMark icon="solar:sort-vertical-bold" />
                  <TileText
                    description="Drag the films into the order you keep them"
                    label="Film order"
                  />
                  <Icon
                    className="center relative z-10 shrink-0 text-white/40 group-hover:translate-x-0.5 group-hover:text-white/70"
                    icon="solar:alt-arrow-right-linear"
                    size={16}
                  />
                </button>
              </Item>
            ) : null}

            <Item className="flex items-center gap-2.5" from="up">
              {list ? (
                <Button
                  className={cn(
                    surfaceButton(false),
                    "min-w-0 flex-1 px-4 disabled:cursor-wait",
                    confirmingDelete &&
                      "bg-red-500/[0.16] text-red-200 ring-red-400/[0.24] hover:bg-red-500/[0.24] hover:text-red-100 hover:ring-red-400/[0.32]",
                  )}
                  disabled={busy !== null}
                  loading={busy === "delete"}
                  onClick={() => void remove()}
                  onPointerEnter={() => setHoveredControl(null)}
                >
                  <Icon icon="solar:trash-bin-trash-bold" size={15} />
                  {confirmingDelete ? "Delete for good" : "Delete"}
                </Button>
              ) : null}
              <Button
                className="ui-sheen center h-10 min-w-0 flex-1 cursor-pointer gap-2 rounded-[16px] bg-white px-4 text-[13px] font-medium text-black [--sheen-ink:0_0_0] [--sheen:0.08] hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!title.trim() || busy !== null}
                loading={busy === "save"}
                onPointerEnter={() => setHoveredControl(null)}
                type="submit"
              >
                {list ? "Save" : "Create list"}
              </Button>
            </Item>
          </Cascade>
        </LayoutGroup>
      </form>
    </SurfaceScene>
  );
}
