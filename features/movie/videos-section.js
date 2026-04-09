'use client';

import { useEffect, useMemo, useState } from 'react';

import Carousel from '@/features/shared/carousel';
import MediaCard from '@/features/shared/media-card';
import SegmentedControl from '@/features/shared/segmented-control';
import { useModal } from '@/core/modules/modal/context';
import Icon from '@/ui/icon';

function getAvailableTypes(videos) {
  return [...new Set(videos?.map((video) => video.type).filter(Boolean))];
}

export default function VideosSection({ videos }) {
  const { openModal } = useModal();

  const availableTypes = useMemo(() => getAvailableTypes(videos), [videos]);
  const [activeType, setActiveType] = useState(null);

  useEffect(() => {
    if (!availableTypes.length) {
      setActiveType(null);
      return;
    }

    setActiveType((current) => (current && availableTypes.includes(current) ? current : availableTypes[0]));
  }, [availableTypes]);

  const items = useMemo(
    () =>
      availableTypes.map((type) => ({
        key: type,
        label: type.endsWith('s') ? type : `${type}s`,
      })),
    [availableTypes]
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
    <section className="flex w-full flex-col gap-3">
      <SegmentedControl items={items} value={activeType} onChange={setActiveType} />

      <Carousel gap="gap-3">
        {filteredVideos.map((video) => (
          <MediaCard
            key={video.id}
            className="w-72"
            aspectClass="aspect-video"
            imageSrc={`https://img.youtube.com/vi/${video.key}/hqdefault.jpg`}
            imageAlt={video.name}
            imageSizes="288px"
            fallbackIcon="solar:video-library-bold"
            fallbackIconSize={24}
            overlay={
              <>
                <div className="center absolute inset-0 transition-opacity duration-300 group-hover:opacity-0">
                  <div className="center size-8 rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md">
                    <Icon icon="solar:play-bold" size={16} />
                  </div>
                </div>

                <div className="absolute inset-x-0 bottom-0 flex h-1/2 flex-col justify-end bg-linear-to-t from-black/80 to-transparent p-3 pt-8 pb-3 transition-opacity duration-300 group-hover:from-black/90">
                  <span className="line-clamp-1 text-[11px] font-bold tracking-tight text-white/90 uppercase drop-shadow-sm transition-colors group-hover:text-white">
                    {video.name}
                  </span>
                </div>
              </>
            }
            onClick={() => openModal('VIDEO_PREVIEW_MODAL', 'center', { data: video })}
          />
        ))}
      </Carousel>
    </section>
  );
}
