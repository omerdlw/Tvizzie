'use client';

import {
  useDeferredValue,
  useEffect,
  useState,
  useTransition,
  useCallback,
  useMemo,
  memo,
} from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { INFO_ACTION_TONE_CLASS, TMDB_IMG } from '@/shared/constants';
import { useAuth } from '@/modules/auth';
import { getNavActionClass } from '@/ui/primitives/navigation-action-styles';
import { NAV_FADE_TRANSITION, NAV_MICRO_TRANSITION, NAV_TAP_SCALE } from '@/modules/nav/motion';
import { useToast } from '@/modules/notification';
import { createUserListWithItems } from '@/domains/media/client/collections/lists';
import { TmdbService } from '@/infrastructure/tmdb/services/tmdb-service';
import { cn, formatYear } from '@/shared/utils';
import { SEARCH_LIMITS, SEARCH_STYLES, SEARCH_TYPES } from '@/domains/search/utils';
import SearchActionControls from '@/domains/search/ui/nav-actions/search-action/controls';
import { navActionClass } from '@/domains/search/ui/nav-actions/search-action/search-action-helpers';
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

const LIST_SEARCH_TAB_ITEMS = Object.freeze([
  { key: SEARCH_TYPES.ALL, label: 'All' },
  { key: SEARCH_TYPES.MOVIE, label: 'Movies' },
  { key: SEARCH_TYPES.TV, label: 'TV' },
]);

const SURFACE_LIST_VARIANTS = Object.freeze({
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: NAV_FADE_TRANSITION },
  exit: { opacity: 0, transition: NAV_MICRO_TRANSITION },
});

const SURFACE_LIST_ITEM_VARIANTS = Object.freeze({
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: NAV_MICRO_TRANSITION },
  exit: { opacity: 0, transition: NAV_MICRO_TRANSITION },
});

// --- SUB-COMPONENTS ---

const SearchResultRow = memo(function SearchResultRow({ item, isAdded, onAdd, onRemove }) {
  const title = getItemDisplayTitle(item);
  const year = getItemYear(item);
  const isTv = item?.media_type === 'tv' || item?.entityType === 'tv';

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
        'w-full gap-2 border text-left active:scale-[0.995]',
        isAdded
          ? 'border-info/20 bg-info/5 hover:border-error/20 hover:bg-error/5'
          : 'border-transparent',
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <div className={SEARCH_STYLES.thumbnail}>
          <AdaptiveImage
            mode="img"
            src={item?.poster_path ? `${TMDB_IMG}/w92${item.poster_path}` : undefined}
            alt={title}
            className="h-full w-full object-cover"
            wrapperClassName="h-full w-full bg-white/10"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
          <span className="truncate leading-tight font-bold uppercase">{title}</span>
          <div className="flex items-center gap-2">
            <div className={SEARCH_STYLES.metaBadge}>
              <span className="px-2 py-1 text-[10px] font-bold tracking-tight text-white/70 uppercase">
                {isTv ? 'TV' : 'Movie'}
              </span>
            </div>
            {year !== 'N/A' && (
              <div className={SEARCH_STYLES.metaBadge}>
                <span className="px-2 py-1 text-[10px] font-bold tracking-tight text-white/70">
                  {year}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className={cn(
          'mr-2 flex size-8 shrink-0 items-center justify-center border p-0 text-xs font-bold tracking-wider uppercase',
          isAdded
            ? 'border-info/20 bg-info/10 text-info group-hover:border-error/20 group-hover:bg-error/10 group-hover:text-error'
            : 'border-white/10 bg-white/5 text-white/70 group-hover:border-transparent group-hover:bg-white group-hover:text-black',
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
          </>
        ) : (
          <Icon icon="solar:add-circle-bold" size={16} />
        )}
      </div>
    </motion.button>
  );
});

const DraftItemRow = memo(function DraftItemRow({ item, onRemove }) {
  const title = getItemDisplayTitle(item);
  const year = getItemYear(item);
  const isTv = item?.media_type === 'tv' || item?.entityType === 'tv';

  return (
    <motion.div
      variants={SURFACE_LIST_ITEM_VARIANTS}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={cn(SEARCH_STYLES.resultItem, 'w-full gap-2 border border-white/5')}
    >
      <div className="flex min-w-0 items-center gap-2">
        <div className={SEARCH_STYLES.thumbnail}>
          <AdaptiveImage
            mode="img"
            src={item?.poster_path ? `${TMDB_IMG}/w92${item.poster_path}` : undefined}
            alt={title}
            className="h-full w-full object-cover"
            wrapperClassName="h-full w-full bg-white/10"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
          <span className="truncate leading-tight font-bold uppercase">{title}</span>
          <div className="flex items-center gap-2">
            <div className={SEARCH_STYLES.metaBadge}>
              <span className="px-2 py-1 text-[10px] font-bold tracking-tight text-white/70 uppercase">
                {isTv ? 'TV' : 'Movie'}
              </span>
            </div>
            {year !== 'N/A' && (
              <div className={SEARCH_STYLES.metaBadge}>
                <span className="px-2 py-1 text-[10px] font-bold tracking-tight text-white/70">
                  {year}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <motion.button
        type="button"
        whileTap={{ scale: NAV_TAP_SCALE }}
        transition={NAV_MICRO_TRANSITION}
        onClick={(e) => {
          e.stopPropagation();
          onRemove(item);
        }}
        className="hover:border-error/20 hover:bg-error/10 hover:text-error mr-2 flex size-8 shrink-0 cursor-pointer items-center justify-center border border-white/10 bg-white/5 text-white/50 transition-[background-color,border-color,color] duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
        aria-label={`Remove ${title}`}
      >
        <Icon icon="solar:trash-bin-trash-bold" size={16} />
      </motion.button>
    </motion.div>
  );
});

function ListSearchTabs({ searchType, onSearchTypeChange }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={NAV_FADE_TRANSITION}
      className="overflow-hidden"
    >
      <div className={cn(SEARCH_STYLES.tabList, 'w-full')}>
        {LIST_SEARCH_TAB_ITEMS.map((item) => {
          const isActive = searchType === item.key;

          return (
            <motion.button
              key={item.key}
              type="button"
              className={cn(
                navActionClass({
                  cn,
                  button: SEARCH_STYLES.tabButton,
                  isActive,
                }),
                'flex-1',
              )}
              onClick={() => onSearchTypeChange?.(item.key)}
              whileTap={{ scale: NAV_TAP_SCALE }}
              transition={NAV_MICRO_TRANSITION}
            >
              {item.label}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

// --- MAIN COMPONENT ---

export function createCreateListSurfaceEntry(data = {}, config = {}) {
  return {
    component: CreateListSurface,
    icon: 'solar:folder-open-bold',
    title: 'Create List',
    description: 'Add movies and TV shows to your new list',
    props: { data },
    ...config,
  };
}

export default function CreateListSurface({ close, data }) {
  const auth = useAuth();
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
  const [currentPage, setCurrentPage] = useState(0);
  const [focusedField, setFocusedField] = useState(null);
  const [searchType, setSearchType] = useState(SEARCH_TYPES.ALL);
  const [, startSearchTransition] = useTransition();
  const deferredSearchQuery = useDeferredValue(searchQuery.trim());

  const selectedKeys = new Set(draftItems.map((item) => getDraftMediaKey(item)));
  const canSubmit = Boolean(draftTitle.trim()) && draftItems.length > 0;
  const showSearchResults =
    searchResults.length > 0 || (deferredSearchQuery.length >= 2 && isSearching);
  const filteredSearchResults = useMemo(
    () =>
      searchResults.filter(
        (item) => searchType === SEARCH_TYPES.ALL || item.media_type === searchType,
      ),
    [searchResults, searchType],
  );
  const totalPages = Math.max(
    1,
    Math.ceil(filteredSearchResults.length / SEARCH_LIMITS.RESULTS_PER_PAGE),
  );
  const safePage = Math.min(currentPage, totalPages - 1);
  const pageResults = useMemo(
    () =>
      filteredSearchResults.slice(
        safePage * SEARCH_LIMITS.RESULTS_PER_PAGE,
        safePage * SEARCH_LIMITS.RESULTS_PER_PAGE + SEARCH_LIMITS.RESULTS_PER_PAGE,
      ),
    [filteredSearchResults, safePage],
  );

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
      setCurrentPage(0);
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

        if (!ignore) {
          startSearchTransition(() => {
            setSearchResults(results);
            setCurrentPage(0);
          });
        }
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

  const handleSearchQueryChange = useCallback((nextQuery) => {
    setSearchQuery(nextQuery);
    setCurrentPage(0);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setCurrentPage(0);
    setSearchType(SEARCH_TYPES.ALL);
  }, []);

  const handleSearchTypeChange = useCallback((nextSearchType) => {
    setSearchType(nextSearchType);
    setCurrentPage(0);
  }, []);

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

      close({ success: true, list: nextList });

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
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            aria-label="List title"
            id="list-title"
            value={draftTitle}
            onBlur={() => setFocusedField(null)}
            onChange={(e) => setDraftTitle(e.target.value)}
            onFocus={() => setFocusedField('title')}
            placeholder="Name your list"
            autoFocus
            classNames={{
              input: 'w-full text-sm placeholder:text-white/50 outline-none',
              wrapper: cn(
                navActionClass({
                  cn,
                  button: SEARCH_STYLES.input,
                  isActive: focusedField === 'title',
                }),
                'min-w-0 flex-1',
              ),
            }}
          />
          <Input
            aria-label="List description"
            id="list-description"
            value={draftDescription}
            onBlur={() => setFocusedField(null)}
            onChange={(e) => setDraftDescription(e.target.value)}
            onFocus={() => setFocusedField('description')}
            placeholder="Description (optional)"
            classNames={{
              input: 'w-full text-sm placeholder:text-white/50 outline-none',
              wrapper: cn(
                navActionClass({
                  cn,
                  button: SEARCH_STYLES.input,
                  isActive: focusedField === 'description',
                }),
                'min-w-0 flex-1',
              ),
            }}
          />
        </div>
        <SearchActionControls
          ariaLabel="Search movies or TV shows"
          hasNextPage={safePage < totalPages - 1}
          hasPrevPage={safePage > 0}
          loading={isSearching}
          onClear={handleClearSearch}
          onNextPage={() => setCurrentPage((page) => Math.min(page + 1, totalPages - 1))}
          onPrevPage={() => setCurrentPage((page) => Math.max(page - 1, 0))}
          onQueryChange={handleSearchQueryChange}
          onSearchTypeChange={handleSearchTypeChange}
          placeholder="Search movies or TV shows"
          query={searchQuery}
          searchType={searchType}
          showTabs={false}
        />
      </div>

      <div
        data-lenis-prevent
        data-lenis-prevent-wheel
        className="max-h-[min(48dvh,20rem)] overflow-y-auto overscroll-contain"
      >
        <AnimatePresence mode="wait" initial={false}>
          {showSearchResults ? (
            <motion.div
              key="search-results"
              variants={SURFACE_LIST_VARIANTS}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex flex-col gap-2"
            >
              <div className="flex flex-col gap-2">
                {pageResults.map((item) => (
                  <SearchResultRow
                    key={getDraftMediaKey(item)}
                    item={item}
                    isAdded={selectedKeys.has(getDraftMediaKey(item))}
                    onAdd={handleAdd}
                    onRemove={handleRemove}
                  />
                ))}
                {isSearching && searchResults.length === 0 && (
                  <div className="flex h-24 items-center justify-center text-sm font-medium text-white/50">
                    Searching titles...
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="draft-items"
              variants={SURFACE_LIST_VARIANTS}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex flex-col gap-2"
            >
              {draftItems.length > 0 ? (
                <AnimatePresence initial={false}>
                  {draftItems.map((item) => (
                    <DraftItemRow
                      key={getDraftMediaKey(item)}
                      item={item}
                      onRemove={handleRemove}
                    />
                  ))}
                </AnimatePresence>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence initial={false}>
        {searchQuery.trim() ? (
          <ListSearchTabs searchType={searchType} onSearchTypeChange={handleSearchTypeChange} />
        ) : null}
      </AnimatePresence>

      <div className="flex w-full">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSaving || !canSubmit}
          className={getNavActionClass({
            variant: INFO_ACTION_TONE_CLASS,
            className: 'flex-1 disabled:cursor-not-allowed disabled:opacity-50',
          })}
        >
          <Icon
            icon={isSaving ? 'solar:spinner-bold-duotone' : 'solar:add-folder-bold'}
            size={16}
          />
          <span>{isSaving ? 'Creating...' : 'Create List'}</span>
        </button>
      </div>
    </div>
  );
}
