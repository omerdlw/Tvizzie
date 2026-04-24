'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import {
  MovieSurfaceReveal,
  getSurfaceItemMotion,
  getSurfacePanelMotion,
  useInitialItemRevealEnabled,
} from '@/app/(media)/movie/[id]/motion';
import Carousel from '@/ui/media/carousel';
import MediaCard from '@/ui/media/media-card';
import SegmentedControl from '@/ui/elements/segmented-control';
import { useModal } from '@/core/modules/modal/context';
import Icon from '@/ui/icon';

function getAvailableTypes(videos) {
  return [...new Set(videos?.map((video) => video.type).filter(Boolean))];
}

export default function VideosSection({ videos }) {
  const shouldAnimateItemReveal = useInitialItemRevealEnabled();
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
  const panelMotion = getSurfacePanelMotion();

  if (!videos?.length) {
    return null;
  }

  return (
    <MovieSurfaceReveal>
      <section className="flex w-full flex-col gap-3">
        <SegmentedControl
          classNames={{
            track: ' w-auto',
            wrapper: 'p-0.5 rounded-[12px]',
            button: 'rounded-[9px]',
            indicator: 'rounded-[9px]',
          }}
          items={items}
          value={activeType}
          onChange={setActiveType}
        />

        <div className="relative">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`movie-videos-${activeType || 'all'}`}
              initial={panelMotion.initial}
              animate={panelMotion.animate}
              exit={panelMotion.exit}
              transition={panelMotion.transition}
            >
              <Carousel gap="gap-3">
                {filteredVideos.map((video, index) => {
                  const cardMotion = getSurfaceItemMotion({
                    enabled: shouldAnimateItemReveal,
                    index,
                    distance: 20,
                    scale: 0.976,
                  });

                  return (
                    <motion.div
                      key={video.id}
                      initial={cardMotion.initial}
                      animate={cardMotion.animate}
                      transition={cardMotion.transition}
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
                            <div className="center absolute inset-0 transition-opacity duration-300 group-hover:opacity-0">
                              <motion.div
                                className="center text-primary size-8 rounded-full border border-white/20 bg-white/20 backdrop-blur-sm"
                                whileHover={{ scale: 1.08 }}
                                transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
                              >
                                <Icon icon="solar:play-bold" size={16} />
                              </motion.div>
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
                    </motion.div>
                  );
                })}
              </Carousel>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    </MovieSurfaceReveal>
  );
}
