'use client';

import { useEffect, useMemo, useState } from 'react';
import Carousel from '@/domains/media/ui/components/media-carousel';
import MediaCard from '@/domains/media/ui/components/media-card';
import SegmentedControl from '@/ui/primitives/segmented-control';
import { TMDB_IMG } from '@/shared/constants';
import { useModal } from '@/modules/modal';
import Icon from '@/ui/primitives/icon';
import {
  MEDIA_DETAIL_SECTION_CONTENT_CLASS,
  MEDIA_DETAIL_SECTION_HEADER_CLASS,
} from '@/domains/media/ui/layouts/media-detail-section';
import { GridCrosshair } from '@/ui/layout/grid-crosshair';
const TABS = Object.freeze([
  {
    key: 'backdrops',
    label: 'Backdrops',
    aspect: 'aspect-video',
    width: 'w-[min(18rem,calc(100vw-4.5rem))] sm:w-72',
    size: 'original',
    sizes: '288px',
  },
  {
    key: 'posters',
    label: 'Posters',
    aspect: 'aspect-2/3',
    width: 'w-36',
    size: 'original',
    sizes: '144px',
  },
  {
    key: 'logos',
    label: 'Logos',
    aspect: 'aspect-video',
    width: 'w-[min(13rem,calc(100vw-5rem))] sm:w-52',
    size: 'original',
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

export default function ImagesSection({ images, baseDelay = 0 }) {
  const { openModal } = useModal();
  const availableTabs = useMemo(
    () => TABS.filter((tab) => getTabItems(images, tab.key).length > 0),
    [images],
  );
  const [activeKey, setActiveKey] = useState(null);
  const [hasSwitchedTab, setHasSwitchedTab] = useState(false);

  useEffect(() => {
    if (!availableTabs.length) {
      setActiveKey(null);
      return;
    }
    setActiveKey((current) =>
      current && availableTabs.some((tab) => tab.key === current) ? current : availableTabs[0].key,
    );
  }, [availableTabs]);

  const handleTabChange = (key) => {
    setHasSwitchedTab(true);
    setActiveKey(key);
  };

  const currentTab = availableTabs.find((tab) => tab.key === activeKey) || null;
  const items = currentTab ? getTabItems(images, currentTab.key) : [];

  if (!currentTab) {
    return null;
  }

  return (
    <section className="relative w-full">
      <div className={MEDIA_DETAIL_SECTION_HEADER_CLASS}>
        <div className="flex min-w-0 items-center gap-2">
          <Icon icon="solar:gallery-minimalistic-bold" size={20} className="text-white/70" />
          <h2 className="min-w-0 text-xs font-semibold tracking-wide text-white/70 uppercase">
            Images
          </h2>
        </div>
        {availableTabs.length > 1 && (
          <div className="flex shrink-0 items-center">
            <SegmentedControl
              value={activeKey}
              className="w-auto self-start"
              classNames={{}}
              items={availableTabs}
              onChange={handleTabChange}
            />
          </div>
        )}
        <div className="pointer-events-none absolute right-px bottom-0 left-px h-px bg-white/10 backdrop-blur-sm">
          <GridCrosshair side="left" />
          <GridCrosshair side="right" />
        </div>
      </div>
      <div key={`movie-images-${currentTab.key}`} className={MEDIA_DETAIL_SECTION_CONTENT_CLASS}>
        <Carousel gap="gap-3">
          {items.map((image, index) => {
            return (
              <div key={`${currentTab.key}-${image.file_path || 'image'}-${index}`}>
                <MediaCard
                  imageSrc={
                    image.file_path ? `${TMDB_IMG}/${currentTab.size}${image.file_path}` : null
                  }
                  imageClassName={
                    currentTab.key === 'logos' ? 'object-contain p-4' : 'object-cover'
                  }
                  onClick={() =>
                    openModal('PREVIEW_MODAL', 'center', {
                      data: image,
                    })
                  }
                  imagePreset={currentTab.key === 'posters' ? 'poster' : 'feature'}
                  fallbackIcon={PLACEHOLDER_ICONS[currentTab.key]}
                  imageAlt={`${currentTab.label} ${index + 1}`}
                  className={`shrink-0 ${currentTab.width}`}
                  aspectClass={currentTab.aspect}
                  imageSizes={currentTab.sizes}
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
