"use client";

import { useState } from "react";
import { useModal } from "@omerdlw/base-framework/modules/modal";
import { artworkTarget } from "@/features/artwork";
import { ImageModal, type ImageModalData } from "@/features/movie";
import { MediaCard, SegmentedControl } from "@/ui";
import type { MediaCardAspect } from "@/ui";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
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
  const available: [Tab, string[]][] = [
    ["portraits", portraits.length > 1 ? portraits.map((p) => p.filePath) : []],
    ["backdrops", backdrops],
  ];
  const tabs = available.filter(([, paths]) => paths.length > 0);
  const [tab, setTab] = useState<Tab>(tabs[0]?.[0] ?? "portraits");
  if (tabs.length === 0) return null;

  const [key, paths] = tabs.find(([item]) => item === tab) ?? tabs[0];
  const view = VIEWS[key];
  const portrait = key === "portraits";

  return (
    <Section className="flex w-full flex-col">
      <Header
        actions={
          tabs.length > 1 ? (
            <SegmentedControl
              ariaLabel="Gallery images"
              items={tabs.map(([item]) => ({
                key: item,
                label: VIEWS[item].label,
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
