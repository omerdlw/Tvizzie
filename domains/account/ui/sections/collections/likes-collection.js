'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
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
} from '@/domains/account/ui/filters/filtering';
import AccountPaginatedListGrid from '@/domains/account/ui/components/lists/list-grid';
import { getMediaTitle as getAccountMediaTitle } from '@/domains/account/utils/formatting';
import {
  AccountListSortBar,
  AccountMediaFilterBar,
} from '@/domains/account/ui/filters/content-filter-primitives';
import { AccountInlineSectionState } from '@/domains/account/ui/sections/account-section';
import AccountSectionLayout, {
  AccountSectionState,
} from '@/domains/account/ui/sections/account-section';
import AccountMediaGridPage, {
  ProfileMediaActions,
} from '@/domains/account/ui/components/account-media-grid';
import { Button } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';
import AccountReviewsFeed from '../feeds/reviews';
import { Reorder } from 'framer-motion';
import MediaCard from '@/ui/components/media-card';
import { toAccountMediaCard, getCanonicalMediaKey } from '@/domains/account/utils/media-card';
const LIKES_VISIBILITY_OPTIONS = Object.freeze([
  Object.freeze({
    key: 'hide_unreleased',
    label: 'Hide unreleased titles',
  }),
  Object.freeze({
    key: 'hide_documentaries',
    label: 'Hide documentaries',
  }),
]);
const LIKES_ALLOWED_EYE_FLAGS = LIKES_VISIBILITY_OPTIONS.map((o) => o.key);
const parseLikesMediaFilters = (search) =>
  parseMediaFilters(search, {
    allowedEyeFlags: LIKES_ALLOWED_EYE_FLAGS,
  });
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
  hasMoreReviews = false,
  isLikedListsLoading,
  isLikesLoading = false,
  isOwner,
  isReviewsLoading,
  isReviewsLoadingMore = false,
  isShowcaseSaving,
  likedLists,
  likedListsError,
  loadReviews = null,
  likes,
  onReorderShowcase,
  onRemoveShowcaseItem,
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

  const updateView = (updates) => {
    setViewState((prev) => ({ ...prev, ...updates }));
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let qs = buildManagedQueryString(new URLSearchParams(window.location.search), {
      managedKeys: MEDIA_FILTER_QUERY_KEYS,
      resetPage: false,
      values: toMediaQueryValues(viewState.media),
    });
    qs = buildManagedQueryString(new URLSearchParams(qs), {
      managedKeys: LIST_FILTER_QUERY_KEYS,
      resetPage: false,
      values: toListQueryValues({
        sort: viewState.listSort,
      }),
    });
    const params = new URLSearchParams(qs);
    if (viewState.page > 1) params.set('page', String(viewState.page));
    else params.delete('page');
    const newUrl = params.toString()
      ? `${collectionRootPath}?${params.toString()}`
      : collectionRootPath;
    if (window.location.pathname + window.location.search !== newUrl) {
      window.history.replaceState({}, '', newUrl);
    }
  }, [viewState, collectionRootPath]);

  const decadeOptions = getDecadeOptions();
  const genreOptions = useMemo(() => collectMediaGenreOptions(likes), [likes]);
  const likedKeys = useMemo(() => buildMediaKeySet(likes), [likes]);
  const filteredLikes = useMemo(
    () =>
      applyMediaFilters(likes, viewState.media, {
        likedKeys,
      }),
    [likedKeys, likes, viewState.media],
  );
  const sortedLikedLists = useMemo(
    () => sortProfileLists(likedLists, viewState.listSort),
    [likedLists, viewState.listSort],
  );
  const hasMediaFilters = hasActiveMediaFilters(viewState.media);
  const hasListFilters = hasActiveListFilters({
    sort: viewState.listSort,
  });
  if (!canShowLikesGrid) return <AccountSectionState message="This profile is private." />;
  const hasLikes = Array.isArray(likes) && likes.length > 0;
  return (
    <>
      {isOwner && activeSegment === 'titles' && (hasLikes || isLikesLoading) && (
        <FavoriteShowcaseManager
          items={favoriteShowcase}
          isOwner={isOwner}
          onRemoveItem={onRemoveShowcaseItem || handleToggleShowcase}
          onReorder={onReorderShowcase || persistShowcase}
          userId={auth?.user?.id}
        />
      )}

      {activeSegment === 'titles' && (
        <AccountMediaGridPage
          currentPage={viewState.page}
          emptyMessage="No liked titles yet"
          icon="solar:heart-bold"
          isLoading={isLikesLoading}
          items={filteredLikes}
          onPageChange={(page) =>
            updateView({
              page,
            })
          }
          pageBasePath={collectionRootPath}
          showHeader={false}
          renderOverlay={(item) =>
            isOwner ? (
              <ProfileMediaActions
                extraActions={[
                  {
                    disabled:
                      !showcaseMap.has(getCanonicalMediaKey(item)) && favoriteShowcase.length >= 5,
                    icon: showcaseMap.has(getCanonicalMediaKey(item))
                      ? 'solar:star-bold'
                      : 'solar:star-linear',
                    label: showcaseMap.has(getCanonicalMediaKey(item))
                      ? 'Remove from favorites showcase'
                      : 'Add to favorites showcase',
                    onClick: handleToggleShowcase,
                  },
                ]}
                item={item}
                onRemoveItem={handleRequestRemoveLike}
                removeLabel={`Remove ${item.title || item.name} from likes`}
                currentUserId={auth.user?.id}
              />
            ) : null
          }
          toolbar={
            likes.length > 0 || hasMediaFilters ? (
              <AccountMediaFilterBar
                filters={viewState.media}
                decadeOptions={decadeOptions}
                genreOptions={genreOptions}
                visibilityOptions={LIKES_VISIBILITY_OPTIONS}
                onChange={(media) =>
                  updateView({
                    media: {
                      ...viewState.media,
                      ...media,
                    },
                    page: 1,
                  })
                }
                onReset={
                  hasMediaFilters
                    ? () =>
                        updateView({
                          media: getDefaultFilters().media,
                          page: 1,
                        })
                    : null
                }
              />
            ) : null
          }
          title="Titles"
        />
      )}

      {activeSegment === 'reviews' && (
        <AccountReviewsFeed
          currentUserId={auth.user?.id}
          emptyMessage="No liked reviews yet"
          icon="solar:chat-round-bold"
          hasMore={hasMoreReviews}
          isLoading={isReviewsLoading}
          isLoadingMore={isReviewsLoadingMore}
          items={reviews}
          loadError={reviewsError}
          onLike={handleLike}
          onLoadMore={hasMoreReviews ? () => loadReviews?.({ append: true }) : null}
          showOwnActions={false}
          showHeader={false}
          summaryLabel={
            Number.isFinite(Number(reviewsTotalCount))
              ? `${Number(reviewsTotalCount)} Reviews`
              : null
          }
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
          onPageChange={(page) =>
            updateView({
              page,
            })
          }
          pageBasePath={collectionRootPath}
          showHeader={false}
          title="Lists"
          toolbar={
            sortedLikedLists.length > 0 ? (
              <AccountListSortBar
                sort={viewState.listSort}
                onChange={(sort) =>
                  updateView({
                    listSort: sort,
                    page: 1,
                  })
                }
                onReset={
                  hasListFilters
                    ? () =>
                        updateView({
                          listSort: getDefaultFilters().listSort,
                          page: 1,
                        })
                    : null
                }
              />
            ) : null
          }
        />
      )}
    </>
  );
}

function ShowcaseCardItem({ isOwner, item, onRemoveItem, userId }) {
  const isDraggingRef = useRef(false);
  const canonicalKey = getCanonicalMediaKey(item);
  const card = toAccountMediaCard(item);
  if (!card) return null;

  return (
    <Reorder.Item
      as="div"
      key={canonicalKey}
      value={item}

      whileDrag={{
        scale: 1.05,
        zIndex: 40,
      }}
      transition={{ duration: 0.2 }}
      onDragStart={() => {
        isDraggingRef.current = true;
      }}
      onDragEnd={() => {
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 150);
      }}
      onClickCapture={(event) => {
        if (isDraggingRef.current) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      <MediaCard
        href={card.href}
        imageAlt={card.imageAlt}
        imageSizes="(max-width: 767px) 33vw, (max-width: 1023px) 25vw, 20vw"
        imageSrc={card.imageSrc}
        tooltipText={card.tooltipText}
        topOverlay={
          isOwner ? (
            <ProfileMediaActions
              item={item}
              onRemoveItem={onRemoveItem}
              removeLabel={`Remove ${item?.title || item?.name || 'item'} from favorites`}
              currentUserId={userId}
            />
          ) : null
        }
      />
    </Reorder.Item>
  );
}

function FavoriteShowcaseManager({
  items = [],
  isOwner = false,
  onRemoveItem,
  onReorder,
  userId = null,
}) {
  const showcaseItems = items.slice(0, 5);

  return (
    <div className="mb-8 w-full">
      <AccountSectionLayout
        icon="solar:star-bold"
        summaryLabel={`${items.length}/5 selected`}
        title="Favorites Showcase"
        showHeader={true}
      >
        {showcaseItems.length === 0 ? (
          <AccountInlineSectionState>
            No showcase titles selected yet. Click the star icon on any liked title to feature it here.
          </AccountInlineSectionState>
        ) : (
          <Reorder.Group
            as="div"
            axis="x"
            values={items}
            onReorder={onReorder}
            className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-4 md:grid-cols-5 lg:grid-cols-5"
          >
            {showcaseItems.map((item) => {
              const canonicalKey = getCanonicalMediaKey(item);
              return (
                <ShowcaseCardItem
                  key={canonicalKey}
                  isOwner={isOwner}
                  item={item}
                  onRemoveItem={onRemoveItem}
                  userId={userId}
                />
              );
            })}
          </Reorder.Group>
        )}
      </AccountSectionLayout>
    </div>
  );
}
