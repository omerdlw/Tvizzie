'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { PersonSurfaceReveal } from '@/features/media/static-route-elements';
import Carousel from '@/ui/media/carousel';
import MediaCard from '@/ui/media/media-card';
import { TMDB_IMG } from '@/core/constants';
import { useModal } from '@/core/modules/modal';

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

export default function PersonGallery({ images, animateItemReveal = true }) {
  const { openModal } = useModal();
  const profiles = useMemo(() => sortProfiles(images?.profiles || []), [images]);
  const containerRef = useRef(null);
  const [cardWidth, setCardWidth] = useState(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const calc = () => {
      const containerW = node.offsetWidth ?? 0;
      const totalGap = GAP_PX * (CARDS_VISIBLE - 1);
      setCardWidth(Math.floor((containerW - totalGap) / CARDS_VISIBLE));
    };
    calc();
    const observer = new ResizeObserver(calc);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  if (!profiles.length) return null;

  return (
    <PersonSurfaceReveal>
      <section className="flex w-full flex-col gap-3">
        <h2 className="text-[11px] font-semibold tracking-widest text-black/70 uppercase">
          Gallery
        </h2>

        <div ref={containerRef} className="w-full">
          <Carousel gap="gap-3">
            {profiles.map((image, index) => (
              <div
                key={image.file_path || index}
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
                  onClick={() =>
                    openModal?.('PREVIEW_MODAL', 'center', { data: image })
                  }
                  data-poster-file-path={image.file_path || ''}
                  data-context-menu-target="person-poster-card"
                />
              </div>
            ))}
          </Carousel>
        </div>
      </section>
    </PersonSurfaceReveal>
  );
}
