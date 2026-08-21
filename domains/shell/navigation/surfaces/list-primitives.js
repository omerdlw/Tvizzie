'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { TMDB_IMG } from '@/shared/constants';
import { NAV_FADE_TRANSITION, NAV_MICRO_TRANSITION, NAV_TAP_SCALE } from '@/modules/nav/motion';
import { cn } from '@/ui/class-names';
import { formatYear } from '@/shared/format';
import { SEARCH_TYPES } from '@/domains/search/utils/constants';
import { SEARCH_STYLES } from '@/domains/shell/navigation/actions/constants';
import {
  getPreferredMoviePosterSrc,
  usePosterPreferenceVersion,
} from '@/domains/media/utils/poster-preferences';
import AdaptiveImage from '@/ui/components/adaptive-image';
import Icon from '@/ui/primitives/icon';

// --- CONSTANTS ---

export const LIST_SEARCH_TAB_ITEMS = Object.freeze([
  { key: SEARCH_TYPES.ALL, label: 'All' },
  { key: SEARCH_TYPES.MOVIE, label: 'Movies' },
  { key: SEARCH_TYPES.TV, label: 'TV' },
]);

export const SURFACE_LIST_VARIANTS = Object.freeze({
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: NAV_FADE_TRANSITION },
  exit: { opacity: 0, transition: NAV_MICRO_TRANSITION },
});

export const SURFACE_LIST_ITEM_VARIANTS = Object.freeze({
  hidden: { opacity: 0, y: 8 },
  visible: (index = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      ...NAV_MICRO_TRANSITION,
      delay: Math.min(Math.max(index, 0) * 0.04, 0.24),
    },
  }),
  exit: { opacity: 0, y: -4, transition: NAV_MICRO_TRANSITION },
});

// --- DATA NORMALIZERS & HELPERS ---

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

// --- SHARED UI PRIMITIVES ---

export const SearchResultRow = memo(function SearchResultRow({ item, isAdded, onAdd, onRemove }) {
  const title = getItemDisplayTitle(item);
  const year = getItemYear(item);
  const isTv = item?.media_type === 'tv' || item?.entityType === 'tv';
  const posterSrc =
    item?.poster_path || item?.posterPath
      ? `${TMDB_IMG}/w92${item.poster_path || item.posterPath}`
      : undefined;

  return (
    <motion.button
      type="button"
      variants={SURFACE_LIST_ITEM_VARIANTS}
      initial="hidden"
      animate="visible"
      onClick={() => (isAdded ? onRemove?.(item) : onAdd?.(item))}
      aria-label={isAdded ? `Remove ${title} from list` : `Add ${title} to list`}
      className={cn(
        SEARCH_STYLES.resultItem,
        'group/result w-full gap-2 border text-left active:scale-[0.995]',
        isAdded
          ? 'border-info/20 bg-info/5 hover:border-error/20 hover:bg-error/5'
          : 'border-transparent',
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <div className={SEARCH_STYLES.thumbnail}>
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
            <span className="truncate text-xs font-semibold text-white/90 group-hover/result:text-white">
              {title}
            </span>
            <span className="shrink-0 text-[10px] text-white/30 uppercase">
              {isTv ? 'TV' : 'Movie'}
            </span>
          </div>
          {year ? <p className="text-[11px] text-white/40">{year}</p> : null}
        </div>
      </div>

      <div className="shrink-0 text-white/40 transition-colors duration-150">
        {isAdded ? (
          <span className="text-info group-hover/result:text-error inline-flex items-center gap-1 text-[11px] font-medium">
            <Icon icon="solar:check-circle-bold" size={15} className="group-hover/result:hidden" />
            <Icon
              icon="solar:trash-bin-trash-bold"
              size={15}
              className="hidden group-hover/result:inline"
            />
            <span className="group-hover/result:hidden">Added</span>
            <span className="hidden group-hover/result:inline">Remove</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium group-hover/result:text-white">
            <Icon icon="solar:add-circle-bold" size={15} />
            <span>Add</span>
          </span>
        )}
      </div>
    </motion.button>
  );
});

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
      className="group/item flex items-center justify-between gap-2 border border-white/5 bg-white/[0.02] p-1.5 transition-colors duration-150 hover:border-white/10 hover:bg-white/[0.04]"
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="w-4 text-center text-[11px] font-medium text-white/30">{index + 1}</span>
        <div className="h-9 w-6 shrink-0 overflow-hidden bg-white/5">
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
            <span className="truncate text-xs font-medium text-white/90">{title}</span>
            <span className="shrink-0 text-[10px] text-white/30 uppercase">
              {isTv ? 'TV' : 'Movie'}
            </span>
          </div>
          {year ? <p className="text-[10px] text-white/40">{year}</p> : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        {onMoveUp && onMoveDown ? (
          <div className="flex items-center">
            <motion.button
              type="button"
              whileTap={NAV_TAP_SCALE}
              onClick={() => onMoveUp(index)}
              disabled={index === 0}
              aria-label="Move item up"
              className="center h-7 w-7 text-white/40 transition-colors duration-150 hover:text-white disabled:cursor-not-allowed disabled:opacity-20"
            >
              <Icon icon="solar:arrow-up-linear" size={14} />
            </motion.button>
            <motion.button
              type="button"
              whileTap={NAV_TAP_SCALE}
              onClick={() => onMoveDown(index)}
              disabled={index === totalItems - 1}
              aria-label="Move item down"
              className="center h-7 w-7 text-white/40 transition-colors duration-150 hover:text-white disabled:cursor-not-allowed disabled:opacity-20"
            >
              <Icon icon="solar:arrow-down-linear" size={14} />
            </motion.button>
          </div>
        ) : null}

        <motion.button
          type="button"
          whileTap={NAV_TAP_SCALE}
          onClick={() => onRemove(item)}
          aria-label={`Remove ${title} from list`}
          className="center hover:text-error h-7 w-7 text-white/40 transition-colors duration-150"
        >
          <Icon icon="solar:trash-bin-trash-bold" size={14} />
        </motion.button>
      </div>
    </motion.div>
  );
});

export const ListPreviewStack = memo(function ListPreviewStack({ list }) {
  usePosterPreferenceVersion();
  const previewItems = Array.isArray(list?.previewItems) ? list.previewItems.slice(0, 4) : [];

  if (previewItems.length === 0) {
    return (
      <div className="center absolute bottom-0 left-0 h-[68px] w-[46px] border border-dashed border-white/10 bg-black text-white/50">
        <Icon icon="solar:list-bold" size={20} />
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
            className="border-primary absolute bottom-0 overflow-hidden border bg-black"
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
