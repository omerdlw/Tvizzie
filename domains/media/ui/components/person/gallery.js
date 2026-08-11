'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Carousel from '@/domains/media/ui/components/media-carousel';
import MediaCard from '@/domains/media/ui/components/media-card';
import { TMDB_IMG } from '@/shared/constants';
import { useModal } from '@/modules/modal';
import Icon from '@/ui/primitives/icon';
import {
  getCarouselButtonProps,
  getMediaCardProps,
  getSectionHeaderProps,
  PERSON_TIMELINES,
} from '@/app/(media)/motion';

const GAP_PX = 12;
const CARDS_VISIBLE = 5;

function sortProfiles(profiles = []) {
  return [...profiles]
    .filter((image) => image?.file_path)
    .sort(
      (first, second) =>
        (second.vote_average || 0) - (first.vote_average || 0) ||
        (second.vote_count || 0) - (first.vote_count || 0),
    )
    .slice(0, 20);
}

export default function PersonGallery({ images, baseDelay = PERSON_TIMELINES.GALLERY_BASE_DELAY }) {
  const { openModal } = useModal();
  const profiles = useMemo(() => sortProfiles(images?.profiles || []), [images]);
  const containerRef = useRef(null);
  const [cardWidth, setCardWidth] = useState(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const calc = () => {
      const containerW = node.offsetWidth ?? 0;
      const cardsVisible = containerW < 640 ? 3 : containerW < 1024 ? 4 : 5;
      const totalGap = GAP_PX * (cardsVisible - 1);
      setCardWidth(Math.floor((containerW - totalGap) / cardsVisible));
    };
    calc();
    const observer = new ResizeObserver(calc);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  if (!profiles.length) return null;

  return (
    <section className="relative w-full">
      <motion.div
        {...getSectionHeaderProps(baseDelay, false, 'gallery')}
        initial={false}
        className="relative flex min-h-14 w-full items-center justify-between gap-4 px-4"
      >
        <div className="flex min-w-0 items-center gap-2">
          <Icon icon="solar:gallery-wide-bold" size={20} className="text-black/70" />
          <h2 className="min-w-0 text-xs font-semibold tracking-wide text-black/70 uppercase">
            Gallery
          </h2>
        </div>
        <div className="pointer-events-none absolute bottom-0 left-1/2 w-screen -translate-x-1/2 border-b border-black/10" />
      </motion.div>
      <div className="p-6">
        <div ref={containerRef} className="w-full">
          <Carousel gap="gap-3" buttonProps={getCarouselButtonProps(baseDelay)}>
            {profiles.map((image, index) => (
              <motion.div
                key={image.file_path || index}
                {...getMediaCardProps(index, baseDelay, false, 'gallery')}
                initial={false}
                style={{ width: cardWidth ?? 160, flexShrink: 0 }}
              >
                <MediaCard
                  className="w-full"
                  aspectClass="aspect-2/3"
                  imageSrc={image.file_path ? `${TMDB_IMG}/w342${image.file_path}` : null}
                  imageAlt={`${index + 1}. portrait`}
                  imageSizes="(min-width: 1024px) 20vw, (min-width: 640px) 25vw, 33vw"
                  imagePriority={index < 5}
                  imageFetchPriority={index < 5 ? 'high' : undefined}
                  imagePreset="feature"
                  fallbackIcon="solar:user-bold"
                  fallbackIconSize={24}
                  onClick={() => openModal?.('PREVIEW_MODAL', 'center', { data: image })}
                  data-poster-file-path={image.file_path || ''}
                  data-context-menu-target="person-poster-card"
                />
              </motion.div>
            ))}
          </Carousel>
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-0 left-1/2 w-screen -translate-x-1/2 border-b border-black/10" />
    </section>
  );
}
