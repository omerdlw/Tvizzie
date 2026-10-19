"use client";

import { useState } from "react";
import { useModal } from "@omerdlw/base-framework/modules/modal";
import { artworkTarget } from "@/features/artwork";
import {
  GalleryWall,
  ImageModal,
  WALL_SIZES,
  WallButton,
  type ImageModalData,
  type WallSet,
} from "@/features/movie";
import { MediaCard, SegmentedControl } from "@/ui";
import type { MediaCardAspect } from "@/ui";
import { tmdbImageSrcSet, tmdbImageUrl } from "@/infrastructure/tmdb/images";
import type { PersonImage } from "@/infrastructure/tmdb/types";
import { BACKDROP_ITEM, PORTRAIT_ITEM } from "../lib/layout";
import { Carousel, Header, Section, Swap } from "../stage";

type Tab = "portraits" | "backdrops";

interface View {
  aspect: MediaCardAspect;
  item: string;
  label: string;
  noun: string;
  sizes: string;
}

const VIEWS: Record<Tab, View> = {
  portraits: {
    aspect: "poster",
    item: PORTRAIT_ITEM,
    label: "Portraits",
    noun: "portrait",
    sizes: "(min-width: 768px) 160px, 30vw",
  },
  backdrops: {
    aspect: "video",
    item: BACKDROP_ITEM,
    label: "Backdrops",
    noun: "scene",
    sizes: "(min-width: 1280px) 330px, (min-width: 640px) 50vw, 100vw",
  },
};

const shelves = (
  backdrops: string[],
  portraits: PersonImage[],
): [Tab, string[]][] =>
  (
    [
      [
        "portraits",
        portraits.length > 1 ? portraits.map((p) => p.filePath) : [],
      ],
      ["backdrops", backdrops],
    ] as [Tab, string[]][]
  ).filter(([, paths]) => paths.length > 0);

export function PersonGallery({
  backdrops,
  name,
  portraits,
}: {
  backdrops: string[];
  name: string;
  portraits: PersonImage[];
}) {
  const [openImage] = useModal(ImageModal);
  const tabs = shelves(backdrops, portraits);
  const [tab, setTab] = useState<Tab>(tabs[0]?.[0] ?? "portraits");
  if (tabs.length === 0) return null;

  const [key, paths] = tabs.find(([item]) => item === tab) ?? tabs[0];
  const view = VIEWS[key];
  const portrait = key === "portraits";

  return (
    <Section className="flex w-full flex-col">
      <Header
        actions={
          <div className="flex items-center gap-2">
            {tabs.length > 1 ? (
              <SegmentedControl
                ariaLabel="Gallery images"
                items={tabs.map(([item]) => ({
                  key: item,
                  label: VIEWS[item].label,
                }))}
                onChange={setTab}
                value={key}
              />
            ) : null}
            <WallButton set={key} />
          </div>
        }
        icon="solar:gallery-wide-bold"
        title="Gallery"
      />
      <Swap id={key}>
        <Carousel
          itemClassName={!portrait && paths.length === 1 ? "w-full" : view.item}
          label={view.label}
        >
          {paths.map((path, index) => {
            const full = portrait
              ? tmdbImageUrl("profile", path, "original")
              : tmdbImageUrl("backdrop", path, "original");
            return (
              <MediaCard
                key={path}
                {...artworkTarget(portrait ? "poster" : "backdrop", path)}
                aspect={view.aspect}
                image={{ sizes: view.sizes, src: full }}
                label={`View ${view.noun} ${index + 1} of ${name}`}
                onClick={() => {
                  if (!full) return;
                  const data: ImageModalData = {
                    alt: `${view.noun[0].toUpperCase()}${view.noun.slice(1)} ${index + 1} of ${name}`,
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

// Everything the person's gallery holds, hung on its own once the page is
// given over to it. The wall is shown at the size of its cells, not in full.
export function PersonGalleryWall({
  backdrops,
  name,
  portraits,
}: {
  backdrops: string[];
  name: string;
  portraits: PersonImage[];
}) {
  const sets: WallSet[] = shelves(backdrops, portraits).map(([key, paths]) => {
    const view = VIEWS[key];
    const portrait = key === "portraits";
    return {
      aspect: view.aspect,
      key,
      label: view.label,
      noun: view.noun,
      pictures: paths.map((path) =>
        portrait
          ? {
              full: tmdbImageUrl("profile", path, "original"),
              lead: tmdbImageUrl("profile", path, "w185"),
              path,
              sizes: WALL_SIZES.poster,
              src: tmdbImageUrl("profile", path, "h632"),
            }
          : {
              // As in the film's gallery: a still may become the page's
              // background, and is then read for its colours.
              crossOrigin: "anonymous" as const,
              full: tmdbImageUrl("backdrop", path, "original"),
              lead: tmdbImageUrl("backdrop", path, "w300"),
              path,
              sizes: WALL_SIZES.video,
              src: tmdbImageUrl("backdrop", path, "w780"),
              srcSet:
                tmdbImageSrcSet("backdrop", path, ["w300", "w780"]) ??
                undefined,
            },
      ),
      slot: portrait ? "poster" : "backdrop",
    };
  });
  return <GalleryWall back={`Back to ${name}`} sets={sets} title={name} />;
}
