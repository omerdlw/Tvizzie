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
import { MediaRouteReveal } from '@/app/(media)/motion';
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
    <section className="relative w-full border-b border-white/10">
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
      </div>
      <div
        key={`movie-videos-${activeType || 'all'}`}
        className={MEDIA_DETAIL_SECTION_CONTENT_CLASS}
      >
        <Carousel gap="gap-3">
          {filteredVideos.map((video, index) => {
            return (
              <MediaRouteReveal
                key={video.id}
                stage="items.videos"
                deferred
                interactive
                itemIndex={index}
              >
                <MediaCard
                  className="w-[min(18rem,calc(100vw-4.5rem))] sm:w-72"
                  aspectClass="aspect-video"
                  imageSrc={`https://img.youtube.com/vi/${video.key}/hqdefault.jpg`}
                  imageAlt={video.name}
                  imageSizes="288px"
                  imagePreset="grid"
                  fallbackIcon="solar:video-library-bold"
                  fallbackIconSize={24}
                  overlay={
                    <>
                      <div className="center absolute inset-0 group-hover:opacity-0">
                        <div className="center text-primary size-8 border border-black/20 bg-black/20 backdrop-blur-sm">
                          <Icon icon="solar:play-bold" size={16} />
                        </div>
                      </div>
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-white/70 via-white/30 to-transparent p-3 text-black group-hover:from-white">
                        <h3 className="truncate text-sm font-bold text-black">{video.name}</h3>
                      </div>
                    </>
                  }
                  onClick={() =>
                    openModal('VIDEO_PREVIEW_MODAL', 'center', {
                      data: video,
                    })
                  }
                />
              </MediaRouteReveal>
            );
          })}
        </Carousel>
      </div>
    </section>
  );
}
