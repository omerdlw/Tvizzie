"use client";

import { useState } from "react";
import { useModal } from "@omerdlw/base-framework/modules/modal";
import { artworkTarget } from "@/features/artwork";
import { MediaCard, SegmentedControl } from "@/ui";
import type { MediaCardAspect } from "@/ui";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import type { MovieImage } from "@/infrastructure/tmdb/types";
import { GALLERY_BACKDROP_ITEM, POSTER_ROW_ITEM } from "../lib/layout";
import { Carousel, Header, Section, Swap } from "../stage";
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
    slot: "backdrop" | "poster";
  }
> = {
  backdrops: {
    aspect: "video",
    item: GALLERY_BACKDROP_ITEM,
    label: "Backdrops",
    noun: "scene",
    sizes: "(min-width: 1280px) 330px, (min-width: 640px) 50vw, 100vw",
    slot: "backdrop",
  },
  posters: {
    aspect: "poster",
    item: POSTER_ROW_ITEM,
    label: "Posters",
    noun: "poster",
    sizes: "(min-width: 768px) 160px, 30vw",
    slot: "poster",
  },
};

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
  const available = (
    [
      ["backdrops", backdrops],
      ["posters", posters],
    ] as const
  ).filter(([, images]) => images.length > 0);
  const [tab, setTab] = useState<Tab>(available[0]?.[0] ?? "backdrops");
  if (available.length === 0) return null;

  const active = available.find(([key]) => key === tab) ?? available[0];
  const [key, images] = active;
  const view = TABS[key];

  return (
    <Section className="flex w-full flex-col">
      <Header
        actions={
          available.length > 1 ? (
            <SegmentedControl
              ariaLabel="Gallery images"
              items={available.map(([itemKey]) => ({
                key: itemKey,
                label: TABS[itemKey].label,
              }))}
              onChange={setTab}
              value={key}
            />
          ) : undefined
        }
        icon="solar:gallery-wide-bold"
        title="Gallery"
      />
      <Swap id={key}>
        <Carousel
          itemClassName={
            key === "backdrops" && images.length === 1 ? "w-full" : view.item
          }
          label={view.label}
        >
          {images.map((image, index) => {
            const kind = key === "backdrops" ? "backdrop" : "poster";
            const full = tmdbImageUrl(kind, image.filePath, "original");
            return (
              <MediaCard
                key={image.filePath}
                {...artworkTarget(view.slot, image.filePath)}
                aspect={view.aspect}
                image={{
                  sizes: view.sizes,
                  src: full,
                }}
                label={`View ${view.noun} ${index + 1} of ${title}`}
                onClick={() => {
                  if (!full) return;
                  const data: ImageModalData = {
                    alt: `${view.noun[0].toUpperCase()}${view.noun.slice(1)} ${index + 1} of ${title}`,
                    src: full,
                  };
                  void openImage(data as unknown as Record<string, unknown>);
                }}
              />
            );
          })}
        </Carousel>
      </Swap>
    </Section>
  );
}
