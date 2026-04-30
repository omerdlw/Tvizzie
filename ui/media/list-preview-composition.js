'use client';

import { TMDB_IMG } from '@/core/constants';
import { cn } from '@/core/utils';
import { getPreferredMoviePosterSrc, usePosterPreferenceVersion } from '@/features/media/poster-overrides';
import AdaptiveImage from '@/ui/elements/adaptive-image';
import Icon from '@/ui/icon';

function getPreviewImage(item) {
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

export default function ListPreviewComposition({
  className = '',
  emptyIcon = 'solar:list-broken',
  imageClassName = 'h-full w-full object-cover',
  items = [],
}) {
  usePosterPreferenceVersion();
  const previewItems = Array.isArray(items) ? items.slice(0, 3) : [];

  return (
    <div className={cn('grid h-full w-full grid-cols-3 overflow-hidden', className)}>
      {previewItems.length > 0 ? (
        previewItems.map((item, index) => (
          <div
            key={item.mediaKey || `${item.entityType || 'movie'}-${item.entityId || item.id || index}-${index}`}
            className="h-full overflow-hidden"
          >
            {getPreviewImage(item) ? (
              <AdaptiveImage
                mode="img"
                src={getPreviewImage(item)}
                alt={item.title || item.name || 'Poster'}
                loading="lazy"
                decoding="async"
                className={imageClassName}
                wrapperClassName="h-full w-full"
              />
            ) : (
              <div className="center h-full w-full">
                <Icon icon="solar:videocamera-record-bold" size={16} />
              </div>
            )}
          </div>
        ))
      ) : (
        <div className="center col-span-3 h-full w-full">
          <Icon icon={emptyIcon} size={20} />
        </div>
      )}
    </div>
  );
}
