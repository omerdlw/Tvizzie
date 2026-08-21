'use client';

import { memo } from 'react';
import { TMDB_IMG } from '@/shared/constants';
import { cn } from '@/ui/class-names';
import {
  getPreferredMoviePosterSrc,
  usePosterPreferenceVersion,
} from '@/domains/media/utils/poster-preferences';
import AdaptiveImage from '@/ui/components/adaptive-image';
import Icon from '@/ui/primitives/icon';

function getPreviewImage(item) {
  if (!item) return null;
  if (typeof item === 'string') {
    if (item.startsWith('http://') || item.startsWith('https://')) return item;
    if (item.startsWith('/')) return `${TMDB_IMG}/w342${item}`;
    return item;
  }
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

  if (item?.posterPath) {
    return `${TMDB_IMG}/w342${item.posterPath}`;
  }

  if (item?.coverUrl) {
    return item.coverUrl;
  }

  return null;
}

export default memo(function ListPreviewComposition({
  className = '',
  emptyIcon = 'solar:list-bold',
  imageClassName = 'h-full w-full object-cover',
  items = [],
  fallbackPoster = null,
}) {
  usePosterPreferenceVersion();
  let rawItems = Array.isArray(items) ? items.filter(Boolean) : [];
  if (rawItems.length === 0 && fallbackPoster) {
    rawItems = [{ poster_path: fallbackPoster }];
  }
  const previewItems = rawItems.slice(0, 4);

  if (previewItems.length === 0) {
    return (
      <div className={cn('relative h-[68px] w-[82px] shrink-0', className)}>
        <div className="center absolute bottom-0 left-0 h-[68px] w-[46px] border border-dashed border-white/10 bg-black text-white/50">
          <Icon icon={emptyIcon} size={20} />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative h-[68px] w-[82px] shrink-0', className)}>
      {previewItems.map((item, index) => {
        const imageSrc = getPreviewImage(item);
        return (
          <div
            key={
              item.mediaKey ||
              `${item.entityType || 'movie'}-${item.entityId || item.id || index}-${index}`
            }
            className="border-primary absolute bottom-0 overflow-hidden border bg-black shadow-md"
            style={{
              width: '46px',
              height: `${68 - index * 6}px`,
              left: `${index * 12}px`,
              zIndex: previewItems.length - index,
            }}
          >
            {imageSrc ? (
              <AdaptiveImage
                mode="img"
                src={imageSrc}
                alt={item.title || item.name || 'Poster'}
                loading="lazy"
                decoding="async"
                className={imageClassName}
                wrapperClassName="h-full w-full"
              />
            ) : (
              <div className="center h-full w-full bg-white/5 text-white/50">
                <Icon icon="solar:gallery-wide-bold" size={16} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});
