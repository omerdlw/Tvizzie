"use client";

import {
  memo,
  useEffect,
  useState,
  type FormEvent,
  type JSX,
  type WheelEvent,
} from "react";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { type SurfaceEntry } from "@omerdlw/base-framework/modules/dock";
import { cn, report, toUserMessage } from "@omerdlw/base-framework/utils";
import {
  LIST_TITLE_MAX,
  type MovieListSummary,
} from "@/features/account/lib/lists";
import {
  createMovieListAction,
  getMovieListsAction,
  setMovieListMembershipAction,
} from "@/features/account/server/list-actions";
import { AdaptiveImage, Button, Icon, Input, Loader } from "@/ui";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import { Cascade, Item } from "../../stage";
import {
  SURFACE_CHECK_ON,
  SURFACE_FIELD,
  SURFACE_LEAD,
  SurfaceScene,
  surfaceIconButton,
  surfaceRow,
} from "../surface";

interface ListPickerData {
  movieId: number;
}

export function createListPickerSurfaceEntry(
  data: ListPickerData,
): SurfaceEntry {
  return {
    component: ListPickerSurface,
    description: "Choose the lists this movie belongs to",
    icon: "solar:folder-open-bold",
    props: { data },
    title: "Your Lists",
  };
}

const STACK = 3;

const ListPreviewStack = memo(function ListPreviewStack({
  list,
}: {
  list: MovieListSummary;
}): JSX.Element {
  const previews = (
    list.previewPosters && list.previewPosters.length > 0
      ? list.previewPosters
      : list.posterPath
        ? [list.posterPath]
        : []
  )
    .filter(Boolean)
    .slice(0, STACK);

  return (
    <div className="relative h-[68px] w-[70px] shrink-0 select-none">
      {Array.from({ length: STACK }, (_, index) => {
        const poster = previews[index];
        const imageSrc = poster
          ? tmdbImageUrl("poster", poster, "original")
          : null;
        const hasCard = Boolean(poster);

        return (
          <div
            key={index}
            className={cn(
              "absolute bottom-0 overflow-hidden rounded-[14px] ring-1 ring-inset",
              hasCard
                ? "bg-black shadow-[0_4px_12px_rgba(0,0,0,0.6)] ring-white/10"
                : "bg-white/5 ring-white/5",
            )}
            style={{
              height: `${68 - index * 6}px`,
              left: `${index * 12}px`,
              opacity: hasCard ? 1 : Math.max(0.2, 0.7 - index * 0.15),
              width: "46px",
              zIndex: STACK - index,
            }}
          >
            {hasCard ? (
              imageSrc ? (
                <AdaptiveImage
                  alt=""
                  className="size-full object-cover select-none pointer-events-none"
                  decoding="async"
                  loading="lazy"
                  mode="img"
                  src={imageSrc}
                  wrapperClassName="size-full bg-white/5"
                />
              ) : (
                <div className="center size-full bg-white/5 text-white/40">
                  <Icon icon="solar:filmstrip-bold" size={14} />
                </div>
              )
            ) : index === 0 && previews.length === 0 ? (
              <div className="center size-full text-white/40">
                <Icon icon="solar:folder-bold" size={18} />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
});

const ListRow = memo(function ListRow({
  inList,
  list,
  onToggle,
  pending,
}: {
  inList: boolean;
  list: MovieListSummary;
  onToggle: () => void;
  pending: boolean;
}): JSX.Element {
  const detail = `${list.itemsCount} ${list.itemsCount === 1 ? "film" : "films"}`;

  return (
    <Button
      aria-pressed={inList}
      className={surfaceRow(inList)}
      disabled={pending}
      onClick={onToggle}
    >
      <ListPreviewStack list={list} />

      <div className="min-w-0 flex-1 py-0.5">
        <p className="truncate text-base font-semibold text-white">
          {list.title}
        </p>
        {list.description ? (
          <p className="line-clamp-2 mt-0.5 text-xs text-white/70">
            {list.description}
          </p>
        ) : null}
        <div className="mt-1 flex items-center gap-1.5 text-xs text-white/50">
          {list.isPrivate ? (
            <span className="flex items-center gap-1 text-white/50">
              <Icon icon="solar:lock-bold" size={12} />
              <span>Private</span>
              <span>•</span>
            </span>
          ) : null}
          <span>{detail}</span>
        </div>
      </div>

      <span
        className={cn(
          "cine-fade center size-[22px] shrink-0 rounded-lg ring-1 ring-inset",
          inList
            ? SURFACE_CHECK_ON
            : "text-transparent ring-white/10 group-hover:ring-white/30",
        )}
      >
        {pending ? (
          <Loader size={16} />
        ) : (
          <Icon icon="material-symbols:check-rounded" size={16} />
        )}
      </span>
    </Button>
  );
});

function LoadingListSkeleton(): JSX.Element {
  return (
    <div className="flex w-full flex-col gap-3">
      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={index}
          className="flex h-[84px] w-full animate-skeleton-pulse items-center gap-3 rounded-[20px] bg-white/5 p-2 ring-1 ring-white/5 ring-inset"
        >
          <div className="relative h-[68px] w-[70px] shrink-0">
            {Array.from({ length: STACK }, (_, stackIndex) => (
              <div
                key={stackIndex}
                className="absolute bottom-0 overflow-hidden rounded-[14px] bg-white/10 ring-1 ring-white/5 ring-inset"
                style={{
                  height: `${68 - stackIndex * 6}px`,
                  left: `${stackIndex * 12}px`,
                  opacity: 1 - stackIndex * 0.22,
                  width: "46px",
                  zIndex: STACK - stackIndex,
                }}
              />
            ))}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="skeleton-block h-3.5 w-3/5 rounded-full" />
            <div className="skeleton-block-soft h-2.5 w-2/5 rounded-full" />
          </div>
          <div className="skeleton-block-soft size-[22px] shrink-0 rounded-lg ring-1 ring-white/5 ring-inset" />
        </div>
      ))}
    </div>
  );
}

function handleListWheel(event: WheelEvent<HTMLDivElement>) {
  const listViewport = event.currentTarget;
  if (!listViewport || listViewport.scrollHeight <= listViewport.clientHeight)
    return;
  event.preventDefault();
  event.stopPropagation();
  const maxScrollTop = listViewport.scrollHeight - listViewport.clientHeight;
  listViewport.scrollTop = Math.min(
    maxScrollTop,
    Math.max(0, listViewport.scrollTop + event.deltaY),
  );
}

function ListPickerSurface({ data }: { data: ListPickerData }): JSX.Element {
  const toast = useToast();
  const movieId = data.movieId;

  const [lists, setLists] = useState<MovieListSummary[]>([]);
  const [inLists, setInLists] = useState<ReadonlySet<string>>(new Set());
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [title, setTitle] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMovieListsAction(movieId)
      .then((result) => {
        if (cancelled) return;
        if (result.success) {
          setLists(result.lists);
          setInLists(new Set(result.memberships));
          setStatus("ready");
        } else {
          setStatus("error");
          toast(result.error);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        report("ListPickerSurface load", error);
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [movieId, toast]);

  const mark = (listId: string, on: boolean) =>
    setPending((current) => {
      const next = new Set(current);
      if (on) next.add(listId);
      else next.delete(listId);
      return next;
    });

  const remember = (list: MovieListSummary, inList: boolean) => {
    setLists((current) =>
      current.some((item) => item.id === list.id)
        ? current.map((item) => (item.id === list.id ? list : item))
        : [list, ...current],
    );
    setInLists((current) => {
      const next = new Set(current);
      if (inList) next.add(list.id);
      else next.delete(list.id);
      return next;
    });
  };

  async function toggle(list: MovieListSummary) {
    if (pending.has(list.id)) return;
    const active = !inLists.has(list.id);
    mark(list.id, true);
    try {
      const result = await setMovieListMembershipAction(
        movieId,
        list.id,
        active,
      );
      if (result.success) remember(result.list, result.inList);
      else toast(result.error);
    } catch (error) {
      report("ListPickerSurface toggle", error);
      toast(toUserMessage(error, { fallback: "Could not update your list" }));
    } finally {
      mark(list.id, false);
    }
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    const name = title.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const result = await createMovieListAction(movieId, name, isPrivate);
      if (result.success) {
        remember(result.list, result.inList);
        setTitle("");
      } else {
        toast(result.error);
      }
    } catch (error) {
      report("ListPickerSurface create", error);
      toast(toUserMessage(error, { fallback: "Could not create your list" }));
    } finally {
      setCreating(false);
    }
  }

  return (
    <SurfaceScene>
      <Cascade className="flex w-full flex-col gap-3" lead={SURFACE_LEAD}>
        <Item from="up">
          <form className="flex items-center gap-3" onSubmit={create}>
            <Input
              aria-label="New list name"
              className={`${SURFACE_FIELD} h-10 min-w-0 flex-1 px-4 text-sm`}
              disabled={creating}
              maxLength={LIST_TITLE_MAX}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="New list"
              value={title}
            />
            <Button
              aria-label={isPrivate ? "Private list" : "Public list"}
              aria-pressed={isPrivate}
              className={surfaceIconButton(isPrivate)}
              onClick={() => setIsPrivate((current) => !current)}
            >
              <Icon
                icon={
                  isPrivate ? "solar:lock-bold" : "solar:lock-unlocked-linear"
                }
                size={16}
              />
            </Button>
            <Button
              aria-label="Create list and add this movie"
              className={surfaceIconButton(Boolean(title.trim()))}
              disabled={!title.trim()}
              loading={creating}
              type="submit"
            >
              <Icon icon="solar:add-circle-bold" size={18} />
            </Button>
          </form>
        </Item>

        <div
          className="flex max-h-[min(56dvh,26rem)] flex-col overflow-y-auto overscroll-contain scrollbar-none"
          data-lenis-prevent
          data-lenis-prevent-wheel
          onWheel={handleListWheel}
        >
          {status === "loading" ? (
            <LoadingListSkeleton />
          ) : status === "error" ? (
            <div className="center min-h-40 flex-col gap-1.5 text-center">
              <div className="center size-10 rounded-full bg-white/5 text-white/50">
                <Icon icon="solar:danger-circle-bold" size={20} />
              </div>
              <p className="text-sm text-white/70">
                Your lists could not be loaded
              </p>
            </div>
          ) : lists.length === 0 ? (
            <div className="center min-h-40 flex-col gap-2 py-6 text-center">
              <div className="center size-12 rounded-[20px] bg-white/5 text-white/40 ring-1 ring-white/10 ring-inset">
                <Icon icon="solar:folder-open-bold" size={22} />
              </div>
              <div className="flex flex-col gap-0.5">
                <p className="text-xs font-bold tracking-wider text-white/70 uppercase">
                  No lists yet
                </p>
                <p className="text-xs text-white/50">
                  Name one above to start it with this movie
                </p>
              </div>
            </div>
          ) : (
            <Cascade
              className="flex flex-col gap-3"
              key="rows"
              lead={SURFACE_LEAD}
            >
              {lists.map((list) => (
                <Item from="up" key={list.id}>
                  <ListRow
                    inList={inLists.has(list.id)}
                    list={list}
                    onToggle={() => void toggle(list)}
                    pending={pending.has(list.id)}
                  />
                </Item>
              ))}
            </Cascade>
          )}
        </div>
      </Cascade>
    </SurfaceScene>
  );
}
