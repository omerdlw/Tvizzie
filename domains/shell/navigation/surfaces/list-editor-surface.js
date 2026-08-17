'use client';

import {
  useDeferredValue,
  useEffect,
  useState,
  useTransition,
  useCallback,
  useMemo,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { INFO_ACTION_TONE_CLASS } from '@/domains/shell/shared/constants';
import { useAuth } from '@/modules/auth';
import { getNavActionClass } from '@/domains/shell/navigation/action/constants';
import { NAV_FADE_TRANSITION, NAV_MICRO_TRANSITION, NAV_TAP_SCALE } from '@/modules/nav/motion';
import { useToast } from '@/modules/notification';
import {
  reorderUserListItems,
  toggleUserListItem,
  updateUserList,
} from '@/domains/media/client/lists';
import { TmdbService } from '@/infrastructure/tmdb/services/tmdb-service';
import { cn } from '@/domains/shell/shared/utils';
import { navActionClass } from '@/domains/shell/navigation/action/constants';
import {
  SEARCH_LIMITS,
  SEARCH_TYPES,
} from '@/domains/search/utils/constants';
import {
  SEARCH_STYLES,
} from '@/domains/shell/navigation/action/constants';
import { SearchActionControls } from '@/domains/shell/navigation/action/search-action';
import { Input } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';
import {
  normalizeSearchResult,
  normalizeListItem,
  getDraftMediaKey,
  LIST_SEARCH_TAB_ITEMS,
  SURFACE_LIST_VARIANTS,
  SearchResultRow,
  SelectedListItemRow as ListItemRow,
} from './list-primitives';

// --- TABS ---

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

export function createListEditorSurfaceEntry(data = {}, config = {}) {
  const targetList = data?.initialData || data?.list || {};
  const listTitle = targetList?.title || 'List';

  return {
    component: ListEditorSurface,
    icon: 'solar:pen-bold',
    title: 'Edit List',
    description: `Manage "${listTitle}" and its titles`,
    props: { data },
    ...config,
  };
}

export default function ListEditorSurface({ close, data, ...restProps }) {
  const auth = useAuth();
  const toast = useToast();

  const resolvedData = data || restProps || {};
  const targetList = resolvedData.initialData || resolvedData.list || {};
  const userId = resolvedData.userId || auth.user?.id;
  const isOwner = resolvedData.isOwner ?? true;

  const resolvedInitialItems = useMemo(() => {
    let raw = [];
    if (Array.isArray(resolvedData.initialItems)) raw = resolvedData.initialItems;
    else if (Array.isArray(targetList?.items)) raw = targetList.items;
    else if (Array.isArray(targetList?.previewItems)) raw = targetList.previewItems;
    return raw.map(normalizeListItem).filter(Boolean);
  }, [resolvedData.initialItems, targetList]);

  const [isSaving, setIsSaving] = useState(false);
  const [draftTitle, setDraftTitle] = useState(targetList?.title || '');
  const [draftDescription, setDraftDescription] = useState(targetList?.description || '');
  const [draftItems, setDraftItems] = useState(resolvedInitialItems);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [focusedField, setFocusedField] = useState(null);
  const [searchType, setSearchType] = useState(SEARCH_TYPES.ALL);
  const [, startSearchTransition] = useTransition();
  const deferredSearchQuery = useDeferredValue(searchQuery.trim());

  const selectedKeys = useMemo(
    () => new Set(draftItems.map((item) => getDraftMediaKey(item))),
    [draftItems],
  );
  const canSubmit = Boolean(draftTitle.trim());
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
    const normalized = normalizeListItem(item);
    if (!normalized) return;
    const key = getDraftMediaKey(normalized);
    setDraftItems((curr) =>
      curr.some((x) => getDraftMediaKey(x) === key) ? curr : [...curr, normalized],
    );
  }, []);

  const handleRemove = useCallback((item) => {
    const key = getDraftMediaKey(item);
    setDraftItems((curr) => curr.filter((x) => getDraftMediaKey(x) !== key));
  }, []);

  const handleMoveItem = useCallback((index, direction) => {
    setDraftItems((curr) => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= curr.length) return curr;
      const next = [...curr];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next.map((item, idx) => ({ ...item, position: idx + 1 }));
    });
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
    if (!isOwner || isSaving || !canSubmit) return;
    const effectiveUserId = userId || auth.user?.id;
    if (!effectiveUserId) {
      toast.error('You must be signed in to edit a list');
      return;
    }
    if (!targetList?.id) {
      toast.error('List ID is missing');
      return;
    }

    setIsSaving(true);
    try {
      const updatedList = await updateUserList({
        description: draftDescription,
        title: draftTitle,
        listId: targetList.id,
        userId: effectiveUserId,
      });

      const initialKeys = new Set(resolvedInitialItems.map((item) => getDraftMediaKey(item)));
      const draftKeys = new Set(draftItems.map((item) => getDraftMediaKey(item)));

      const removedItems = resolvedInitialItems.filter(
        (item) => !draftKeys.has(getDraftMediaKey(item)),
      );
      const addedItems = draftItems.filter(
        (item) => !initialKeys.has(getDraftMediaKey(item)),
      );

      if (removedItems.length > 0) {
        await Promise.all(
          removedItems.map((item) =>
            toggleUserListItem({ listId: targetList.id, media: item, userId: effectiveUserId }),
          ),
        );
      }

      if (addedItems.length > 0) {
        await Promise.all(
          addedItems.map((item) =>
            toggleUserListItem({
              listId: targetList.id,
              media: {
                ...item,
                position:
                  draftItems.findIndex((d) => getDraftMediaKey(d) === getDraftMediaKey(item)) + 1,
              },
              userId: effectiveUserId,
            }),
          ),
        );
      }

      const orderedItems = draftItems.map((item, idx) => ({
        ...item,
        position: idx + 1,
      }));

      if (orderedItems.length > 0) {
        await reorderUserListItems({
          userId: effectiveUserId,
          listId: targetList.id,
          items: orderedItems,
        });
      }

      resolvedData?.onItemsChange?.(orderedItems);
      resolvedData?.onSuccess?.({
        ...targetList,
        ...updatedList,
        itemsCount: orderedItems.length,
        previewItems: orderedItems.slice(0, 5),
      });

      toast.success('List updated successfully.');
      close?.({ success: true, list: updatedList, items: orderedItems });
    } catch (error) {
      toast.error(error?.message || 'The list could not be updated');
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

      {showSearchResults || draftItems.length > 0 ? (
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
                    {draftItems.map((item, index) => (
                      <ListItemRow
                        key={getDraftMediaKey(item)}
                        index={index}
                        item={item}
                        totalItems={draftItems.length}
                        onMoveUp={() => handleMoveItem(index, 'up')}
                        onMoveDown={() => handleMoveItem(index, 'down')}
                        onRemove={handleRemove}
                      />
                    ))}
                  </AnimatePresence>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex h-28 flex-col items-center justify-center gap-2 border border-dashed border-white/10 bg-white/5 text-center">
          <Icon icon="solar:list-broken" size={24} className="text-white/50" />
          <p className="text-xs text-white/50">No titles in this list</p>
        </div>
      )}

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
          <span>{isSaving ? 'Updating...' : 'Update List'}</span>
        </button>
      </div>
    </div>
  );
}
