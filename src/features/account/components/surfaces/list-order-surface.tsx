"use client";

import { memo, useEffect, useState, type JSX, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Reorder, useDragControls } from "motion/react";
import {
  useDockActions,
  type SurfaceEntry,
} from "@omerdlw/base-framework/modules/dock";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { cn, report, toUserMessage } from "@omerdlw/base-framework/utils";
import {
  AdaptiveImage,
  Button,
  Icon,
  Loader,
  scrollWithin,
  SURFACE_META,
  SURFACE_PANEL,
  SURFACE_POSTER,
  SURFACE_SCROLL,
  SURFACE_STACK,
  SURFACE_TEXT,
  SURFACE_TILE,
  SURFACE_TILE_INNER,
  SURFACE_TITLE,
  surfaceButton,
} from "@/ui";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import { Cascade, Item, SURFACE_LEAD, SurfaceScene } from "@/motion/stage";
import {
  getListOrderAction,
  reorderListAction,
  type ListOrderItem,
} from "../../server/browse-actions";

interface ListOrderData {
  listId: string;
  title: string;
}

export function createListOrderSurfaceEntry(data: ListOrderData): SurfaceEntry {
  return {
    component: ListOrderSurface,
    description: data.title,
    icon: "solar:sort-vertical-bold",
    props: { data },
    title: "Film Order",
  };
}

const OrderRow = memo(function OrderRow({
  index,
  item,
  onMove,
  total,
}: {
  index: number;
  item: ListOrderItem;
  onMove: (from: number, to: number) => void;
  total: number;
}): JSX.Element {
  const controls = useDragControls();
  const [dragging, setDragging] = useState(false);
  const poster = item.posterPath
    ? tmdbImageUrl("poster", item.posterPath, "w92")
    : null;

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const to =
      event.key === "ArrowUp"
        ? index - 1
        : event.key === "ArrowDown"
          ? index + 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? total - 1
              : null;
    if (to === null) return;
    event.preventDefault();
    if (to >= 0 && to < total && to !== index) onMove(index, to);
  }

  return (
    <Reorder.Item
      as="li"
      className={cn(
        SURFACE_TILE,
        "relative pr-1.5 transition-[background-color,box-shadow] duration-slow",
        dragging
          ? "z-10 bg-white/[0.12] shadow-[0_18px_40px_-16px_rgb(0_0_0/0.9)] ring-white/[0.1]"
          : "hover:bg-white/10 hover:ring-white/[0.08]",
      )}
      dragControls={controls}
      dragListener={false}
      onDragEnd={() => setDragging(false)}
      onDragStart={() => setDragging(true)}
      value={item}
    >
      <span className="w-7 shrink-0 text-center text-xs font-medium text-white/40 tabular-nums">
        {index + 1}
      </span>
      <div
        className={cn(
          SURFACE_POSTER,
          "bg-white/5 ring-1 ring-white/[0.06] ring-inset",
          SURFACE_TILE_INNER,
        )}
      >
        {poster ? (
          <AdaptiveImage
            alt=""
            className="pointer-events-none size-full object-cover select-none"
            decoding="async"
            draggable={false}
            loading="lazy"
            src={poster}
            wrapperClassName="size-full"
          />
        ) : (
          <div className="center size-full text-white/40">
            <Icon icon="solar:filmstrip-bold" size={14} />
          </div>
        )}
      </div>
      <div className={cn(SURFACE_TEXT, "select-none")}>
        <span className={SURFACE_TITLE}>{item.title}</span>
        {item.year ? (
          <span className={cn(SURFACE_META, "tabular-nums")}>{item.year}</span>
        ) : null}
      </div>
      <button
        aria-label={`Move ${item.title}, place ${index + 1} of ${total}`}
        className={cn(
          "center size-10 shrink-0 cursor-grab touch-none text-white/40 outline-none hover:bg-white/[0.06] hover:text-white/80 focus-visible:bg-white/[0.08] focus-visible:text-white active:cursor-grabbing",
          SURFACE_TILE_INNER,
        )}
        onKeyDown={onKeyDown}
        onPointerDown={(event) => {
          event.preventDefault();
          controls.start(event);
        }}
        type="button"
      >
        <Icon icon="solar:hamburger-menu-linear" size={18} />
      </button>
    </Reorder.Item>
  );
});

function ListOrderSurface({ data }: { data: ListOrderData }): JSX.Element {
  const router = useRouter();
  const toast = useToast();
  const { closeAllSurfaces } = useDockActions();
  const [saved, setSaved] = useState<ListOrderItem[] | null>(null);
  const [order, setOrder] = useState<ListOrderItem[]>([]);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;
    getListOrderAction(data.listId)
      .then((result) => {
        if (!live) return;
        if (!result.success) {
          setFailed(true);
          toast(result.error);
          return;
        }
        setSaved(result.items);
        setOrder(result.items);
      })
      .catch((error) => {
        report("ListOrderSurface read", error);
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [data.listId, toast]);

  const changed =
    saved !== null &&
    order.some((item, index) => item.tmdbId !== saved[index]?.tmdbId);

  function move(from: number, to: number) {
    setOrder((current) => {
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  async function save() {
    if (!changed || saving) return;
    setSaving(true);
    try {
      const result = await reorderListAction(
        data.listId,
        order.map((item) => item.tmdbId),
      );
      if (!result.success) {
        toast(result.error);
        return;
      }
      closeAllSurfaces?.();
      router.refresh();
    } catch (error) {
      report("ListOrderSurface save", error);
      toast(toUserMessage(error, { fallback: "Could not save the new order" }));
    } finally {
      setSaving(false);
    }
  }

  if (failed || saved === null) {
    return (
      <div className={cn(SURFACE_PANEL, "center min-h-40 flex-col gap-2 p-4")}>
        {failed ? (
          <p className="text-sm text-white/60">This list could not be loaded</p>
        ) : (
          <Loader />
        )}
      </div>
    );
  }

  return (
    <SurfaceScene>
      <Cascade className={SURFACE_STACK} lead={SURFACE_LEAD}>
        <Item from="up">
          <Reorder.Group
            axis="y"
            className={cn(
              SURFACE_SCROLL,
              "flex max-h-[min(56dvh,28rem)] flex-col gap-2.5",
            )}
            data-lenis-prevent
            data-lenis-prevent-wheel
            layoutScroll
            onReorder={setOrder}
            onWheel={scrollWithin}
            values={order}
          >
            {order.map((item, index) => (
              <OrderRow
                index={index}
                item={item}
                key={item.tmdbId}
                onMove={move}
                total={order.length}
              />
            ))}
          </Reorder.Group>
        </Item>
        <Item className="flex items-center gap-2.5" from="up">
          <Button
            className={cn(surfaceButton(false), "min-w-0 flex-1 px-4")}
            disabled={!changed || saving}
            onClick={() => setOrder(saved)}
          >
            <Icon icon="solar:restart-linear" size={15} />
            Undo changes
          </Button>
          <Button
            className="ui-sheen center h-10 min-w-0 flex-1 cursor-pointer gap-2 rounded-[16px] bg-white px-4 text-[13px] font-medium text-black [--sheen-ink:0_0_0] [--sheen:0.08] hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!changed || saving}
            loading={saving}
            onClick={() => void save()}
          >
            Save order
          </Button>
        </Item>
      </Cascade>
    </SurfaceScene>
  );
}
