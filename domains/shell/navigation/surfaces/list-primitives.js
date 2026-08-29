'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { TMDB_IMG } from '@/shared';
import { NAV_TAP_SCALE, navFadeVariants, navListItemVariants } from '@/modules/nav';
import { cn } from '@/ui/class-names';
import { formatYear } from '@/shared';
import { SEARCH_TYPES } from '@/domains/search/utils/constants';
import { SEARCH_STYLES } from '@/domains/shell/navigation/actions/constants';
import {
  getPreferredMoviePosterSrc,
  usePosterPreferenceVersion,
} from '@/domains/media/utils/poster-preferences';
import AdaptiveImage from '@/ui/components/adaptive-image';
import { Button, Tooltip } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';

export const LIST_SEARCH_TAB_ITEMS = Object.freeze([
  { key: SEARCH_TYPES.ALL, label: 'All' },
  { key: SEARCH_TYPES.MOVIE, label: 'Movies' },
  { key: SEARCH_TYPES.TV, label: 'TV' },
]);

export const SURFACE_LIST_VARIANTS = navFadeVariants;
export const SURFACE_LIST_ITEM_VARIANTS = navListItemVariants;

export function normalizeSearchResult(item = {}) {
  const entityType = String(item?.media_type || item?.entityType || item?.entity_type || '')
    .trim()
    .toLowerCase();
  if (entityType !== 'movie' && entityType !== 'tv') return null;

  const entityId = String(item?.id ?? item?.entityId ?? item?.entity_id ?? '').trim();
  const title = String(item?.title || item?.original_title || '').trim();
  const name = String(item?.name || item?.original_name || '').trim();
  if (!entityId || (!title && !name)) return null;

  return {
    backdrop_path: item?.backdrop_path || item?.backdropPath || null,
    entityId,
    entityType,
    genre_ids: Array.isArray(item?.genre_ids)
      ? item.genre_ids
      : Array.isArray(item?.genreIds)
        ? item.genreIds
        : [],
    id: entityId,
    media_type: entityType,
    name,
    popularity: Number.isFinite(Number(item?.popularity)) ? Number(item.popularity) : null,
    poster_path: item?.poster_path || item?.posterPath || item?.coverUrl || null,
    first_air_date: item?.first_air_date || item?.firstAirDate || null,
    release_date: item?.release_date || item?.releaseDate || null,
    title: title || name,
    vote_average: Number.isFinite(Number(item?.vote_average)) ? Number(item.vote_average) : null,
    vote_count: Number.isFinite(Number(item?.vote_count)) ? Number(item.vote_count) : null,
  };
}

export function normalizeListItem(item = {}) {
  if (!item) return null;
  const entityType =
    String(item?.entityType || item?.entity_type || item?.media_type || item?.mediaType || 'movie')
      .trim()
      .toLowerCase() === 'tv'
      ? 'tv'
      : 'movie';
  const rawId = String(
    item?.entityId || item?.entity_id || item?.id || item?.mediaKey || item?.media_key || '',
  ).trim();
  const entityId = rawId.replace(/^(movie|tv)[-_]/, '');
  const title = String(
    item?.title || item?.name || item?.original_title || item?.original_name || '',
  ).trim();
  const name = String(item?.name || item?.original_name || title).trim();
  if (!entityId && !title) return null;

  return {
    backdrop_path: item?.backdrop_path || item?.backdropPath || null,
    entityId: entityId || 'unknown',
    entityType,
    genre_ids: Array.isArray(item?.genre_ids)
      ? item.genre_ids
      : Array.isArray(item?.genreIds)
        ? item.genreIds
        : [],
    id: entityId || 'unknown',
    media_type: entityType,
    name,
    popularity: Number.isFinite(Number(item?.popularity)) ? Number(item.popularity) : null,
    poster_path: item?.poster_path || item?.posterPath || item?.coverUrl || null,
    first_air_date: item?.first_air_date || item?.firstAirDate || null,
    release_date: item?.release_date || item?.releaseDate || null,
    title: title || name || 'Untitled',
    vote_average: Number.isFinite(Number(item?.vote_average)) ? Number(item.vote_average) : null,
    vote_count: Number.isFinite(Number(item?.vote_count)) ? Number(item.vote_count) : null,
    mediaKey: `${entityType}_${entityId}`,
    position: Number.isFinite(Number(item?.position)) ? Number(item.position) : null,
  };
}

export function getDraftMediaKey(item) {
  if (!item) return '';
  const type =
    String(item?.entityType || item?.entity_type || item?.media_type || 'movie')
      .trim()
      .toLowerCase() === 'tv'
      ? 'tv'
      : 'movie';
  const rawId = String(
    item?.entityId || item?.entity_id || item?.id || item?.mediaKey || item?.media_key || '',
  ).trim();
  const cleanId = rawId.replace(/^(movie|tv)[-_]/, '');
  return `${type}_${cleanId}`;
}

export function getItemDisplayTitle(item) {
  return item?.title || item?.name || 'Untitled';
}

export function getItemYear(item) {
  return formatYear(
    item?.release_date || item?.first_air_date || item?.firstAirDate || item?.releaseDate,
  );
}

export function getPreviewImage(item) {
  return (
    getPreferredMoviePosterSrc(item, 'w342') ||
    item?.poster_path_full ||
    (item?.poster_path ? `${TMDB_IMG}/w342${item.poster_path}` : null) ||
    (item?.posterPath ? `${TMDB_IMG}/w342${item.posterPath}` : null)
  );
}

export function getChangedListIds(lists, initialMemberships, draftMemberships) {
  return lists
    .map((list) => list.id)
    .filter((id) => Boolean(initialMemberships[id]) !== Boolean(draftMemberships[id]));
}

export function handleListWheel(event) {
  const listViewport = event.currentTarget;
  if (!listViewport || listViewport.scrollHeight <= listViewport.clientHeight) return;

  event.preventDefault();
  event.stopPropagation();

  const maxScrollTop = listViewport.scrollHeight - listViewport.clientHeight;
  listViewport.scrollTop = Math.min(
    maxScrollTop,
    Math.max(0, listViewport.scrollTop + event.deltaY),
  );
}

export const SearchResultPosterItem = memo(function SearchResultPosterItem({
  item,
  isAdded,
  onAdd,
  onRemove,
}) {
  const title = getItemDisplayTitle(item);
  const year = getItemYear(item);
  const isTv = item?.media_type === 'tv' || item?.entityType === 'tv';
  const typeLabel = isTv ? 'TV' : 'Movie';
  const imagePath = item?.poster_path || item?.posterPath;
  const posterSrc = imagePath ? `${TMDB_IMG}/w342${imagePath}` : undefined;

  const tooltipText = (
    <div className="flex max-w-[200px] flex-col items-center gap-0.5 py-0.5 text-center">
      <span className="text-xs leading-snug font-bold text-black">{title}</span>
      <span className="text-xs font-semibold text-black/80">
        {[year, typeLabel].filter(Boolean).join(' • ')}
      </span>
    </div>
  );

  return (
    <Tooltip position="top" text={tooltipText}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => (isAdded ? onRemove?.(item) : onAdd?.(item))}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (isAdded) onRemove?.(item);
            else onAdd?.(item);
          }
        }}
        className={cn(
          'group/poster relative aspect-[2/3] w-full cursor-pointer overflow-hidden rounded-[20px] ring-1 ring-inset transition-all duration-300 ease-in-out',
          isAdded
            ? 'ring-info/40 ring-info/30 bg-white/10 ring-1'
            : 'ring-white/5 bg-white/5 hover:ring-white/40',
        )}
      >
        {posterSrc ? (
          <AdaptiveImage
            fill
            src={posterSrc}
            alt={title}
            sizes="(max-width: 640px) 25vw, 120px"
            className="rounded-[20px] object-cover transition-transform duration-300 ease-out group-hover/poster:scale-105"
            wrapperClassName="h-full w-full rounded-[20px]"
          />
        ) : (
          <div className="center text-error h-full w-full">
            <Icon icon="solar:gallery-bold" size={22} />
          </div>
        )}

        <Button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isAdded) onRemove?.(item);
            else onAdd?.(item);
          }}
          aria-label={isAdded ? `Remove ${title} from list` : `Add ${title} to list`}
          className={cn(
            'center absolute top-1.5 right-1.5 z-10 size-6 cursor-pointer rounded-full ring-1 ring-inset backdrop-blur-md transition-all duration-200',
            isAdded
              ? 'ring-info/40 bg-info/40 text-info hover:ring-error/40 hover:bg-error/30 hover:text-error hover:scale-110'
              : 'ring-white/15 bg-black/50 text-white/70 hover:scale-110 hover:ring-white/40 hover:bg-black/80 hover:text-white',
          )}
        >
          {isAdded ? (
            <>
              <Icon
                icon="material-symbols:check-rounded"
                size={14}
                className="group-hover/poster:hidden"
              />
              <Icon
                icon="solar:trash-bin-trash-bold"
                size={14}
                className="hidden group-hover/poster:inline"
              />
            </>
          ) : (
            <Icon icon="solar:add-circle-bold" size={14} />
          )}
        </Button>
      </div>
    </Tooltip>
  );
});

export const SearchResultRow = SearchResultPosterItem;

export const SelectedListItemRow = memo(function SelectedListItemRow({
  item,
  index,
  totalItems,
  onMoveUp,
  onMoveDown,
  onRemove,
}) {
  const title = getItemDisplayTitle(item);
  const year = getItemYear(item);
  const isTv = item?.media_type === 'tv' || item?.entityType === 'tv';
  const posterSrc =
    item?.poster_path || item?.posterPath
      ? `${TMDB_IMG}/w92${item.poster_path || item.posterPath}`
      : undefined;

  return (
    <motion.div
      layout="position"
      variants={SURFACE_LIST_ITEM_VARIANTS}
      initial="hidden"
      animate="visible"
      exit="exit"
      custom={index}
      className="group/item flex items-center justify-between gap-2.5 rounded-[20px] ring-1 ring-inset ring-white/5 bg-white/5 p-2 text-white/70 transition-colors duration-150 hover:ring-white/10 hover:bg-white/10 hover:text-white"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="w-4 text-center text-xs font-medium text-white/40">{index + 1}</span>
        <div className="h-9 w-6 shrink-0 overflow-hidden rounded-md bg-white/5">
          <AdaptiveImage
            mode="img"
            src={posterSrc}
            alt={title}
            className="h-full w-full object-cover"
            wrapperClassName="h-full w-full bg-white/10"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-xs font-medium text-white/70">{title}</span>
            <span className="shrink-0 text-xs text-white/40 uppercase">
              {isTv ? 'TV' : 'Movie'}
            </span>
          </div>
          {year ? <p className="text-xs text-white/40">{year}</p> : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        {onMoveUp && onMoveDown ? (
          <div className="flex items-center">
            <Button
              type="button"
              onClick={() => onMoveUp(index)}
              disabled={index === 0}
              aria-label="Move item up"
              className="center h-7 w-7 rounded-lg text-white/40 transition-all duration-300 ease-in-out hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon icon="solar:arrow-up-linear" size={14} />
            </Button>
            <Button
              type="button"
              onClick={() => onMoveDown(index)}
              disabled={index === totalItems - 1}
              aria-label="Move item down"
              className="center h-7 w-7 rounded-lg text-white/40 transition-all duration-300 ease-in-out hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon icon="solar:arrow-down-linear" size={14} />
            </Button>
          </div>
        ) : null}

        <Button
          type="button"
          onClick={() => onRemove(item)}
          aria-label={`Remove ${title} from list`}
          className="center hover:text-error h-7 w-7 rounded-lg text-white/40 transition-all duration-300 ease-in-out"
        >
          <Icon icon="solar:trash-bin-trash-bold" size={14} />
        </Button>
      </div>
    </motion.div>
  );
});

export const ListPreviewStack = memo(function ListPreviewStack({ list }) {
  usePosterPreferenceVersion();
  const previewItems = Array.isArray(list?.previewItems) ? list.previewItems.slice(0, 4) : [];

  if (previewItems.length === 0) {
    return (
      <div className="relative h-[68px] w-[82px] shrink-0">
        <div className="center absolute bottom-0 left-0 h-[68px] w-[46px] overflow-hidden rounded-[14px] ring-1 ring-inset  ring-white/10 bg-black text-white/40">
          <Icon icon="solar:list-bold" size={20} />
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[68px] w-[82px] shrink-0">
      {previewItems.map((item, index) => {
        const imageSrc = getPreviewImage(item);
        return (
          <div
            key={item.mediaKey || `${item.entityType}-${item.entityId}-${index}`}
            className="ring-primary absolute bottom-0 overflow-hidden rounded-[14px] ring-1 ring-inset bg-black"
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
                className="h-full w-full object-cover"
                wrapperClassName="h-full w-full "
              />
            ) : (
              <div className="center h-full w-full bg-white/5 text-white/40">
                <Icon icon="solar:filmstrip-bold" size={14} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});
