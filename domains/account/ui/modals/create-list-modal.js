'use client';

import { useDeferredValue, useEffect, useState, useTransition, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

import { TMDB_IMG } from '@/shared/constants';
import { useAuth } from '@/modules/auth';
import {
  Container,
  CANCEL_BUTTON_CLASS,
  ACTION_BUTTON_CLASS,
  useModalActions,
} from '@/modules/modal';
import { useToast } from '@/modules/notification';
import { createUserListWithItems } from '@/domains/media/server/lists';
import { TmdbService } from '@/infrastructure/tmdb/services/tmdb-service';
import { cn, formatYear } from '@/shared/utils';
import AdaptiveImage from '@/ui/primitives/adaptive-image';
import { Input } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';

// --- HELPERS ---

function normalizeSearchResult(item = {}) {
  const entityType = String(item?.media_type || item?.entityType || '')
    .trim()
    .toLowerCase();
  if (entityType !== 'movie' && entityType !== 'tv') return null;

  const entityId = String(item?.id ?? item?.entityId ?? '').trim();
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
    poster_path: item?.poster_path || item?.posterPath || null,
    first_air_date: item?.first_air_date || null,
    release_date: item?.release_date || null,
    title: title || name,
    vote_average: Number.isFinite(Number(item?.vote_average)) ? Number(item.vote_average) : null,
    vote_count: Number.isFinite(Number(item?.vote_count)) ? Number(item.vote_count) : null,
  };
}

const getDraftMediaKey = (item) =>
  `${item?.entityType || item?.media_type}-${item?.entityId || item?.id}`;
const getItemDisplayTitle = (item) => item?.title || item?.name || 'Untitled';
const getItemYear = (item) => formatYear(item?.release_date || item?.first_air_date);

const INPUT_STYLES = Object.freeze({
  wrapper:
    'flex h-11 transition-colors duration-150 ease-linear items-center rounded-2xl border border-black/5 bg-black/5 px-4 focus-within:border-black/10 focus-within:bg-white',
  input:
    'h-full w-full bg-transparent text-sm font-medium text-black outline-none placeholder:text-black/50',
});

// --- SUB-COMPONENTS ---

const SearchResultRow = memo(function SearchResultRow({ item, isAdded, onAdd, onRemove, index }) {
  const title = getItemDisplayTitle(item);
  const year = getItemYear(item);
  const isTv = item?.media_type === 'tv' || item?.entityType === 'tv';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: [0.16, 1, 0.24, 1], delay: Math.min(index * 0.04, 0.28) }}
      onClick={() => (isAdded ? onRemove?.(item) : onAdd?.(item))}
      className={cn(
        'group flex w-full cursor-pointer items-center justify-between rounded-2xl border p-1 transition-all duration-150 ease-in-out select-none',
        isAdded
          ? 'border-info/20 bg-info/5 hover:border-error/20 hover:bg-error/5'
          : 'border-transparent bg-white hover:border-black/5 hover:bg-black/5',
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-xl">
          <AdaptiveImage
            mode="img"
            src={item?.poster_path ? `${TMDB_IMG}/w92${item.poster_path}` : undefined}
            alt={title}
            className="h-full w-full object-cover"
            wrapperClassName="h-full w-full bg-black/10"
          />
        </div>

        <div className="mr-2 flex min-w-0 flex-1 flex-col justify-center gap-1.5">
          <span className="truncate text-sm leading-tight font-bold text-black uppercase">
            {title}
          </span>
          <div className="flex items-center gap-2">
            <div className="flex w-fit items-center gap-1 rounded-[8px] border border-black/5">
              <span className="px-2 py-0.5 text-[10px] font-bold tracking-tight text-black/70 uppercase">
                {isTv ? 'TV' : 'Movie'}
              </span>
            </div>
            {year !== 'N/A' && (
              <div className="flex w-fit items-center gap-1 rounded-[8px] border border-black/5">
                <span className="px-2 py-0.5 text-[10px] font-bold tracking-tight text-black/70">
                  {year}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className={cn(
          'mr-1 flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-bold tracking-wider uppercase transition-all duration-150 ease-in-out',
          isAdded
            ? 'border-info/20 bg-info/10 text-info group-hover:border-error/20 group-hover:bg-error/10 group-hover:text-error'
            : 'border-black/10 bg-black/5 text-black/70 group-hover:border-transparent group-hover:bg-black group-hover:text-white',
        )}
      >
        {isAdded ? (
          <>
            <Icon icon="solar:check-circle-bold" size={16} className="group-hover:hidden" />
            <Icon
              icon="solar:trash-bin-trash-bold"
              size={16}
              className="hidden group-hover:block"
            />
            <span className="group-hover:hidden">Added</span>
            <span className="hidden group-hover:block">Remove</span>
          </>
        ) : (
          <>
            <Icon icon="solar:add-circle-bold" size={16} />
            <span>Add</span>
          </>
        )}
      </div>
    </motion.div>
  );
});

const DraftItemRow = memo(function DraftItemRow({ item, onRemove }) {
  const title = getItemDisplayTitle(item);
  const year = getItemYear(item);
  const isTv = item?.media_type === 'tv' || item?.entityType === 'tv';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.24, 1] }}
      className="group flex w-full items-center justify-between rounded-2xl border border-black/5 bg-white p-1 transition-colors duration-150 select-none hover:bg-black/5"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-xl">
          <AdaptiveImage
            mode="img"
            src={item?.poster_path ? `${TMDB_IMG}/w92${item.poster_path}` : undefined}
            alt={title}
            className="h-full w-full object-cover"
            wrapperClassName="h-full w-full bg-black/10"
          />
        </div>

        <div className="mr-2 flex min-w-0 flex-1 flex-col justify-center gap-1.5">
          <span className="truncate text-sm leading-tight font-bold text-black uppercase">
            {title}
          </span>
          <div className="flex items-center gap-2">
            <div className="flex w-fit items-center gap-1 rounded-[8px] border border-black/5">
              <span className="px-2 py-0.5 text-[10px] font-bold tracking-tight text-black/70 uppercase">
                {isTv ? 'TV' : 'Movie'}
              </span>
            </div>
            {year !== 'N/A' && (
              <div className="flex w-fit items-center gap-1 rounded-[8px] border border-black/5">
                <span className="px-2 py-0.5 text-[10px] font-bold tracking-tight text-black/70">
                  {year}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <motion.button
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 420, damping: 28, mass: 0.45 }}
        onClick={(e) => {
          e.stopPropagation();
          onRemove(item);
        }}
        className="hover:border-error/20 hover:bg-error/10 hover:text-error mr-1 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-black/10 bg-black/5 text-black/50 transition-colors duration-150"
        aria-label={`Remove ${title}`}
      >
        <Icon icon="solar:trash-bin-trash-bold" size={16} />
      </motion.button>
    </motion.div>
  );
});

// --- MAIN COMPONENT ---

export default function CreateListModal({ close, data }) {
  const auth = useAuth();
  const { closeAllModals } = useModalActions();
  const toast = useToast();
  const router = useRouter();

  const [isSaving, setIsSaving] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftItems, setDraftItems] = useState(() => {
    const normalized = normalizeSearchResult(data?.media);
    return normalized ? [normalized] : [];
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [, startSearchTransition] = useTransition();
  const deferredSearchQuery = useDeferredValue(searchQuery.trim());

  const selectedKeys = new Set(draftItems.map((item) => getDraftMediaKey(item)));
  const canSubmit = Boolean(draftTitle.trim()) && draftItems.length > 0;
  const showSearchResults =
    searchResults.length > 0 || (deferredSearchQuery.length >= 2 && isSearching);

  useEffect(() => {
    if (!data?.media) return;
    const normalized = normalizeSearchResult(data.media);
    if (!normalized) return;

    setDraftItems((current) => {
      const key = getDraftMediaKey(normalized);
      if (current.some((item) => getDraftMediaKey(item) === key)) return current;
      return [...current, normalized];
    });
  }, [data?.media]);

  useEffect(() => {
    if (deferredSearchQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let ignore = false;
    const timeoutId = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const [movieRes, tvRes] = await Promise.all([
          TmdbService.searchContent(deferredSearchQuery, 'movie', 1),
          TmdbService.searchContent(deferredSearchQuery, 'tv', 1),
        ]);
        const results = [...(movieRes?.data?.results || []), ...(tvRes?.data?.results || [])]
          .map(normalizeSearchResult)
          .filter(Boolean);

        if (!ignore) startSearchTransition(() => setSearchResults(results));
      } catch {
        if (!ignore) setSearchResults([]);
      } finally {
        if (!ignore) setIsSearching(false);
      }
    }, 200);

    return () => {
      ignore = true;
      window.clearTimeout(timeoutId);
    };
  }, [deferredSearchQuery, startSearchTransition]);

  const handleAdd = useCallback((item) => {
    const key = getDraftMediaKey(item);
    setDraftItems((curr) =>
      curr.some((x) => getDraftMediaKey(x) === key) ? curr : [...curr, item],
    );
  }, []);

  const handleRemove = useCallback((item) => {
    const key = getDraftMediaKey(item);
    setDraftItems((curr) => curr.filter((x) => getDraftMediaKey(x) !== key));
  }, []);

  const handleQuickAdd = () => {
    if (!searchResults.length) return;
    handleAdd(searchResults[0]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSubmit = async (event) => {
    event?.preventDefault?.();
    if (isSaving || !canSubmit) return;
    if (!auth.user?.id) {
      toast.error('You must be signed in to create a list');
      return;
    }

    setIsSaving(true);
    try {
      const nextList = await createUserListWithItems({
        description: draftDescription,
        items: draftItems,
        title: draftTitle,
        userId: auth.user.id,
      });

      closeAllModals({ success: true, list: nextList });

      const ownerHandle = nextList?.ownerSnapshot?.username;
      if (ownerHandle && nextList?.slug) {
        router.push(`/account/${ownerHandle}/lists/${nextList.slug}`);
      }
    } catch (error) {
      toast.error(error?.message || 'The list could not be created');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Container
      className="flex h-[92dvh] max-h-[100dvh] w-full flex-col justify-between sm:h-full sm:max-h-full sm:w-[560px] md:w-[600px] lg:w-[640px]"
      header={false}
      close={close}
      bodyClassName="flex flex-col flex-1 min-h-0 overflow-hidden p-4 sm:p-5"
    >
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Input
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            placeholder="List title (required)"
            autoFocus
            className={INPUT_STYLES}
          />
          <Input
            value={draftDescription}
            onChange={(e) => setDraftDescription(e.target.value)}
            placeholder="Description (optional)"
            className={INPUT_STYLES}
          />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleQuickAdd();
              }
            }}
            placeholder="Search movies or TV shows to add..."
            leftIcon={<Icon icon="solar:magnifer-linear" size={16} className="text-black/50" />}
            rightIcon={
              isSearching ? (
                <Icon
                  icon="solar:spinner-bold-duotone"
                  size={16}
                />
              ) : searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-black/50 hover:text-black"
                >
                  <Icon icon="material-symbols:close-rounded" size={16} />
                </button>
              ) : null
            }
            className={{
              ...INPUT_STYLES,
              leftIcon: 'flex shrink-0 items-center pr-2.5',
              rightIcon: 'flex shrink-0 items-center pl-2',
            }}
          />
        </div>

        <div
          data-lenis-prevent
          data-lenis-prevent-wheel
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable]"
        >
          {showSearchResults ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between px-1 py-1">
                <span className="text-[10px] font-bold tracking-wider text-black/50 uppercase">
                  Search Results ({searchResults.length})
                </span>
              </div>
              <div className="flex flex-col gap-1">
                {searchResults.map((item, index) => (
                  <SearchResultRow
                    key={getDraftMediaKey(item)}
                    index={index}
                    item={item}
                    isAdded={selectedKeys.has(getDraftMediaKey(item))}
                    onAdd={handleAdd}
                    onRemove={handleRemove}
                  />
                ))}
                {isSearching && searchResults.length === 0 && (
                  <div className="flex h-24 items-center justify-center text-sm font-medium text-black/50">
                    Searching titles...
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {draftItems.length > 0 && (
                <div className="flex items-center justify-between px-1 py-1">
                  <span className="text-[10px] font-bold tracking-wider text-black/50 uppercase">
                    Selected Titles ({draftItems.length})
                  </span>
                </div>
              )}
              {draftItems.length > 0 ? (
                draftItems.map((item) => (
                  <DraftItemRow key={getDraftMediaKey(item)} item={item} onRemove={handleRemove} />
                ))
              ) : (
                <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-black/15 bg-black/5 p-6 text-center">
                  <Icon
                    icon="solar:clapperboard-play-bold-duotone"
                    size={24}
                    className="text-black/50"
                  />
                  <div>
                    <p className="text-xs font-semibold text-black/70">No titles added yet</p>
                    <p className="mt-0.5 text-[11px] text-black/50">
                      Search movies or TV shows above to start building your list
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-black/10 pt-3">
          <div className="flex items-center justify-between px-1 text-xs font-medium text-black/50">
            <span>
              {draftItems.length} {draftItems.length === 1 ? 'title' : 'titles'} selected
            </span>
            {!draftTitle.trim() && (
              <span className="text-error/80 font-normal">List title required</span>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-visible p-0.5">
            <motion.button
              type="button"
              onClick={close}
              disabled={isSaving}
              whileHover={{ scale: 1.012 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 450, damping: 26 }}
              className={cn(
                CANCEL_BUTTON_CLASS,
                'inline-flex h-9 flex-1 items-center justify-center gap-2',
              )}
            >
              <span>Cancel</span>
            </motion.button>
            <motion.button
              type="submit"
              disabled={isSaving || !canSubmit}
              whileHover={isSaving || !canSubmit ? undefined : { scale: 1.012 }}
              whileTap={isSaving || !canSubmit ? undefined : { scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 450, damping: 26 }}
              className={cn(
                ACTION_BUTTON_CLASS,
                'inline-flex h-9 flex-1 items-center justify-center gap-2',
              )}
            >
              <Icon
                icon={isSaving ? 'solar:spinner-bold-duotone' : 'solar:add-folder-bold'}
                size={16}
              />
              <span>{isSaving ? 'Creating...' : 'Create List'}</span>
            </motion.button>
          </div>
        </div>
      </form>
    </Container>
  );
}
