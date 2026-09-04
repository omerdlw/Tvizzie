'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { TMDB_IMG } from '@/shared';
import {
  getPreferredMoviePosterSrc,
  usePosterPreferenceVersion,
} from '@/domains/media/utils/poster-preferences';
import Icon from '@/ui/primitives/icon';

const MOTION_EASINGS = {
  CINEMATIC: [0.76, 0, 0.24, 1],
};

const CARD_SCALE = 1.16;
const BACK_PANEL_HEIGHT = Math.round(200 * CARD_SCALE);
const STACK_SIZE = 5;

function getPreviewImage(item) {
  if (!item) return null;
  const mediaType = item?.media_type || item?.entityType;
  const preferredPoster = mediaType === 'movie' ? getPreferredMoviePosterSrc(item, 'w342') : null;
  if (preferredPoster) {
    return preferredPoster;
  }
  if (item?.poster_path_full) {
    return item.poster_path_full;
  }
  if (item?.poster_path) {
    return `${TMDB_IMG}/w342${item.poster_path}`;
  }
  return null;
}

function getListHref(list, ownerUsername = null) {
  const ownerHandle = ownerUsername || list?.ownerSnapshot?.username || list?.ownerId;
  if (!ownerHandle || !list?.slug) {
    return '#';
  }
  return `/account/${ownerHandle}/lists/${list.slug}`;
}

function formatListDate(value) {
  if (!value) {
    return 'Recently updated';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Recently updated';
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export default function AccountListCard({ list, ownerUsername = null, renderActions = null }) {
  const posterPreferenceVersion = usePosterPreferenceVersion();
  const [isHovered, setIsHovered] = useState(false);

  const availableImages = useMemo(() => {
    const items = Array.isArray(list?.previewItems) ? list.previewItems : [];
    const imgs = items.map(getPreviewImage).filter(Boolean);
    return imgs;
  }, [list?.previewItems, posterPreferenceVersion]);

  const imagePositions = useMemo(() => {
    const count = STACK_SIZE;
    const positions = [];
    const totalSpread = 152;
    const step = count > 1 ? totalSpread / (count - 1) : 0;
    const startX = -totalSpread / 2;

    for (let i = 0; i < count; i++) {
      const x = count > 1 ? startX + step * i : 0;
      const normalizedPos = count > 1 ? (i / (count - 1)) * 2 - 1 : 0;
      const rotate = normalizedPos * 10;
      positions.push({ x, rotate });
    }
    return positions;
  }, []);

  const listTitle = String(list?.title || '').trim() || 'Untitled List';
  const listDescription = String(list?.description || '').trim();
  const updatedLabel = formatListDate(list?.updatedAt || list?.createdAt);
  const itemsCount = Number.isFinite(Number(list?.itemsCount))
    ? Number(list.itemsCount)
    : Array.isArray(list?.previewItems)
      ? list.previewItems.length
      : 0;
  const likesCount = Number.isFinite(Number(list?.likesCount))
    ? Number(list.likesCount)
    : Array.isArray(list?.likes)
      ? list.likes.length
      : 0;
  const reviewsCount = Number.isFinite(Number(list?.reviewsCount)) ? Number(list.reviewsCount) : 0;

  const actionsElement = typeof renderActions === 'function' ? renderActions(list) : null;
  const hasActions = Boolean(actionsElement);

  return (
    <article
      className="relative w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={getListHref(list, ownerUsername)} className="block">
        <div
          className="group relative w-full cursor-pointer rounded-[20px]"
          style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
        >
          <motion.div
            className="relative z-0 rounded-t-[20px] ring-1 ring-inset ring-white/5"
            animate={{ rotateX: isHovered ? 15 : 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 25, mass: 0.8 }}
            style={{
              height: `${BACK_PANEL_HEIGHT}px`,
              transformStyle: 'preserve-3d',
              transformOrigin: 'center bottom',
            }}
          >
            <motion.div
              className="absolute inset-0"
              animate={{ rotateX: isHovered ? -15 : 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 25, mass: 0.8 }}
              style={{ transformStyle: 'flat', transformOrigin: 'center bottom' }}
            >
              {[0, 1, 2, 3, 4].map((imgIndex) => {
                const pos = imagePositions[imgIndex];
                const centerIndex = 2;
                const distanceFromCenter = Math.abs(imgIndex - centerIndex);
                const zIndex = 10 - distanceFromCenter;

                const brightness =
                  distanceFromCenter === 0 ? 1 : distanceFromCenter === 1 ? 0.6 : 0.35;
                const yOffset = -16 * (1 - distanceFromCenter / centerIndex) || 0;
                const scale =
                  distanceFromCenter === 0 ? 1.05 : distanceFromCenter === 1 ? 0.95 : 0.88;

                const xPos = isHovered ? pos.x * 1.38 : pos.x;
                const yPos = isHovered ? -12 + yOffset : 6 + yOffset;
                const rotation = isHovered ? pos.rotate * 1.3 : pos.rotate;
                const finalScale = isHovered ? scale * 1.04 : scale;
                const staggerDelay = distanceFromCenter * 0.08;

                const imageUrl =
                  availableImages.length > 0
                    ? availableImages[imgIndex % availableImages.length]
                    : null;

                return (
                  <motion.div
                    key={imgIndex}
                    className="absolute top-0 left-1/2"
                    initial={false}
                    animate={{
                      x: `calc(-50% + ${xPos}px)`,
                      y: yPos,
                      rotate: rotation,
                      scale: finalScale,
                      opacity: 1,
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 100,
                      damping: 16,
                      mass: 1,
                      delay: staggerDelay,
                      opacity: { duration: 0.35, ease: 'easeOut', delay: staggerDelay },
                    }}
                    style={{ zIndex }}
                  >
                    <div className="h-[156px] w-[98px] overflow-hidden rounded-[12px] ring-1 ring-inset ring-white/5 bg-black/80">
                      {imageUrl ? (
                        <motion.img
                          src={imageUrl}
                          alt={`Preview ${imgIndex + 1}`}
                          className="h-full w-full object-cover"
                          animate={{
                            filter: `brightness(${isHovered ? Math.min(1, brightness + 0.2) : brightness}) contrast(1.08) saturate(${1 - distanceFromCenter * 0.2})`,
                          }}
                          transition={{ duration: 0.3, ease: MOTION_EASINGS.CINEMATIC }}
                        />
                      ) : (
                        <div className="center h-full w-full bg-black/60 text-white/50">
                          <Icon icon="solar:gallery-wide-bold" size={20} />
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.div>

          <motion.div
            className="absolute right-0 bottom-0 left-0 z-10 overflow-hidden rounded-b-[20px] ring-1 ring-inset ring-white/5 bg-black/80"
            animate={{
              rotateX: isHovered ? -25 : 0,
            }}
            transition={{
              rotateX: { type: 'spring', stiffness: 180, damping: 22, mass: 0.8 },
              backgroundColor: { duration: 0.3, ease: MOTION_EASINGS.CINEMATIC },
            }}
            style={{ transformOrigin: 'center bottom' }}
          >
            <div className="relative px-4 py-4">
              <h3 className="line-clamp-1 text-lg leading-[1.22] font-semibold text-white transition-all duration-300 ease-in-out group-hover:text-white">
                {listTitle}
              </h3>
              <p
                className={`mt-1 line-clamp-2 text-xs leading-relaxed ${
                  listDescription ? 'font-normal text-white/50' : 'font-normal text-white/50 italic'
                }`}
              >
                {listDescription || 'No description'}
              </p>
            </div>
            <div className="relative h-11 border-t border-white/5">
              <div
                className={`absolute inset-0 flex items-center justify-between pl-3 text-sm text-white/70 ${
                  hasActions ? 'pr-1.5' : 'pr-3'
                }`}
              >
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <Icon icon="solar:calendar-mark-bold" size={14} />
                  <span>{updatedLabel}</span>
                </div>
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 whitespace-nowrap">
                      <Icon icon="solar:list-broken" size={14} />
                      <span>{itemsCount}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 whitespace-nowrap">
                      <Icon icon="solar:heart-bold" size={14} />
                      <span>{likesCount}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 whitespace-nowrap">
                      <Icon icon="solar:chat-round-bold" size={14} />
                      <span>{reviewsCount}</span>
                    </span>
                  </div>
                  {actionsElement ? (
                    <div
                      className="shrink-0"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                    >
                      {actionsElement}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </Link>
    </article>
  );
}
