'use client';

import { useEffect, useMemo, useState } from 'react';
import Carousel from '@/domains/media/ui/components/media-carousel';
import MediaCard from '@/domains/media/ui/components/media-card';
import SegmentedControl from '@/ui/primitives/segmented-control';
import { useModal } from '@/modules/modal';
import Icon from '@/ui/primitives/icon';
import {
  MEDIA_DETAIL_SECTION_CONTENT_CLASS,
  MEDIA_DETAIL_SECTION_HEADER_CLASS,
} from '@/domains/media/ui/layouts/media-detail-section';
import { GridCrosshair } from '@/ui/layout/grid-crosshair';
function getAvailableTypes(videos) {
  return [...new Set(videos?.map((video) => video.type).filter(Boolean))];
}

export default function VideosSection({ videos, baseDelay = 0 }) {
  const { openModal } = useModal();
  const availableTypes = useMemo(() => getAvailableTypes(videos), [videos]);
  const [activeType, setActiveType] = useState(null);
  const [hasSwitchedTab, setHasSwitchedTab] = useState(false);

  useEffect(() => {
    if (!availableTypes.length) {
      setActiveType(null);
      return;
    }
    setActiveType((current) =>
      current && availableTypes.includes(current) ? current : availableTypes[0],
    );
  }, [availableTypes]);

  const handleTabChange = (type) => {
    setHasSwitchedTab(true);
    setActiveType(type);
  };

  const items = useMemo(
    () =>
      availableTypes.map((type) => ({
        key: type,
        label: type.endsWith('s') ? type : `${type}s`,
      })),
    [availableTypes],
  );

  const filteredVideos = useMemo(() => {
    if (!activeType) {
      return [];
    }
    return videos.filter((video) => video.type === activeType);
  }, [videos, activeType]);

  if (!videos?.length) {
    return null;
  }

  return (
    <section className="relative w-full">
      <div className={MEDIA_DETAIL_SECTION_HEADER_CLASS}>
        <div className="flex min-w-0 items-center gap-2">
          <Icon icon="solar:video-library-bold" size={20} className="text-white/70" />
          <h2 className="min-w-0 text-xs font-semibold tracking-wide text-white/70 uppercase">
            Videos
          </h2>
        </div>
        {items.length > 0 && (
          <div className="flex shrink-0 items-center">
            <SegmentedControl
              value={activeType}
              className="w-auto self-start"
              classNames={{}}
              items={items}
              onChange={handleTabChange}
            />
          </div>
        )}
        <div className="pointer-events-none absolute bottom-0 left-px right-px h-px bg-white/10 backdrop-blur-sm">
          <GridCrosshair side="left" />
          <GridCrosshair side="right" />
        </div>
      </div>
      <div
        key={`movie-videos-${activeType || 'empty'}`}
        className={MEDIA_DETAIL_SECTION_CONTENT_CLASS}
      >
        <Carousel gap="gap-3">
          {filteredVideos.map((video, index) => {
            return (
              <div key={`${activeType || 'video'}-${video.id || video.key}-${index}`}>
                <MediaCard
                  aspectClass="aspect-video"
                  className="w-[min(18rem,calc(100vw-4.5rem))] sm:w-72"
                  fallbackIcon="solar:video-frame-play-horizontal-bold"
                  fallbackIconSize={24}
                  imageAlt={video.name}
                  imagePreset="feature"
                  imageSizes="288px"
                  imageSrc={
                    video.key ? `https://img.youtube.com/vi/${video.key}/hqdefault.jpg` : null
                  }
                  topOverlay={
                    <>
                      <div className="center absolute inset-0 text-white transition-all duration-300 ease-in-out group-hover:scale-110">
                        <Icon icon="solar:play-circle-bold" size={48} />
                      </div>
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 text-white">
                        <h3 className="truncate text-sm font-semibold text-white">{video.name}</h3>
                      </div>
                    </>
                  }
                  onClick={() =>
                    openModal('VIDEO_PREVIEW_MODAL', 'center', {
                      data: video,
                    })
                  }
                />
              </div>
            );
          })}
        </Carousel>
      </div>
      <div className="pointer-events-none absolute right-px bottom-0 left-px h-px bg-white/10 backdrop-blur-sm">
        <GridCrosshair side="left" />
        <GridCrosshair side="right" />
      </div>
    </section>
  );
}
