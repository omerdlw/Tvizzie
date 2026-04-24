'use client';

import Link from 'next/link';

import { TMDB_IMG } from '@/core/constants';
import {
  applyAvatarFallback,
  getUserAvatarFallbackUrl,
  getUserAvatarUrl,
  resolveImageLoading,
  resolveImageQuality,
} from '@/core/utils';
import AdaptiveImage from '@/ui/elements/adaptive-image';
import Icon from '@/ui/icon';

import { SEARCH_STYLES, SEARCH_TYPES } from '@/features/search/constants';
import { getDetailPath, getImagePath, getItemDirector, getItemTitle, getItemYear } from '@/features/search/utils';

export default function SearchResultItem({ item, imageErrors, onImageError, onSelect }) {
  const title = getItemTitle(item);
  const year = getItemYear(item);
  const director = getItemDirector(item);
  const imagePath = getImagePath(item);
  const itemKey = `${item.media_type}-${item.id}`;
  const hasImageError = imageErrors[itemKey];
  const detailPath = getDetailPath(item);
  const hasDetailPath = Boolean(detailPath);
  const userAvatarSrc = item.media_type === SEARCH_TYPES.USER ? getUserAvatarUrl(item) : '';
  const userAvatarFallbackSrc = item.media_type === SEARCH_TYPES.USER ? getUserAvatarFallbackUrl(item) : '';
  const rowContent = (
    <div className="flex min-w-0 items-center gap-3">
      <div className={SEARCH_STYLES.thumbnail}>
        {item.media_type === SEARCH_TYPES.USER ? (
          <AdaptiveImage
            mode="img"
            className="h-full w-full object-cover transition-transform duration-[500ms]"
            src={userAvatarSrc}
            alt={title}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            onError={(event) => applyAvatarFallback(event, userAvatarFallbackSrc)}
          />
        ) : imagePath && !hasImageError ? (
          <AdaptiveImage
            fill
            alt={title}
            className="object-cover transition-transform duration-[500ms]"
            onError={() => onImageError(itemKey)}
            src={`${TMDB_IMG}/w92${imagePath}`}
            sizes="64px"
            loading={resolveImageLoading()}
            quality={resolveImageQuality('grid')}
            decoding="async"
            wrapperClassName="h-full w-full"
          />
        ) : (
          <div className={`center h-full w-full text-[#7f1d1d]`}>
            <Icon icon={item.media_type === SEARCH_TYPES.PERSON ? 'solar:user-bold' : 'solar:gallery-bold'} size={18} />
          </div>
        )}
      </div>
      <div className="mr-2.5 flex min-w-0 flex-1 flex-col justify-center gap-1.5">
        <span className={`truncate leading-tight font-bold uppercase transition-all`}>{title}</span>
        <div className="flex items-center gap-2">
          {year && (
            <div className={SEARCH_STYLES.metaBadge}>
              <span className="px-2 py-1 text-[10px] font-bold tracking-tight text-black/70">{year}</span>
            </div>
          )}
          {director && (
            <div className={SEARCH_STYLES.metaBadge}>
              <span className="px-2 py-1 text-[10px] font-bold tracking-tight text-black/70">{director}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (!hasDetailPath) {
    return <div className={SEARCH_STYLES.resultItem}>{rowContent}</div>;
  }

  return (
    <Link
      href={detailPath}
      className={SEARCH_STYLES.resultItem}
      onClick={(event) => {
        if (event.button === 0 && !event.ctrlKey && !event.metaKey) {
          onSelect(item);
        }
      }}
    >
      {rowContent}
    </Link>
  );
}
