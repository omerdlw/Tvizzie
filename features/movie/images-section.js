'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

import {
  getSurfaceItemMotion,
  getSurfacePanelMotion,
  useInitialItemRevealEnabled,
} from '@/features/movie/movie-motion';
import Carousel from '@/features/shared/carousel';
import MediaCard from '@/features/shared/media-card';
import SegmentedControl from '@/features/shared/segmented-control';
import { TMDB_IMG } from '@/core/constants';
import { useModal } from '@/core/modules/modal/context';

const TABS = Object.freeze([
  {
    key: 'backdrops',
    label: 'Backdrops',
    aspect: 'aspect-video',
    width: 'w-[min(18rem,calc(100vw-4.5rem))] sm:w-72',
    size: 'w780',
    sizes: '288px',
  },
  {
    key: 'posters',
    label: 'Posters',
    aspect: 'aspect-2/3',
    width: 'w-36',
    size: 'w342',
    sizes: '144px',
  },
  {
    key: 'logos',
    label: 'Logos',
    aspect: 'aspect-video',
    width: 'w-[min(13rem,calc(100vw-5rem))] sm:w-52',
    size: 'w500',
    sizes: '208px',
  },
]);

const PLACEHOLDER_ICONS = Object.freeze({
  backdrops: 'solar:panorama-bold',
  posters: 'solar:gallery-minimalistic-bold',
  logos: 'solar:bookmark-square-bold',
});

function getTabItems(images, key) {
  const sourceItems = Array.isArray(images?.[key]) ? images[key] : [];
  const items = key === 'backdrops' ? sourceItems.filter((image) => image?.iso_639_1) : sourceItems;
  const seenFilePaths = new Set();
  const dedupedItems = [];

  items.forEach((image, index) => {
    if (!image || typeof image !== 'object') {
      return;
    }

    const filePath = String(image.file_path || '').trim();
    const fallbackKey = `${key}-fallback-${index}-${image.width || 0}x${image.height || 0}`;
    const dedupeKey = filePath || fallbackKey;

    if (seenFilePaths.has(dedupeKey)) {
      return;
    }

    seenFilePaths.add(dedupeKey);
    dedupedItems.push(image);
  });

  return dedupedItems;
}

export default function ImagesSection({ images }) {
  const reduceMotion = useReducedMotion();
  const shouldAnimateItemReveal = useInitialItemRevealEnabled();
  const { openModal } = useModal();

  const availableTabs = useMemo(() => TABS.filter((tab) => getTabItems(images, tab.key).length > 0), [images]);

  const [activeKey, setActiveKey] = useState(null);

  useEffect(() => {
    if (!availableTabs.length) {
      setActiveKey(null);
      return;
    }

    setActiveKey((current) =>
      current && availableTabs.some((tab) => tab.key === current) ? current : availableTabs[0].key
    );
  }, [availableTabs]);

  const currentTab = availableTabs.find((tab) => tab.key === activeKey) || null;
  const items = currentTab ? getTabItems(images, currentTab.key) : [];
  const panelMotion = getSurfacePanelMotion({ reduceMotion });

  if (!currentTab) {
    return null;
  }

  return (
    <section className="flex w-full flex-col gap-3">
      <SegmentedControl
        classNames={{
          track: ' w-auto',
          wrapper: 'p-0.5 rounded-[12px]',
          button: 'rounded-[9px]',
          indicator: 'rounded-[9px]',
        }}
        items={availableTabs}
        value={activeKey}
        onChange={setActiveKey}
      />

      <div className="relative">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`movie-images-${currentTab.key}`}
            initial={panelMotion.initial}
            animate={panelMotion.animate}
            exit={panelMotion.exit}
            transition={panelMotion.transition}
          >
            <Carousel gap="gap-3">
              {items.map((image, index) => {
                const cardMotion = getSurfaceItemMotion({
                  enabled: shouldAnimateItemReveal,
                  reduceMotion,
                  index,
                  distance: currentTab.key === 'posters' ? 22 : 18,
                  scale: currentTab.key === 'logos' ? 0.988 : 0.982,
                });

                return (
                  <motion.div
                    key={`${currentTab.key}-${image.file_path || 'image'}-${index}`}
                    initial={cardMotion.initial}
                    animate={cardMotion.animate}
                    transition={cardMotion.transition}
                  >
                    <MediaCard
                      imageSrc={image.file_path ? `${TMDB_IMG}/${currentTab.size}${image.file_path}` : null}
                      imageClassName={currentTab.key === 'logos' ? 'object-contain p-4' : 'object-cover'}
                      onClick={() => openModal('PREVIEW_MODAL', 'center', { data: image })}
                      imageFetchPriority={index < 3 ? 'high' : undefined}
                      imagePreset={currentTab.key === 'posters' ? 'poster' : 'feature'}
                      fallbackIcon={PLACEHOLDER_ICONS[currentTab.key]}
                      imageAlt={`${currentTab.label} ${index + 1}`}
                      className={`shrink-0 ${currentTab.width}`}
                      aspectClass={currentTab.aspect}
                      imageSizes={currentTab.sizes}
                      imagePriority={index < 3}
                      fallbackIconSize={24}
                      {...(currentTab.key === 'backdrops'
                        ? {
                            'data-backdrop-file-path': image.file_path || '',
                            'data-context-menu-target': 'movie-backdrop-card',
                          }
                        : currentTab.key === 'posters'
                          ? {
                              'data-poster-file-path': image.file_path || '',
                              'data-context-menu-target': 'movie-poster-card',
                            }
                          : {})}
                    />
                  </motion.div>
                );
              })}
            </Carousel>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
