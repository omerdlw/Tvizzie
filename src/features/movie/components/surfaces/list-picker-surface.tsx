"use client";

import {
  memo,
  useEffect,
  useId,
  useState,
  type CSSProperties,
  type FormEvent,
  type JSX,
} from "react";
import { LayoutGroup } from "motion/react";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { type SurfaceEntry } from "@omerdlw/base-framework/modules/dock";
import { cn, report, toUserMessage } from "@omerdlw/base-framework/utils";
import {
  LIST_TITLE_MAX,
  type MovieListSummary,
  createMovieListAction,
  getMovieListsAction,
  setMovieListMembershipAction,
} from "@/features/account";
import {
  AdaptiveImage,
  Button,
  Icon,
  Input,
  Loader,
  SURFACE_CHECK_ON,
  SURFACE_FIELD,
  SURFACE_META,
  SURFACE_SCROLL,
  SURFACE_STACK,
  SURFACE_TEXT,
  SURFACE_TILE,
  SURFACE_TILE_END,
  SURFACE_TILE_INNER,
  SURFACE_TITLE,
  surfaceIconButton,
  surfaceRow,
  scrollWithin,
} from "@/ui";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import { Cascade, Item, SURFACE_LEAD, SurfaceScene } from "@/motion/stage";
import { SlidingHighlight } from "@/ui/sliding-highlight";

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
const PEEK = 6;
const STEP = 8;
const STACK_WIDTH = 40 + PEEK * (STACK - 1);

function stackCard(index: number): CSSProperties {
  const height = 60 - index * STEP;
  return {
    height: `${height}px`,
    left: `${index * PEEK}px`,
    top: `${(60 - height) / 2}px`,
    width: "40px",
    zIndex: STACK - index,
  };
}

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
    <div
      className="relative z-10 h-[60px] shrink-0 select-none"
      style={{ width: `${STACK_WIDTH}px` }}
    >
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
              "absolute overflow-hidden ring-1 ring-inset",
              SURFACE_TILE_INNER,
              hasCard
                ? "bg-black shadow-[0_4px_12px_rgba(0,0,0,0.6)] ring-white/10"
                : "bg-white/5 ring-white/5",
            )}
            style={{
              ...stackCard(index),
              opacity: hasCard ? 1 : Math.max(0.2, 0.7 - index * 0.15),
            }}
          >
            {hasCard ? (
              imageSrc ? (
                <AdaptiveImage
                  alt=""
                  className="size-full object-cover select-none pointer-events-none"
                  decoding="async"
                  loading="lazy"
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
  highlighted,
  list,
  onFocus,
  onPointerEnter,
  onToggle,
  pending,
}: {
  inList: boolean;
  highlighted: boolean;
  list: MovieListSummary;
  onFocus: () => void;
  onPointerEnter: () => void;
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
      onFocus={onFocus}
      onPointerEnter={onPointerEnter}
    >
      {highlighted ? (
        <SlidingHighlight
          className="rounded-[16px] bg-white/[0.04] ring-1 ring-white/[0.08] ring-inset"
          layoutId="list-picker-highlight"
        />
      ) : null}
      <ListPreviewStack list={list} />

      <div className={cn(SURFACE_TEXT, "relative z-10")}>
        <p className={SURFACE_TITLE}>{list.title}</p>
        {list.description ? (
          <p className={cn(SURFACE_META, "text-white/70")}>
            {list.description}
          </p>
        ) : null}
        <p className={cn(SURFACE_META, "flex items-center gap-1.5")}>
          {list.isPrivate ? (
            <>
              <Icon icon="solar:lock-bold" size={12} />
              <span>Private</span>
              <span aria-hidden="true">·</span>
            </>
          ) : null}
          <span>{detail}</span>
        </p>
      </div>

      <span
        className={cn(
          "center relative z-10 size-6 shrink-0 rounded-full ring-1 ring-inset",
          inList
            ? SURFACE_CHECK_ON
            : "text-transparent ring-white/10 group-hover:text-white/30 group-hover:ring-white/20",
        )}
      >
        {pending ? (
          <Loader />
        ) : (
          <Icon
            className={cn(
              "ui-glyph center",
              inList ? "scale-100" : "scale-75 group-hover:scale-90",
            )}
            icon="material-symbols:check-rounded"
            size={16}
          />
        )}
      </span>
    </Button>
  );
});

function LoadingListSkeleton(): JSX.Element {
  return (
    <div className="flex w-full flex-col gap-2.5">
      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={index}
          className={cn(
            SURFACE_TILE,
            SURFACE_TILE_END,
            "w-full animate-skeleton-pulse",
          )}
        >
          <div
            className="relative h-[60px] shrink-0"
            style={{ width: `${STACK_WIDTH}px` }}
          >
            {Array.from({ length: STACK }, (_, stackIndex) => (
              <div
                key={stackIndex}
                className={cn(
                  "absolute overflow-hidden bg-white/10 ring-1 ring-white/5 ring-inset",
                  SURFACE_TILE_INNER,
                )}
                style={{
                  ...stackCard(stackIndex),
                  opacity: 1 - stackIndex * 0.22,
                }}
              />
            ))}
          </div>
          <div className={SURFACE_TEXT}>
            <div className="skeleton-block h-3.5 w-3/5 rounded-full" />
            <div className="skeleton-block-soft h-2.5 w-2/5 rounded-full" />
          </div>
          <div className="skeleton-block-soft size-6 shrink-0 rounded-full ring-1 ring-white/5 ring-inset" />
        </div>
      ))}
    </div>
  );
}

function ListPickerSurface({ data }: { data: ListPickerData }): JSX.Element {
  const toast = useToast();
  const movieId = data.movieId;
  const highlightGroupId = useId();

  const [lists, setLists] = useState<MovieListSummary[]>([]);
  const [inLists, setInLists] = useState<ReadonlySet<string>>(new Set());
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [title, setTitle] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [hoveredList, setHoveredList] = useState<string | null>(null);
  const [focusedList, setFocusedList] = useState<string | null>(null);
  const activeList = hoveredList ?? focusedList;

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
      <Cascade className={SURFACE_STACK} lead={SURFACE_LEAD}>
        <Item from="up">
          <form className="flex items-center gap-2.5" onSubmit={create}>
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
          className={cn(
            SURFACE_SCROLL,
            "flex max-h-[min(56dvh,26rem)] flex-col",
          )}
          data-lenis-prevent
          data-lenis-prevent-wheel
          onBlurCapture={(event) => {
            if (
              !event.currentTarget.contains(event.relatedTarget as Node | null)
            ) {
              setFocusedList(null);
            }
          }}
          onPointerLeave={() => setHoveredList(null)}
          onWheel={scrollWithin}
        >
          {status === "loading" ? (
            <LoadingListSkeleton />
          ) : status === "error" ? (
            <div className="center min-h-40 flex-col gap-1.5 text-center">
              <div className="center size-10 rounded-full bg-white/[0.06] text-white/50">
                <Icon icon="solar:danger-circle-bold" size={20} />
              </div>
              <p className="text-sm text-white/70">
                Your lists could not be loaded
              </p>
            </div>
          ) : lists.length === 0 ? (
            <div className="center min-h-40 flex-col gap-2 py-6 text-center">
              <div className="center size-12 rounded-full bg-white/[0.06] text-white/40 ring-1 ring-white/[0.08] ring-inset">
                <Icon icon="solar:folder-open-bold" size={22} />
              </div>
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium text-white/80">
                  No lists yet
                </p>
                <p className="text-xs text-white/50">
                  Name one above to start it with this movie
                </p>
              </div>
            </div>
          ) : (
            <LayoutGroup id={`list-picker-${highlightGroupId}`}>
              <Cascade
                className="flex flex-col gap-2.5"
                key="rows"
                lead={SURFACE_LEAD}
              >
                {lists.map((list) => (
                  <Item from="up" key={list.id}>
                    <ListRow
                      highlighted={activeList === list.id}
                      inList={inLists.has(list.id)}
                      list={list}
                      onFocus={() => setFocusedList(list.id)}
                      onPointerEnter={() => setHoveredList(list.id)}
                      onToggle={() => void toggle(list)}
                      pending={pending.has(list.id)}
                    />
                  </Item>
                ))}
              </Cascade>
            </LayoutGroup>
          )}
        </div>
      </Cascade>
    </SurfaceScene>
  );
}
