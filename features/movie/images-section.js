'use client';

import { useEffect, useMemo, useState } from 'react';

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
    width: 'w-72',
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
    width: 'w-52',
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
  const items = images?.[key] || [];

  if (key === 'backdrops') {
    return items.filter((image) => image.iso_639_1);
  }

  return items;
}

export default function ImagesSection({ images }) {
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

  if (!currentTab) {
    return null;
  }

  return (
    <section className="flex w-full flex-col gap-3">
      <SegmentedControl items={availableTabs} value={activeKey} onChange={setActiveKey} />

      <Carousel gap="gap-3">
        {items.map((image, index) => (
          <MediaCard
            imageSrc={image.file_path ? `${TMDB_IMG}/${currentTab.size}${image.file_path}` : null}
            imageClassName={currentTab.key === 'logos' ? 'object-contain p-4' : 'object-cover'}
            onClick={() => openModal('PREVIEW_MODAL', 'center', { data: image })}
            imageFetchPriority={index < 3 ? 'high' : undefined}
            fallbackIcon={PLACEHOLDER_ICONS[currentTab.key]}
            imageAlt={`${currentTab.label} ${index + 1}`}
            className={`shrink-0 ${currentTab.width}`}
            aspectClass={currentTab.aspect}
            key={image.file_path || index}
            imageSizes={currentTab.sizes}
            imagePriority={index < 3}
            fallbackIconSize={24}
          />
        ))}
      </Carousel>
    </section>
  );
}
