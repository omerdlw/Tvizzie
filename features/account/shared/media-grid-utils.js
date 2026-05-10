import { TMDB_IMG } from '@/core/constants';
import { getPreferredMoviePosterSrc } from '@/features/media/poster-overrides';

export const ACCOUNT_MEDIA_GRID_ITEMS_PER_PAGE = 36;

function getMediaType(item) {
  const explicitType = item?.media_type || item?.entityType;

  if (explicitType === 'movie') {
    return explicitType;
  }

  return null;
}

function getMediaTitle(item) {
  return item?.title || item?.original_title || 'Untitled';
}

function getMediaYear(item) {
  return item?.release_date?.slice?.(0, 4) || null;
}

function getMediaPoster(item) {
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

export function buildAccountMediaGridCards(items = []) {
  return items
    .map((item) => {
      const mediaType = getMediaType(item);
      const detailId = item?.entityId || item?.id;

      if (!detailId || mediaType !== 'movie') {
        return null;
      }

      const mediaTitle = getMediaTitle(item);
      const year = getMediaYear(item);

      return {
        href: `/${mediaType}/${detailId}`,
        id: item?.mediaKey || `${mediaType}-${detailId}`,
        imageAlt: mediaTitle,
        imageSrc: getMediaPoster(item),
        item,
        tooltipText: year ? `${mediaTitle} (${year})` : mediaTitle,
      };
    })
    .filter(Boolean);
}
