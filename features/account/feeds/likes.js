'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { usePathname, useSearchParams } from 'next/navigation';
import { Reorder, useDragControls } from 'framer-motion';

import {
  LIST_FILTER_QUERY_KEYS,
  MEDIA_FILTER_QUERY_KEYS,
  applyMediaFilters,
  buildCollectionBasePath,
  buildManagedQueryString,
  buildMediaKeySet,
  collectMediaGenreOptions,
  getDecadeOptions,
  hasActiveListFilters,
  hasActiveMediaFilters,
  parseListFilters,
  parseMediaFilters,
  parsePageFromSearch,
  sortProfileLists,
  toListQueryValues,
  toMediaQueryValues,
} from '@/features/account/filtering';
import AccountPaginatedListGrid from '@/features/account/lists/grid';
import { getMediaTitle as getAccountMediaTitle } from '@/features/account/utils';
import { AccountListSortBar, AccountMediaFilterBar } from '@/features/account/shared/content-filters';
import AccountSectionLayout, { AccountSectionState } from '@/features/account/shared/section-wrapper';
import AccountMediaGridPage, { ProfileMediaActions } from '@/features/account/shared/media-grid';
import { Button } from '@/ui/elements';
import Icon from '@/ui/icon';
import AccountReviewsFeed from './reviews';

const LIKES_VISIBILITY_OPTIONS = Object.freeze([
  Object.freeze({ key: 'hide_unreleased', label: 'Hide unreleased titles' }),
  Object.freeze({ key: 'hide_documentaries', label: 'Hide documentaries' }),
]);
const LIKES_ALLOWED_EYE_FLAGS = LIKES_VISIBILITY_OPTIONS.map((option) => option.key);

function parseLikesMediaFilters(search) {
  return parseMediaFilters(search, {
    allowedEyeFlags: LIKES_ALLOWED_EYE_FLAGS,
  });
}

function ReorderableListItem({ item, renderEditAction }) {
  const controls = useDragControls();

  return (
    <Reorder.Item as="div" value={item} dragListener={false} dragControls={controls} className="relative w-full">
      <div className="flex w-full items-center gap-2 border border-black/15 bg-white/40 px-4 py-3">
        <div
          onPointerDown={(event) => controls.start(event)}
          className="center size-8 shrink-0 cursor-grab text-[#475569] transition"
        >
          <Icon icon="solar:reorder-bold" size={18} />
        </div>
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{getAccountMediaTitle(item)}</p>
        {typeof renderEditAction === 'function' ? <div className="shrink-0">{renderEditAction(item)}</div> : null}
      </div>
    </Reorder.Item>
  );
}

function FavoriteShowcaseManager({ items = [], isSaving = false, onRemoveItem, onReorder }) {
  return (
    <AccountSectionLayout icon="solar:star-bold" summaryLabel={`${items.length}/5 selected`} title="Favorites Showcase">
      {items.length === 0 ? (
        <div className="bg-primary rounded-[10px] border border-black/5 p-3 text-black/50">
          No showcase titles selected yet
        </div>
      ) : (
        <Reorder.Group
          as="div"
          axis="y"
          values={items}
          onReorder={typeof onReorder === 'function' ? onReorder : () => {}}
          className="list-none space-y-2"
        >
          {items.map((item, index) => (
            <ReorderableListItem
              key={`${item.id || item.mediaKey || item.entityId || 'media-item'}-${index}`}
              item={item}
              renderEditAction={(entry) => (
                <Button
                  variant="destructive-icon"
                  aria-label={`Remove ${entry?.title || entry?.name || 'title'} from favorites showcase`}
                  disabled={isSaving}
                  onClick={() => onRemoveItem(entry)}
                >
                  <Icon icon="solar:trash-bin-trash-bold" size={16} />
                </Button>
              )}
            />
          ))}
        </Reorder.Group>
      )}
    </AccountSectionLayout>
  );
}

export default function AccountLikesFeed({
  activeSegment,
  auth,
  canShowLikesGrid,
  favoriteShowcase,
  handleLike,
  handleRequestRemoveLike,
  handleToggleShowcase,
  isLikedListsLoading,
  isOwner,
  isReviewsLoading,
  isShowcaseSaving,
  likedLists,
  likedListsError,
  likes,
  persistShowcase,
  reviews,
  reviewsTotalCount,
  reviewsError,
  showcaseMap,
  watchedItems,
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams?.toString?.() || '';
  const initialMediaFilters = useMemo(
    () => parseLikesMediaFilters(new URLSearchParams(searchParamsKey)),
    [searchParamsKey]
  );
  const initialListFilters = useMemo(() => parseListFilters(new URLSearchParams(searchParamsKey)), [searchParamsKey]);
  const initialPage = useMemo(() => parsePageFromSearch(new URLSearchParams(searchParamsKey)), [searchParamsKey]);
  const [mediaFilters, setMediaFilters] = useState(initialMediaFilters);
  const [listFilters, setListFilters] = useState(initialListFilters);
  const [activePage, setActivePage] = useState(initialPage);
  const collectionRootPath = useMemo(() => buildCollectionBasePath(pathname), [pathname]);
  const decadeOptions = useMemo(() => getDecadeOptions(), []);
  const genreOptions = useMemo(() => collectMediaGenreOptions(likes), [likes]);
  const likedKeys = useMemo(() => buildMediaKeySet(likes), [likes]);
  const filteredLikes = useMemo(
    () => applyMediaFilters(likes, mediaFilters, { likedKeys }),
    [likedKeys, likes, mediaFilters]
  );
  const sortedLikedLists = useMemo(
    () => sortProfileLists(likedLists, listFilters.sort),
    [likedLists, listFilters.sort]
  );
  const hasMediaFilters = hasActiveMediaFilters(mediaFilters);
  const hasListFilters = hasActiveListFilters(listFilters);

  useEffect(() => {
    setMediaFilters(initialMediaFilters);
    setListFilters(initialListFilters);
    setActivePage(initialPage);
  }, [initialListFilters, initialMediaFilters, initialPage]);

  const updateUrl = useCallback(
    ({ nextListSort, nextMediaFilters, nextPage } = {}) => {
      if (typeof window === 'undefined') {
        return;
      }

      const resolvedListSort = nextListSort ?? listFilters.sort;
      const resolvedMediaFilters = nextMediaFilters ?? mediaFilters;
      const resolvedPage = nextPage ?? activePage;
      const mediaQueryString = buildManagedQueryString(new URLSearchParams(window.location.search), {
        managedKeys: MEDIA_FILTER_QUERY_KEYS,
        resetPage: false,
        values: toMediaQueryValues(resolvedMediaFilters),
      });
      const listQueryString = buildManagedQueryString(new URLSearchParams(mediaQueryString), {
        managedKeys: LIST_FILTER_QUERY_KEYS,
        resetPage: false,
        values: toListQueryValues({ sort: resolvedListSort }),
      });
      const params = new URLSearchParams(listQueryString);

      if (resolvedPage > 1) {
        params.set('page', String(resolvedPage));
      } else {
        params.delete('page');
      }

      const nextQuery = params.toString();
      window.history.replaceState({}, '', nextQuery ? `${collectionRootPath}?${nextQuery}` : collectionRootPath);
    },
    [activePage, collectionRootPath, listFilters.sort, mediaFilters]
  );

  const updateMediaFilters = useCallback(
    (updates = {}) => {
      const nextFilters = {
        ...mediaFilters,
        ...updates,
      };
      setMediaFilters(nextFilters);
      setActivePage(1);
      updateUrl({
        nextListSort: listFilters.sort,
        nextMediaFilters: nextFilters,
        nextPage: 1,
      });
    },
    [listFilters.sort, mediaFilters, updateUrl]
  );

  const resetMediaFilters = useCallback(() => {
    const defaultFilters = parseLikesMediaFilters(new URLSearchParams());
    setMediaFilters(defaultFilters);
    setActivePage(1);
    updateUrl({
      nextListSort: listFilters.sort,
      nextMediaFilters: defaultFilters,
      nextPage: 1,
    });
  }, [listFilters.sort, updateUrl]);

  const updateListSort = useCallback(
    (nextSort) => {
      setListFilters({ sort: nextSort });
      setActivePage(1);
      updateUrl({
        nextListSort: nextSort,
        nextMediaFilters: mediaFilters,
        nextPage: 1,
      });
    },
    [mediaFilters, updateUrl]
  );

  const resetListFilters = useCallback(() => {
    const defaultSort = parseListFilters(new URLSearchParams()).sort;
    setListFilters({ sort: defaultSort });
    setActivePage(1);
    updateUrl({
      nextListSort: defaultSort,
      nextMediaFilters: mediaFilters,
      nextPage: 1,
    });
  }, [mediaFilters, updateUrl]);

  const handlePageChange = useCallback(
    (nextPage) => {
      setActivePage(nextPage);
      updateUrl({
        nextListSort: listFilters.sort,
        nextMediaFilters: mediaFilters,
        nextPage,
      });
    },
    [listFilters.sort, mediaFilters, updateUrl]
  );
  const reviewsSummaryLabel = Number.isFinite(Number(reviewsTotalCount))
    ? `${Number(reviewsTotalCount)} Reviews`
    : null;
  const isFilmsSegment = activeSegment === 'films';
  const isReviewsSegment = activeSegment === 'reviews';
  let segmentContent = null;

  if (isFilmsSegment) {
    segmentContent = (
      <AccountMediaGridPage
        currentPage={activePage}
        emptyMessage="No liked films yet"
        icon="solar:heart-bold"
        items={filteredLikes}
        onPageChange={handlePageChange}
        pageBasePath={collectionRootPath}
        showHeader={false}
        renderOverlay={(item) =>
          isOwner ? (
            <ProfileMediaActions
              extraActions={[
                {
                  disabled: !showcaseMap.has(item.mediaKey) && favoriteShowcase.length >= 5,
                  icon: showcaseMap.has(item.mediaKey) ? 'solar:star-bold' : 'solar:star-linear',
                  label: showcaseMap.has(item.mediaKey)
                    ? 'Remove from favorites showcase'
                    : 'Add to favorites showcase',
                  onClick: handleToggleShowcase,
                },
              ]}
              media={item}
              onRemoveItem={handleRequestRemoveLike}
              removeLabel={`Remove ${item.title || item.name} from likes`}
              userId={auth.user?.id || null}
            />
          ) : null
        }
        toolbar={
          likes.length > 0 ? (
            <AccountMediaFilterBar
              filters={mediaFilters}
              decadeOptions={decadeOptions}
              genreOptions={genreOptions}
              visibilityOptions={LIKES_VISIBILITY_OPTIONS}
              onChange={updateMediaFilters}
              onReset={hasMediaFilters ? resetMediaFilters : null}
            />
          ) : hasMediaFilters ? (
            <AccountMediaFilterBar
              filters={mediaFilters}
              decadeOptions={decadeOptions}
              genreOptions={genreOptions}
              visibilityOptions={LIKES_VISIBILITY_OPTIONS}
              onChange={updateMediaFilters}
              onReset={resetMediaFilters}
            />
          ) : null
        }
        title="Films"
      />
    );
  } else if (isReviewsSegment) {
    segmentContent = (
      <AccountReviewsFeed
        enablePagination={true}
        currentUserId={auth.user?.id || null}
        emptyMessage="No liked reviews yet"
        icon="solar:chat-round-bold"
        isLoading={isReviewsLoading}
        items={reviews}
        loadError={reviewsError}
        onLike={handleLike}
        showOwnActions={false}
        showHeader={false}
        summaryLabel={reviewsSummaryLabel}
        title="Reviews"
        watchedItems={watchedItems}
      />
    );
  } else {
    segmentContent = (
      <AccountPaginatedListGrid
        currentPage={activePage}
        emptyMessage="No liked lists yet"
        icon="solar:list-broken"
        isLoading={isLikedListsLoading}
        lists={sortedLikedLists}
        loadError={likedListsError}
        onPageChange={handlePageChange}
        pageBasePath={collectionRootPath}
        showHeader={false}
        title="Lists"
        toolbar={
          likedLists.length > 0 ? (
            <AccountListSortBar
              sort={listFilters.sort}
              onChange={updateListSort}
              onReset={hasListFilters ? resetListFilters : null}
            />
          ) : hasListFilters ? (
            <AccountListSortBar sort={listFilters.sort} onChange={updateListSort} onReset={resetListFilters} />
          ) : null
        }
      />
    );
  }

  return (
    <>
      {isOwner && isFilmsSegment ? (
        <FavoriteShowcaseManager
          items={favoriteShowcase}
          isSaving={isShowcaseSaving}
          onRemoveItem={handleToggleShowcase}
          onReorder={persistShowcase}
        />
      ) : null}

      {canShowLikesGrid ? segmentContent : <AccountSectionState message="This profile is private." />}
    </>
  );
}
