'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import Carousel from '@/ui/media/carousel';
import MediaCard from '@/ui/media/media-card';
import SegmentedControl from '@/ui/elements/segmented-control';
import { TMDB_IMG } from '@/core/constants';
import { useModal } from '@/core/modules/modal/context';
import {
  getMovieFeatureItemMotion,
  getMovieFeatureTabItemMotion,
  MOVIE_FEATURE_SECTION_MOTION,
  MOVIE_FEATURE_TAB_STAGGER_MOTION,
} from '@/features/movie/motion';

const TABS = Object.freeze([
  {
    key: 'backdrops',
    label: 'Backdrops',
    aspect: 'aspect-video',
    width: 'movie-carousel-feature-card',
    size: 'w780',
    sizes: '288px',
  },
  {
    key: 'posters',
    label: 'Posters',
    aspect: 'aspect-2/3',
    width: 'movie-carousel-poster-card',
    size: 'w342',
    sizes: '144px',
  },
  {
    key: 'logos',
    label: 'Logos',
    aspect: 'aspect-video',
    width: 'movie-carousel-logo-card',
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

function ImagesSectionContent({ images }) {
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
    <motion.section className="movie-detail-section-content w-full" {...MOVIE_FEATURE_SECTION_MOTION}>
      <motion.div {...getMovieFeatureItemMotion(0)}>
        <SegmentedControl items={availableTabs} value={activeKey} onChange={setActiveKey} />
      </motion.div>

      <div className="relative">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={`movie-images-${currentTab.key}`} {...MOVIE_FEATURE_TAB_STAGGER_MOTION}>
            <Carousel gap="gap-3">
              {items.map((image, index) => (
                <motion.div
                  key={`${currentTab.key}-${image.file_path || 'image'}-${index}`}
                  {...getMovieFeatureTabItemMotion(index + 1)}
                >
                  <ImageCard
                    image={image}
                    index={index}
                    tab={currentTab}
                    onPreview={() => openModal('PREVIEW_MODAL', 'center', { data: image })}
                  />
                </motion.div>
              ))}
            </Carousel>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.section>
  );
}

export default function ImagesSection({ images }) {
  return <ImagesSectionContent images={images} />;
}

function getImageContextAttributes(tabKey, filePath) {
  if (tabKey === 'backdrops') {
    return {
      'data-backdrop-file-path': filePath || '',
      'data-context-menu-target': 'movie-backdrop-card',
    };
  }

  if (tabKey === 'posters') {
    return {
      'data-poster-file-path': filePath || '',
      'data-context-menu-target': 'movie-poster-card',
    };
  }

  return {};
}

function ImageCard({ image, index, onPreview, tab }) {
  const filePath = image.file_path || '';
  const isPriority = index < 3;

  return (
    <MediaCard
      imageSrc={filePath ? `${TMDB_IMG}/${tab.size}${filePath}` : null}
      imageClassName={tab.key === 'logos' ? 'object-contain p-4' : 'object-cover'}
      onClick={onPreview}
      imageFetchPriority={isPriority ? 'high' : undefined}
      imagePreset={tab.key === 'posters' ? 'poster' : 'feature'}
      fallbackIcon={PLACEHOLDER_ICONS[tab.key]}
      imageAlt={`${tab.label} ${index + 1}`}
      className={`shrink-0 ${tab.width}`}
      aspectClass={tab.aspect}
      imageSizes={tab.sizes}
      imagePriority={isPriority}
      fallbackIconSize={24}
      {...getImageContextAttributes(tab.key, filePath)}
    />
  );
}
