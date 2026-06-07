'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  MovieSurfaceReveal,
  getSurfaceItemMotion,
  getSurfacePanelMotion,
  useInitialItemRevealEnabled,
} from '@/features/media/static-route-elements';
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
  if (!videos?.length) {
    return null;
  }
  return (
    <MovieSurfaceReveal>
      <section className="flex w-full flex-col gap-3">
        <SegmentedControl
          value={activeType}
          className="w-auto self-start"
          classNames={{
            wrapper: 'p-0.5',
            button: '',
            indicator: '',
          }}
          items={items}
          onChange={setActiveType}
        />

        <div className="relative">
          <>
            <div key={`movie-videos-${activeType || 'all'}`}>
              <Carousel gap="gap-3">
                {filteredVideos.map((video, index) => {
                  return (
                    <div key={video.id}>
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
                            <div className="center absolute inset-0 group-hover:opacity-0">
                              <div className="center text-primary size-8 border border-white/20 bg-white/20 backdrop-blur-sm">
                                <Icon icon="solar:play-bold" size={16} />
                              </div>
                            </div>
                            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-3 text-white group-hover:from-black">
                              <h3 className="truncate text-sm font-bold text-white">{video.name}</h3>
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
          </>
        </div>
      </section>
    </MovieSurfaceReveal>
  );
}
