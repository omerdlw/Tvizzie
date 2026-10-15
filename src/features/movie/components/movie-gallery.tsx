"use client";

import { useEffect, useState } from "react";
import { useModal } from "@omerdlw/base-framework/modules/modal";
import { artworkTarget } from "@/features/artwork";
import { MediaCard, SegmentedControl } from "@/ui";
import type { MediaCardAspect } from "@/ui";
import { tmdbImageSrcSet, tmdbImageUrl } from "@/infrastructure/tmdb/images";
import type { MovieImage } from "@/infrastructure/tmdb/types";
import { GALLERY_BACKDROP_ITEM, POSTER_ROW_ITEM } from "../lib/layout";
import { Carousel, Header, Section, Swap, useRoom } from "../stage";
import { ImageModal, type ImageModalData } from "./movie-modals";

type Tab = "backdrops" | "logos" | "posters";

const TABS: Record<
  Tab,
  {
    aspect: MediaCardAspect;
    item: string;
    label: string;
    noun: string;
    sizes: string;
  }
> = {
  backdrops: {
    aspect: "video",
    item: GALLERY_BACKDROP_ITEM,
    label: "Backdrops",
    noun: "scene",
    sizes: "(min-width: 1280px) 330px, (min-width: 640px) 50vw, 100vw",
  },
  posters: {
    aspect: "poster",
    item: POSTER_ROW_ITEM,
    label: "Posters",
    noun: "poster",
    sizes: "(min-width: 768px) 160px, 30vw",
  },
  logos: {
    aspect: "video",
    item: "w-[calc((100%-0.75rem)/2)] md:w-[calc((100%-1.5rem)/3)]",
    label: "Logos",
    noun: "logo",
    sizes: "(min-width: 768px) 220px, 50vw",
  },
};

const ORDER: readonly Tab[] = ["backdrops", "posters", "logos"];

// A row holds every picture TMDB keeps, which runs to hundreds of posters; it
// is laid out a stretch at a time as the strip nears its end.
const STRETCH = 18;

// The strip shows each still at its card's size; the full picture is fetched
// only when one is opened. Decoding originals as they scrolled in stalled
// whole frames.
function thumbnail(tab: Tab, path: string) {
  if (tab === "backdrops") {
    return {
      src: tmdbImageUrl("backdrop", path, "w780"),
      srcSet: tmdbImageSrcSet("backdrop", path, ["w300", "w780", "w1280"]),
    };
  }
  if (tab === "posters") {
    return {
      src: tmdbImageUrl("poster", path, "w342"),
      srcSet: tmdbImageSrcSet("poster", path, ["w185", "w342", "w500"]),
    };
  }
  return {
    src: tmdbImageUrl("logo", path, "w500"),
    srcSet: tmdbImageSrcSet("logo", path, ["w300", "w500"]),
  };
}

function original(tab: Tab, path: string) {
  if (tab === "backdrops") return tmdbImageUrl("backdrop", path, "original");
  if (tab === "posters") return tmdbImageUrl("poster", path, "original");
  return tmdbImageUrl("logo", path, "original");
}

// A logo is a title cut out of its picture: it is set whole on the card, never
// cropped, and edged in light so a dark one still reads on the dark room.
function LogoCard({
  label,
  onOpen,
  path,
  sizes,
}: {
  label: string;
  onOpen: () => void;
  path: string;
  sizes: string;
}) {
  const shown = thumbnail("logos", path);
  return (
    <button
      aria-label={label}
      className="cine-card group/media flex w-full min-w-0 cursor-pointer flex-col text-left outline-none"
      data-cursor="card"
      onClick={onOpen}
      style={{ borderRadius: 20 }}
      type="button"
    >
      <div
        className="cine-fade relative isolate aspect-video w-full overflow-hidden bg-white/[0.06] ring-1 ring-white/5 ring-inset group-hover/media:ring-white/50 group-focus-visible/media:ring-white/50"
        style={{ borderRadius: 20 }}
      >
        {shown.src ? (
          <img
            alt=""
            className="cine-zoom absolute inset-0 size-full object-contain p-[14%] [filter:drop-shadow(0_0_0.6px_rgb(255_255_255/0.55))_drop-shadow(0_6px_18px_rgb(0_0_0/0.45))]"
            decoding="async"
            loading="lazy"
            sizes={sizes}
            src={shown.src}
            srcSet={shown.srcSet ?? undefined}
          />
        ) : null}
      </div>
    </button>
  );
}

export function MovieGallery({
  backdrops,
  logos,
  posters,
  title,
}: {
  backdrops: MovieImage[];
  logos: MovieImage[];
  posters: MovieImage[];
  title: string;
}) {
  const [openImage] = useModal(ImageModal);
  const { setLead } = useRoom();
  useEffect(() => () => setLead(null), [setLead]);
  const sets: Record<Tab, MovieImage[]> = { backdrops, logos, posters };
  const available = ORDER.filter((key) => sets[key].length > 0);
  const [tab, setTab] = useState<Tab>(available[0] ?? "backdrops");
  const [reach, setReach] = useState(STRETCH);
  const key = available.includes(tab) ? tab : available[0];
  const total = key ? sets[key].length : 0;
  const more = () =>
    setReach((count) => (count < total ? count + STRETCH : count));
  if (!key) return null;

  const images = sets[key].slice(0, reach);
  const view = TABS[key];
  const choose = (next: Tab) => {
    setTab(next);
    setReach(STRETCH);
  };

  const open = (path: string, index: number) => {
    const full = original(key, path);
    if (!full) return;
    const data: ImageModalData = {
      alt: `${view.noun[0].toUpperCase()}${view.noun.slice(1)} ${index + 1} of ${title}`,
      src: full,
    };
    void openImage(data as unknown as Record<string, unknown>);
  };

  return (
    <Section className="flex w-full flex-col">
      <Header
        actions={
          available.length > 1 ? (
            <SegmentedControl
              ariaLabel="Gallery images"
              items={available.map((itemKey) => ({
                key: itemKey,
                label: `${TABS[itemKey].label} ${sets[itemKey].length}`,
              }))}
              onChange={choose}
              value={key}
            />
          ) : undefined
        }
        icon="solar:gallery-wide-bold"
        title="Gallery"
      />
      {/* Lingering over a still lets its light into the room. */}
      <Swap id={key}>
        <div
          onPointerLeave={() => setLead(null)}
          onPointerOver={(event) => {
            if (event.pointerType !== "mouse" || key === "logos") return;
            const card = (event.target as Element).closest("[data-still]");
            const still = card?.getAttribute("data-still");
            const slot = key === "backdrops" ? "backdrop" : "poster";
            setLead(still ? tmdbImageUrl(slot, still, "w300") : null);
          }}
        >
          <Carousel
            itemClassName={
              key === "backdrops" && total === 1 ? "w-full" : view.item
            }
            label={view.label}
            onNearEnd={more}
          >
            {images.map((image, index) => {
              const label = `View ${view.noun} ${index + 1} of ${title}`;
              if (key === "logos") {
                return (
                  <LogoCard
                    key={image.filePath}
                    label={label}
                    onOpen={() => open(image.filePath, index)}
                    path={image.filePath}
                    sizes={view.sizes}
                  />
                );
              }
              const shown = thumbnail(key, image.filePath);
              return (
                <MediaCard
                  key={image.filePath}
                  {...artworkTarget(
                    key === "backdrops" ? "backdrop" : "poster",
                    image.filePath,
                  )}
                  aspect={view.aspect}
                  data-still={image.filePath}
                  image={{
                    sizes: view.sizes,
                    src: shown.src,
                    srcSet: shown.srcSet ?? undefined,
                  }}
                  label={label}
                  onClick={() => open(image.filePath, index)}
                />
              );
            })}
          </Carousel>
        </div>
      </Swap>
    </Section>
  );
}
