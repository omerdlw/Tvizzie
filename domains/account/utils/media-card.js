import { TMDB_IMG } from '@/shared/constants';
import { getPreferredMoviePosterSrc } from '@/domains/media/utils/poster-overrides';

export function toAccountMediaCard(item = {}) {
  const mediaType = item.media_type || item.entityType;
  const detailId = item.entityId || item.id;
  if (!detailId || (mediaType !== 'movie' && mediaType !== 'tv')) return null;

  const title = item.title || item.original_title || item.name || item.original_name || 'Untitled';
  const year = item.release_date?.slice?.(0, 4) || item.first_air_date?.slice?.(0, 4) || null;
  const preferredPoster = mediaType === 'movie' ? getPreferredMoviePosterSrc(item, 'w342') : null;
  const imageSrc =
    preferredPoster ||
    item.poster_path_full ||
    (item.poster_path ? `${TMDB_IMG}/w342${item.poster_path}` : null);

  return {
    href: `/${mediaType}/${detailId}`,
    id: item.mediaKey || `${mediaType}-${detailId}`,
    imageAlt: title,
    imageSrc,
    item,
    tooltipText: year ? `${title} (${year})` : title,
  };
}
