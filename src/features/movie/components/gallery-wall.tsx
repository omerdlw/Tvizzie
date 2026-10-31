"use client";

import { useEffect, useRef, useState } from "react";
import { useModal } from "@omerdlw/base-framework/modules/modal";
import { cn } from "@omerdlw/base-framework/utils";
import { artworkTarget } from "@/features/artwork";
import { Icon, MediaCard, SegmentedControl, TONE, Tooltip } from "@/ui";
import type { MediaCardAspect } from "@/ui";
import {
  GRAMMAR,
  Header,
  Section,
  Swap,
  Tile,
  useRoom,
  useWall,
} from "@/motion/stage";
import { ImageModal, type ImageModalData } from "./movie-modals";

export interface WallPicture {
  crossOrigin?: "anonymous";
  full: string | null;
  lead: string | null;
  path: string;
  sizes?: string;
  src: string | null;
  srcSet?: string;
}

export interface WallSet {
  aspect: MediaCardAspect;
  key: string;
  label: string;
  noun: string;
  pictures: WallPicture[];
  slot: "backdrop" | "poster";
}

const STRETCH = 30;

const GRID: Record<MediaCardAspect, string> = {
  free: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  poster: "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 2xl:grid-cols-8",
  square: "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6",
  video: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4",
};

export const WALL_SIZES: Record<"poster" | "video", string> = {
  poster:
    "(min-width: 1536px) 12vw, (min-width: 1024px) 16vw, (min-width: 640px) 25vw, 33vw",
  video:
    "(min-width: 1536px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
};

const CONTROL = `cine-press center h-8 cursor-pointer gap-2 rounded-full ${TONE.surface} focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-white/20`;

export function WallButton({ set }: { set: string }) {
  const wall = useWall();
  const button = useRef<HTMLButtonElement>(null);
  if (!wall) return null;
  return (
    <Tooltip position="top" text="See the whole gallery">
      <button
        aria-label="See the whole gallery"
        className={cn(CONTROL, "w-8")}
        onClick={() =>
          wall.open(set, button.current?.closest("section") ?? null)
        }
        ref={button}
        type="button"
      >
        <Icon icon="solar:widget-4-linear" size={16} />
      </button>
    </Tooltip>
  );
}

export function GalleryWall({
  back,
  sets,
  title,
}: {
  back: string;
  sets: WallSet[];
  title: string;
}) {
  const wall = useWall();
  const [openImage] = useModal(ImageModal);
  const { setLead } = useRoom();
  const [chosen, setChosen] = useState(wall?.set ?? sets[0]?.key);
  const [reach, setReach] = useState(STRETCH);
  const end = useRef<HTMLDivElement>(null);
  const shown = sets.find((item) => item.key === chosen) ?? sets[0];
  const total = shown?.pictures.length ?? 0;

  useEffect(() => () => setLead(null), [setLead]);

  useEffect(() => {
    const element = end.current;
    if (!element || reach >= total) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setReach((count) => count + STRETCH);
      },
      { rootMargin: "0px 0px 100% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [reach, total]);

  if (!shown) return null;

  const choose = (key: string) => {
    setChosen(key);
    setReach(STRETCH);
  };

  const open = (picture: WallPicture, index: number) => {
    if (!picture.full) return;
    const data: ImageModalData = {
      alt: `${shown.noun[0].toUpperCase()}${shown.noun.slice(1)} ${index + 1} of ${title}`,
      src: picture.full,
    };
    void openImage(data);
  };

  return (
    <div className="mx-auto w-full max-w-[100rem] px-4 pt-16 sm:px-6 sm:pt-20 lg:px-8">
      <Section className="flex w-full flex-col">
        <Header
          actions={
            <div className="flex items-center gap-2">
              {sets.length > 1 ? (
                <SegmentedControl
                  ariaLabel="Gallery images"
                  className={TONE.tabs}
                  items={sets.map((item) => ({
                    key: item.key,
                    label: `${item.label} ${item.pictures.length}`,
                  }))}
                  onChange={choose}
                  value={shown.key}
                />
              ) : null}
              <button
                className={cn(CONTROL, `px-3 ${TONE.label}`)}
                onClick={() => wall?.close()}
                type="button"
              >
                <Icon icon="solar:close-circle-linear" size={14} />
                {back}
              </button>
            </div>
          }
          icon="solar:gallery-wide-bold"
          title={`${title} · Gallery`}
        />
        <Swap gap={GRAMMAR.wall.gap} id={shown.key}>
          <div
            className={cn("grid gap-3", GRID[shown.aspect])}
            onPointerLeave={() => setLead(null)}
            onPointerOver={(event) => {
              if (event.pointerType !== "mouse") return;
              const card = (event.target as Element).closest("[data-still]");
              const index = Number(card?.getAttribute("data-still"));
              const picture = Number.isInteger(index)
                ? shown.pictures[index]
                : undefined;
              setLead(picture?.lead ?? null);
            }}
          >
            {shown.pictures.slice(0, reach).map((picture, index) => (
              <Tile key={picture.path} radius={16}>
                <MediaCard
                  {...artworkTarget(shown.slot, picture.path)}
                  aspect={shown.aspect}
                  data-still={String(index)}
                  image={{
                    crossOrigin: picture.crossOrigin,
                    sizes: picture.sizes,
                    src: picture.src,
                    srcSet: picture.srcSet,
                  }}
                  label={`View ${shown.noun} ${index + 1} of ${title}`}
                  onClick={() => open(picture, index)}
                />
              </Tile>
            ))}
          </div>
        </Swap>
        <div aria-hidden="true" className="h-px" ref={end} />
      </Section>
    </div>
  );
}
