'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Carousel from '@/domains/media/ui/components/media-carousel';
import MediaCard from '@/domains/media/ui/components/media-card';
import SegmentedControl from '@/ui/primitives/segmented-control';
import { useModal } from '@/modules/modal';
import Icon from '@/ui/primitives/icon';
import { getMediaCardProps, getSectionHeaderProps } from '@/app/(media)/motion';

function getAvailableTypes(videos) {
  return [...new Set(videos?.map((video) => video.type).filter(Boolean))];
}

export default function VideosSection({ videos }) {
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
    <section className="flex w-full flex-col gap-3">
      <motion.div {...getSectionHeaderProps(0, hasSwitchedTab)}>
        <SegmentedControl
          value={activeType}
          className="w-auto self-start"
          classNames={{}}
          items={items}
          onChange={handleTabChange}
        />
      </motion.div>

      <div className="relative">
        <div key={`movie-videos-${activeType || 'all'}`}>
          <Carousel gap="gap-3">
            {filteredVideos.map((video, index) => {
              return (
                <motion.div
                  key={video.id}
                  {...getMediaCardProps(index, 0, hasSwitchedTab)}
                >
                  <MediaCard
                    className="w-72"
                    aspectClass="aspect-video"
                    imageSrc={`https://img.youtube.com/vi/${video.key}/hqdefault.jpg`}
                    imageAlt={video.name}
                    imageSizes="288px"
                    imagePreset="grid"
                    fallbackIcon="solar:video-library-bold"
                    fallbackIconSize={24}
                    overlay={
                      <>
                        <div className="center absolute transition-all duration-150 ease-linear inset-0 group-hover:opacity-0">
                          <div className="center rounded-full text-primary size-8 border border-white/20 bg-white/20 backdrop-blur-sm">
                            <Icon icon="solar:play-bold" size={16} />
                          </div>
                        </div>
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-3 text-white group-hover:from-black">
                          <h3 className="truncate text-sm font-bold text-white">
                            {video.name}
                          </h3>
                        </div>
                      </>
                    }
                    onClick={() =>
                      openModal('VIDEO_PREVIEW_MODAL', 'center', {
                        data: video,
                      })
                    }
                  />
                </motion.div>
              );
            })}
          </Carousel>
        </div>
      </div>
    </section>
  );
}
