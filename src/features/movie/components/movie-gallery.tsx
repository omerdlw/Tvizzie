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

type Tab = "backdrops" | "posters";

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
};

const ORDER: readonly Tab[] = ["backdrops", "posters"];

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
  return {
    src: tmdbImageUrl("poster", path, "w342"),
    srcSet: tmdbImageSrcSet("poster", path, ["w185", "w342", "w500"]),
  };
}

function original(tab: Tab, path: string) {
  return tab === "backdrops"
    ? tmdbImageUrl("backdrop", path, "original")
    : tmdbImageUrl("poster", path, "original");
}

export function MovieGallery({
  backdrops,
  posters,
  title,
}: {
  backdrops: MovieImage[];
  posters: MovieImage[];
  title: string;
}) {
  const [openImage] = useModal(ImageModal);
  const { setLead } = useRoom();
  useEffect(() => () => setLead(null), [setLead]);
  const sets: Record<Tab, MovieImage[]> = { backdrops, posters };
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
            if (event.pointerType !== "mouse") return;
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
