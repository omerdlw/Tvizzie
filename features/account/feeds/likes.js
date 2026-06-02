'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { AccountListSortBar, AccountMediaFilterBar } from '@/features/account/filters/content-filter-primitives';
import AccountInlineSectionState from '@/features/account/components/section-state';
import AccountSectionLayout, { AccountSectionState } from '@/features/account/components/section-wrapper';
import AccountMediaGridPage, { ProfileMediaActions } from '@/features/account/components/media-grid';
import { Button } from '@/ui/elements';
import Icon from '@/ui/icon';
import AccountReviewsFeed from './reviews';

const LIKES_VISIBILITY_OPTIONS = Object.freeze([
  Object.freeze({ key: 'hide_unreleased', label: 'Hide unreleased titles' }),
  Object.freeze({ key: 'hide_documentaries', label: 'Hide documentaries' }),
]);

const LIKES_ALLOWED_EYE_FLAGS = LIKES_VISIBILITY_OPTIONS.map((o) => o.key);
const parseLikesMediaFilters = (search) => parseMediaFilters(search, { allowedEyeFlags: LIKES_ALLOWED_EYE_FLAGS });
const getDefaultFilters = () => ({
  media: parseLikesMediaFilters(new URLSearchParams()),
  listSort: parseListFilters(new URLSearchParams()).sort,
});

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
  const searchString = searchParams?.toString?.() || '';

  const collectionRootPath = buildCollectionBasePath(pathname);

  // State Consolidation: Birbirine bağlı 3 ayrı state yerine tek bir view objesi.
  const [viewState, setViewState] = useState({
    media: parseLikesMediaFilters(new URLSearchParams(searchString)),
    listSort: parseListFilters(new URLSearchParams(searchString)).sort,
    page: parsePageFromSearch(new URLSearchParams(searchString)),
  });

  useEffect(() => {
    setViewState({
      media: parseLikesMediaFilters(new URLSearchParams(searchString)),
      listSort: parseListFilters(new URLSearchParams(searchString)).sort,
      page: parsePageFromSearch(new URLSearchParams(searchString)),
    });
  }, [searchString]);

  // Tek noktadan State ve URL senkronizasyonu
  const updateView = (updates) => {
    setViewState((prev) => {
      const next = { ...prev, ...updates };
      if (typeof window !== 'undefined') {
        let qs = buildManagedQueryString(new URLSearchParams(window.location.search), {
          managedKeys: MEDIA_FILTER_QUERY_KEYS,
          resetPage: false,
          values: toMediaQueryValues(next.media),
        });
        qs = buildManagedQueryString(new URLSearchParams(qs), {
          managedKeys: LIST_FILTER_QUERY_KEYS,
          resetPage: false,
          values: toListQueryValues({ sort: next.listSort }),
        });
        const params = new URLSearchParams(qs);
        if (next.page > 1) params.set('page', String(next.page));
        else params.delete('page');
        window.history.replaceState(
          {},
          '',
          params.toString() ? `${collectionRootPath}?${params.toString()}` : collectionRootPath
        );
      }
      return next;
    });
  };

  // Derived Data (Hesaplanan veriler - useMemo gereksiz yere fonksiyon sarmalamaması için basitleştirildi)
  const decadeOptions = getDecadeOptions();
  const genreOptions = useMemo(() => collectMediaGenreOptions(likes), [likes]);
  const likedKeys = useMemo(() => buildMediaKeySet(likes), [likes]);
  const filteredLikes = useMemo(
    () => applyMediaFilters(likes, viewState.media, { likedKeys }),
    [likedKeys, likes, viewState.media]
  );
  const sortedLikedLists = useMemo(
    () => sortProfileLists(likedLists, viewState.listSort),
    [likedLists, viewState.listSort]
  );

  const hasMediaFilters = hasActiveMediaFilters(viewState.media);
  const hasListFilters = hasActiveListFilters({ sort: viewState.listSort });

  if (!canShowLikesGrid) return <AccountSectionState message="This profile is private." />;

  return (
    <>
      {isOwner && activeSegment === 'titles' && (
        <FavoriteShowcaseManager
          items={favoriteShowcase}
          isSaving={isShowcaseSaving}
          onRemoveItem={handleToggleShowcase}
          onReorder={persistShowcase}
        />
      )}

      {activeSegment === 'titles' && (
        <AccountMediaGridPage
          currentPage={viewState.page}
          emptyMessage="No liked titles yet"
          icon="solar:heart-bold"
          items={filteredLikes}
          onPageChange={(page) => updateView({ page })}
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
                userId={auth.user?.id}
              />
            ) : null
          }
          toolbar={
            <AccountMediaFilterBar
              filters={viewState.media}
              decadeOptions={decadeOptions}
              genreOptions={genreOptions}
              visibilityOptions={LIKES_VISIBILITY_OPTIONS}
              onChange={(media) => updateView({ media: { ...viewState.media, ...media }, page: 1 })}
              onReset={
                (likes.length > 0 && hasMediaFilters) || hasMediaFilters
                  ? () => updateView({ media: getDefaultFilters().media, page: 1 })
                  : null
              }
            />
          }
          title="Titles"
        />
      )}

      {activeSegment === 'reviews' && (
        <AccountReviewsFeed
          enablePagination
          currentUserId={auth.user?.id}
          emptyMessage="No liked reviews yet"
          icon="solar:chat-round-bold"
          isLoading={isReviewsLoading}
          items={reviews}
          loadError={reviewsError}
          onLike={handleLike}
          showOwnActions={false}
          showHeader={false}
          summaryLabel={Number.isFinite(Number(reviewsTotalCount)) ? `${Number(reviewsTotalCount)} Reviews` : null}
          title="Reviews"
          watchedItems={watchedItems}
        />
      )}

      {activeSegment !== 'titles' && activeSegment !== 'reviews' && (
        <AccountPaginatedListGrid
          currentPage={viewState.page}
          emptyMessage="No liked lists yet"
          icon="solar:list-broken"
          isLoading={isLikedListsLoading}
          lists={sortedLikedLists}
          loadError={likedListsError}
          onPageChange={(page) => updateView({ page })}
          pageBasePath={collectionRootPath}
          showHeader={false}
          title="Lists"
          toolbar={
            <AccountListSortBar
              sort={viewState.listSort}
              onChange={(sort) => updateView({ listSort: sort, page: 1 })}
              onReset={
                (likedLists.length > 0 && hasListFilters) || hasListFilters
                  ? () => updateView({ listSort: getDefaultFilters().listSort, page: 1 })
                  : null
              }
            />
          }
        />
      )}
    </>
  );
}

// --------------------------------------------------
// VIEW COMPONENTS
// --------------------------------------------------

function ReorderableListItem({ item, renderEditAction }) {
  const controls = useDragControls();
  return (
    <Reorder.Item as="div" value={item} dragListener={false} dragControls={controls} className="relative w-full">
      <div className="flex w-full items-center gap-2 border border-black/15 bg-white/40 px-4 py-3">
        <div
          onPointerDown={(e) => controls.start(e)}
          className="center size-8 shrink-0 cursor-grab text-[#475569] transition"
        >
          <Icon icon="solar:reorder-bold" size={18} />
        </div>
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{getAccountMediaTitle(item)}</p>
        {renderEditAction?.(item)}
      </div>
    </Reorder.Item>
  );
}

function FavoriteShowcaseManager({ items = [], isSaving = false, onRemoveItem, onReorder }) {
  return (
    <AccountSectionLayout icon="solar:star-bold" summaryLabel={`${items.length}/5 selected`} title="Favorites Showcase">
      {items.length === 0 ? (
        <AccountInlineSectionState>No showcase titles selected yet</AccountInlineSectionState>
      ) : (
        <Reorder.Group
          as="div"
          axis="y"
          values={items}
          onReorder={onReorder || (() => {})}
          className="list-none space-y-2"
        >
          {items.map((item) => (
            <ReorderableListItem
              key={item.id || item.mediaKey || item.entityId}
              item={item}
              renderEditAction={(entry) => (
                <Button
                  variant="destructive-icon"
                  aria-label={`Remove ${entry?.title || entry?.name} from favorites`}
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
