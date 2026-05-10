import { TMDB_IMG } from '@/core/constants';
import { getPreferredMoviePosterSrc } from '@/features/media/poster-overrides';

const CARD_SCALE = 1.08;

export const BACK_PANEL_HEIGHT = Math.round(172 * CARD_SCALE);
export const POSTER_WIDTH = Math.round(96 * CARD_SCALE);
export const POSTER_HEIGHT = Math.round(152 * CARD_SCALE);
export const STACK_SIZE = 5;

const POSTER_SPREAD = 148 * CARD_SCALE;

export function getPreviewImage(item) {
  const preferredPoster = getPreferredMoviePosterSrc(item, 'w342');
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

export function getListHref(list, ownerUsername = null) {
  const ownerHandle = ownerUsername || list?.ownerSnapshot?.username || list?.ownerId;

  if (!ownerHandle || !list?.slug) {
    return '#';
  }

  return `/account/${ownerHandle}/lists/${list.slug}`;
}

export function formatListDate(value) {
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

export function getPosterMetrics(index, count) {
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
    brightness: depth === 0 ? 1 : depth === 1 ? 0.55 : 0.3,
    rotate: baseRotate,
    scale: baseScale,
    x: baseX,
    y: -8 * CARD_SCALE + liftByDepth,
    zIndex: 10 - depth,
    saturate: 1 - depth * 0.2,
    blur: depth * 0.75,
  };
}

export function buildPreviewSlots(previewItems) {
  const items = Array.isArray(previewItems) ? previewItems.slice(0, STACK_SIZE) : [];
  const placeholdersBefore = Math.floor((STACK_SIZE - items.length) / 2);
  const slots = Array.from({ length: STACK_SIZE }, () => null);

  items.forEach((item, index) => {
    slots[placeholdersBefore + index] = item;
  });

  return slots;
}
