'use client';

import { useMemo, useState } from 'react';

import Link from 'next/link';

import { motion } from 'framer-motion';

import { TMDB_IMG } from '@/core/constants';
import Icon from '@/ui/icon';

const CARD_SCALE = 1.08;
const BACK_PANEL_HEIGHT = Math.round(172 * CARD_SCALE);
const POSTER_WIDTH = Math.round(96 * CARD_SCALE);
const POSTER_HEIGHT = Math.round(152 * CARD_SCALE);
const POSTER_SPREAD = 148 * CARD_SCALE;
const STACK_SIZE = 5;

function getPreviewImage(item) {
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

function getPosterMetrics(index, count, isHovered) {
  const centerIndex = (count - 1) / 2;
  const distance = index - centerIndex;
  const depth = Math.abs(distance);
  const totalSpread = POSTER_SPREAD;
  const step = count > 1 ? totalSpread / (count - 1) : 0;
  const startX = -totalSpread / 2;
  const baseX = count > 1 ? startX + step * index : 0;
  const normalizedPosition = count > 1 ? (index / (count - 1)) * 2 - 1 : 0;
  const baseRotate = normalizedPosition * 11;
  const liftByDepth = depth === 0 ? -12 * CARD_SCALE : depth === 1 ? -6 * CARD_SCALE : 0;
  const baseScale = depth === 0 ? 1.04 : depth === 1 ? 0.94 : 0.85;

  return {
    brightness: depth === 0 ? 1 : depth === 1 ? (isHovered ? 0.74 : 0.55) : isHovered ? 0.48 : 0.3,
    rotate: isHovered ? baseRotate * 1.15 : baseRotate,
    scale: isHovered ? baseScale * 1.02 : baseScale,
    x: isHovered ? baseX * 1.12 : baseX,
    y: (isHovered ? -18 : -8) * CARD_SCALE + liftByDepth,
    zIndex: 10 - depth,
  };
}

function PreviewPoster({ index, isHovered, item, total }) {
  const imageSrc = getPreviewImage(item);
  const { brightness, rotate, scale, x, y, zIndex } = getPosterMetrics(index, total, isHovered);

  return (
    <motion.div
      className="absolute top-0 left-1/2"
      initial={false}
      animate={{
        x: `calc(-50% + ${x}px)`,
        y,
        rotate,
        scale,
      }}
      transition={{
        type: 'spring',
        stiffness: 110,
        damping: 18,
        mass: 0.95,
      }}
      style={{ zIndex }}
    >
      <div
        className="overflow-hidden rounded-[14px]"
        style={{
          height: `${POSTER_HEIGHT}px`,
          width: `${POSTER_WIDTH}px`,
        }}
      >
        {imageSrc ? (
          <motion.img
            src={imageSrc}
            alt={item.title || item.name || 'Poster'}
            className="h-full w-full object-cover"
            initial={false}
            animate={{
              filter: `brightness(${brightness}) contrast(1.08) saturate(${1 - Math.abs(index - (total - 1) / 2) * 0.2}) blur(${isHovered ? 0 : Math.abs(index - (total - 1) / 2) * 0.75}px)`,
            }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          />
        ) : (
          <div className="center h-full w-full bg-white/75 text-black/40">
            <Icon icon="solar:videocamera-record-bold" size={20} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

function PlaceholderPoster({ index, isHovered, total }) {
  const { rotate, scale, x, y, zIndex } = getPosterMetrics(index, total, isHovered);

  return (
    <motion.div
      className="absolute top-0 left-1/2"
      initial={false}
      animate={{
        x: `calc(-50% + ${x}px)`,
        y,
        rotate,
        scale,
      }}
      transition={{
        type: 'spring',
        stiffness: 110,
        damping: 18,
        mass: 0.95,
      }}
      style={{ zIndex }}
    >
      <div
        className="rounded-[14px] border border-dashed border-black/10 bg-white"
        style={{
          height: `${POSTER_HEIGHT}px`,
          width: `${POSTER_WIDTH}px`,
        }}
      />
    </motion.div>
  );
}

function buildPreviewSlots(previewItems) {
  const items = Array.isArray(previewItems) ? previewItems.slice(0, STACK_SIZE) : [];
  const placeholdersBefore = Math.floor((STACK_SIZE - items.length) / 2);
  const slots = Array.from({ length: STACK_SIZE }, () => null);

  items.forEach((item, index) => {
    slots[placeholdersBefore + index] = item;
  });

  return slots;
}

export default function AccountListCard({ list, ownerUsername = null, renderActions = null }) {
  const [isHovered, setIsHovered] = useState(false);

  const previewItems = useMemo(
    () => (Array.isArray(list?.previewItems) ? list.previewItems.slice(0, STACK_SIZE) : []),
    [list?.previewItems]
  );
  const previewSlots = useMemo(() => buildPreviewSlots(previewItems), [previewItems]);
  const listTitle = String(list?.title || '').trim() || 'Untitled List';
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

  return (
    <motion.article
      className="relative w-full"
      initial={false}
      animate={{
        scale: isHovered ? 1.02 : 1,
        y: isHovered ? -5 : 0,
      }}
      transition={{
        type: 'spring',
        stiffness: 220,
        damping: 22,
        mass: 0.9,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={getListHref(list, ownerUsername)} className="block">
        <div
          className="relative w-full rounded-[14px]"
          style={{
            perspective: '1200px',
          }}
        >
          <motion.div
            className="relative z-0 rounded-[14px] border border-black/15 bg-white"
            initial={false}
            animate={{
              rotateX: isHovered ? 12 : 0,
            }}
            transition={{
              type: 'spring',
              stiffness: 180,
              damping: 22,
              mass: 0.85,
            }}
            style={{
              height: `${BACK_PANEL_HEIGHT}px`,
              transformOrigin: 'center bottom',
              transformStyle: 'preserve-3d',
            }}
          >
            <motion.div
              className="absolute inset-0"
              initial={false}
              animate={{
                rotateX: isHovered ? -12 : 0,
              }}
              transition={{
                type: 'spring',
                stiffness: 180,
                damping: 22,
                mass: 0.85,
              }}
              style={{
                transformOrigin: 'center bottom',
                transformStyle: 'flat',
              }}
            >
              {previewSlots.map((item, index) =>
                item ? (
                  <PreviewPoster
                    key={item.mediaKey || `${item.entityType}-${item.entityId}-${index}`}
                    index={index}
                    isHovered={isHovered}
                    item={item}
                    total={previewSlots.length}
                  />
                ) : (
                  <PlaceholderPoster
                    key={`placeholder-${index}`}
                    index={index}
                    isHovered={isHovered}
                    total={previewSlots.length}
                  />
                )
              )}
            </motion.div>
          </motion.div>

          <motion.div
            className="absolute right-0 bottom-0 left-0 z-10 overflow-hidden rounded-[14px] border border-black/20 bg-white/85"
            initial={false}
            animate={{
              rotateX: isHovered ? -20 : 0,
            }}
            transition={{
              type: 'spring',
              stiffness: 170,
              damping: 22,
              mass: 0.85,
            }}
            style={{
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              transformOrigin: 'center bottom',
              transformStyle: 'preserve-3d',
            }}
          >
            <div className="relative px-4 py-4">
              <h3 className="line-clamp-2 min-h-[2.6rem] text-[19px] leading-[1.22] font-semibold text-black">
                {listTitle}
              </h3>
            </div>

            <div className="relative h-11 border-t border-black/10">
              <div className="absolute inset-0 flex items-center justify-between px-3 text-[13px] text-black/70">
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
                  {typeof renderActions === 'function' ? (
                    <div
                      className="shrink-0"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                    >
                      {renderActions(list)}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </Link>
    </motion.article>
  );
}
