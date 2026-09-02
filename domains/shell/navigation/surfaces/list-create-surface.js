'use client';

import { useDeferredValue, useEffect, useState, useTransition, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { INFO_ACTION_TONE_CLASS } from '@/shared';
import { useAuth } from '@/modules/auth';
import { NavSurfaceHeaderButton, useNavigationActions, useSurfaceHeader } from '@/modules/nav';
import {
  getNavActionClass,
  navActionClass,
  SEARCH_STYLES,
} from '@/domains/shell/navigation/actions/constants';
import { NAV_FADE_TRANSITION, NAV_MICRO_TRANSITION, NAV_TAP_SCALE } from '@/modules/nav';
import { useToast } from '@/modules/notification';
import { createUserListWithItems } from '@/domains/account/client/lists';
import { TmdbService } from '@/infrastructure/tmdb/client';
import { cn } from '@/ui/class-names';
import { SEARCH_LIMITS, SEARCH_TYPES } from '@/domains/search/utils/constants';
import { SearchActionControls } from '@/domains/shell/navigation/actions/search-action';
import { Button, Input } from '@/ui/primitives';
import {
  normalizeSearchResult,
  getDraftMediaKey,
  LIST_SEARCH_TAB_ITEMS,
  SURFACE_LIST_VARIANTS,
  SearchResultRow,
  SelectedListItemRow as DraftItemRow,
} from './list-primitives';
import { createListPickerSurfaceEntry } from './list-picker-surface';

export function createCreateListSurfaceEntry(data = {}, config = {}) {
  return {
    component: CreateListSurface,
    icon: 'solar:folder-open-bold',
    title: 'Create List',
    description: 'Choose titles for your list',
    props: { data },
    ...config,
  };
}

export default function CreateListSurface({ close, data }) {
  const auth = useAuth();
  const toast = useToast();
  const router = useRouter();
  const { openSurface } = useNavigationActions();
  const setHeader = useSurfaceHeader();

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

  useEffect(() => {
    if (!setHeader) return;

    setHeader({
      icon: 'solar:folder-open-bold',
      title: 'Create List',
      description: 'Choose titles for your list',
      trailing: null,
      headerAction: (
        <NavSurfaceHeaderButton
          disabled={isSaving}
          onClick={() =>
            void openSurface(
              createListPickerSurfaceEntry({
                media: data?.media,
                userId: data?.userId ?? auth.user?.id ?? null,
              }),
            )
          }
        >
          Your Lists
        </NavSurfaceHeaderButton>
      ),
    });
  }, [auth.user?.id, data?.media, data?.userId, isSaving, openSurface, setHeader]);

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
    Math.ceil(filteredSearchResults.length / SEARCH_LIMITS.GRID_RESULTS_PER_PAGE),
  );
  const safePage = Math.min(currentPage, totalPages - 1);
  const pageResults = useMemo(
    () =>
      filteredSearchResults.slice(
        safePage * SEARCH_LIMITS.GRID_RESULTS_PER_PAGE,
        safePage * SEARCH_LIMITS.GRID_RESULTS_PER_PAGE + SEARCH_LIMITS.GRID_RESULTS_PER_PAGE,
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
    <div className="flex w-full flex-col gap-2.5">
      <div className="flex flex-col gap-2.5">
        <AnimatePresence initial={false}>
          {!searchQuery.trim() ? (
            <motion.div
              key="list-meta-inputs"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={NAV_FADE_TRANSITION}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-2.5 pb-0.5 sm:flex-row">
                <Input
                  aria-label="List title"
                  id="list-title"
                  value={draftTitle}
                  onBlur={() => setFocusedField(null)}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  onFocus={() => setFocusedField('title')}
                  placeholder="Name your list"
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
            </motion.div>
          ) : null}
        </AnimatePresence>

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
          tabItems={LIST_SEARCH_TAB_ITEMS}
          showTabs={true}
        />
      </div>

      {showSearchResults || draftItems.length > 0 ? (
        <div
          data-lenis-prevent
          data-lenis-prevent-wheel
          className="max-h-[min(48dvh,20rem)] overflow-y-auto overscroll-contain rounded-[20px]"
        >
          <AnimatePresence mode="wait" initial={false}>
            {showSearchResults ? (
              <motion.div
                key={`search-results-${safePage}-${searchType}`}
                variants={SURFACE_LIST_VARIANTS}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex flex-col gap-2.5 overflow-visible p-0.5"
              >
                <div className="grid grid-cols-4 gap-2.5">
                  {pageResults.map((item, itemIndex) => (
                    <motion.div
                      key={getDraftMediaKey(item)}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{
                        duration: 0.25,
                        delay: 0.02 + itemIndex * 0.03,
                      }}
                      className="min-w-0"
                    >
                      <SearchResultRow
                        item={item}
                        isAdded={selectedKeys.has(getDraftMediaKey(item))}
                        onAdd={handleAdd}
                        onRemove={handleRemove}
                      />
                    </motion.div>
                  ))}
                </div>
                {isSearching && searchResults.length === 0 && (
                  <div className="grid grid-cols-4 gap-2.5">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={`search-skeleton-${index}`}
                        className="skeleton-block-soft aspect-[2/3] w-full animate-pulse rounded-[20px] ring-1 ring-inset ring-white/5"
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="draft-items"
                variants={SURFACE_LIST_VARIANTS}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex flex-col gap-2.5"
              >
                {draftItems.length > 0 ? (
                  <AnimatePresence initial={false}>
                    {draftItems.map((item, index) => (
                      <DraftItemRow
                        key={getDraftMediaKey(item)}
                        item={item}
                        index={index}
                        totalItems={draftItems.length}
                        onRemove={handleRemove}
                      />
                    ))}
                  </AnimatePresence>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : null}

      <div className="flex w-full">
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isSaving || !canSubmit}
          className={getNavActionClass({
            variant: INFO_ACTION_TONE_CLASS,
            className: 'flex-1 disabled:cursor-not-allowed disabled:opacity-50',
          })}
        >
          <span>{isSaving ? 'Creating...' : 'Create List'}</span>
        </Button>
      </div>
    </div>
  );
}
