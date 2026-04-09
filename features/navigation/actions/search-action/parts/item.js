'use client';

import Image from 'next/image';
import Link from 'next/link';

import { TMDB_IMG } from '@/core/constants';
import { applyAvatarFallback, getUserAvatarFallbackUrl, getUserAvatarUrl } from '@/core/utils';
import Icon from '@/ui/icon';

import { SEARCH_STYLES, SEARCH_TYPES } from '../constants';
import { getDetailPath, getImagePath, getItemDirector, getItemStatus, getItemTitle, getItemYear } from '../utils';

export default function SearchResultItem({ item, imageErrors, onImageError, onSelect }) {
  const title = getItemTitle(item);
  const year = getItemYear(item);
  const director = getItemDirector(item);
  const status = getItemStatus(item);
  const imagePath = getImagePath(item);
  const itemKey = `${item.media_type}-${item.id}`;
  const hasImageError = imageErrors[itemKey];
  const detailPath = getDetailPath(item);
  const userAvatarSrc = item.media_type === SEARCH_TYPES.USER ? getUserAvatarUrl(item) : '';
  const userAvatarFallbackSrc = item.media_type === SEARCH_TYPES.USER ? getUserAvatarFallbackUrl(item) : '';

  return (
    <Link
      href={detailPath || '#'}
      className={SEARCH_STYLES.resultItem}
      onClick={(event) => {
        if (event.button === 0 && !event.ctrlKey && !event.metaKey) {
          onSelect(item);
        }
      }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className={SEARCH_STYLES.thumbnail}>
          {item.media_type === SEARCH_TYPES.USER ? (
            <img
              className="h-full w-full object-cover transition-transform duration-(--motion-duration-moderate)"
              src={userAvatarSrc}
              alt={title}
              onError={(event) => applyAvatarFallback(event, userAvatarFallbackSrc)}
            />
          ) : imagePath && !hasImageError ? (
            <Image
              fill
              alt={title}
              className="object-cover transition-transform duration-(--motion-duration-moderate)"
              onError={() => onImageError(itemKey)}
              src={`${TMDB_IMG}/w92${imagePath}`}
              sizes="64px"
              quality={74}
            />
          ) : (
            <div className={`center h-full w-full text-[#7f1d1d]`}>
              <Icon
                icon={item.media_type === SEARCH_TYPES.PERSON ? 'solar:user-bold' : 'solar:gallery-bold'}
                size={18}
              />
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
    </Link>
  );
}
