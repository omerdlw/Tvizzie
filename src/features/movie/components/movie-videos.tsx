"use client";

import { useState } from "react";
import { useModal } from "@omerdlw/base-framework/modules/modal";
import {
  CAROUSEL_WIDE_ITEM,
  Icon,
  MediaCard,
  SegmentedControl,
  TONE,
} from "@/ui";
import type { MovieVideo } from "@/infrastructure/tmdb/types";
import { Carousel, Header, Section, Swap } from "@/motion/stage";
import { VideoModal, type VideoModalData } from "./movie-modals";

const plural = (type: string) => (type.endsWith("s") ? type : `${type}s`);

export function MovieVideos({
  types,
  videos,
}: {
  types: string[];
  videos: MovieVideo[];
}) {
  const [openVideo] = useModal(VideoModal);
  const [type, setType] = useState(types[0] ?? "");
  if (types.length === 0) return null;

  const visible = videos.filter((v) => v.site === "YouTube" && v.type === type);

  return (
    <Section className="flex w-full flex-col">
      <Header
        actions={
          <SegmentedControl
            ariaLabel="Video type"
            className={TONE.tabs}
            items={types.map((t) => ({ key: t, label: plural(t) }))}
            onChange={setType}
            value={type}
          />
        }
        icon="solar:video-frame-play-horizontal-bold"
        title="Videos"
      />

      <Swap id={type}>
        <Carousel
          arrowClassName={TONE.arrows}
          className="rounded-[16px]"
          itemClassName={visible.length === 1 ? "w-full" : CAROUSEL_WIDE_ITEM}
          label="Videos"
          radius={16}
        >
          {visible.map((video) => (
            <MediaCard
              key={video.id}
              aspect="video"
              fallbackIcon="solar:video-frame-play-horizontal-bold"
              image={{
                sizes:
                  "(min-width: 1280px) 330px, (min-width: 640px) 50vw, 100vw",
                src: `https://img.youtube.com/vi/${encodeURIComponent(video.key)}/hqdefault.jpg`,
              }}
              label={`Play ${video.name}`}
              radius={16}
              onClick={() => {
                const data: VideoModalData = {
                  key: video.key,
                  name: video.name,
                };
                void openVideo(data);
              }}
              overlay={
                <>
                  <span aria-hidden="true" className="crt-tube-face" />
                  <div className="cine-play center pointer-events-none absolute inset-0 text-white">
                    <Icon icon="solar:play-circle-bold" size={48} />
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent p-3 text-left">
                    <h3 className="truncate text-sm font-semibold text-white">
                      {video.name}
                    </h3>
                  </div>
                </>
              }
            />
          ))}
        </Carousel>
      </Swap>
    </Section>
  );
}
