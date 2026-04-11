'use client';

import { Reorder, useDragControls } from 'framer-motion';

import AccountPaginatedListGrid from '@/features/account/lists/grid';
import { getMediaTitle as getAccountMediaTitle } from '@/features/account/utils';
import AccountSectionLayout, { AccountSectionState } from '@/features/account/shared/section-wrapper';
import AccountMediaGridPage, { AccountProfileMediaActions } from '@/features/account/shared/media-grid';
import { Button } from '@/ui/elements';
import Icon from '@/ui/icon';
import AccountReviewsFeed from './reviews';

function ReorderableListItem({ item, renderEditAction }) {
  const controls = useDragControls();

  return (
    <Reorder.Item as="div" value={item} dragListener={false} dragControls={controls} className="relative w-full">
      <div className="flex w-full items-center gap-2 border border-black/15 bg-white/40 px-4 py-3 backdrop-blur-sm">
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
        <div className="border border-black/15 bg-white/40 p-4 text-sm text-black/70 backdrop-blur-sm">
          No showcase titles selected yet.
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
  currentPage,
  favoriteShowcase,
  handleLike,
  handleRequestRemoveLike,
  handleToggleShowcase,
  hasMoreReviews,
  isLikedListsLoading,
  isOwner,
  isReviewsLoading,
  isReviewsLoadingMore = false,
  isShowcaseSaving,
  likedLists,
  likedListsError,
  likes,
  loadReviews,
  persistShowcase,
  reviews,
  reviewsError,
  showcaseMap,
  username,
  watchedItems,
}) {
  return (
    <>
      {isOwner && activeSegment === 'films' ? (
        <FavoriteShowcaseManager
          items={favoriteShowcase}
          isSaving={isShowcaseSaving}
          onRemoveItem={handleToggleShowcase}
          onReorder={persistShowcase}
        />
      ) : null}

      {canShowLikesGrid ? (
        activeSegment === 'films' ? (
          <AccountMediaGridPage
            currentPage={currentPage}
            emptyMessage="No liked films yet"
            icon="solar:heart-bold"
            items={likes}
            pageBasePath={`/account/${username}/likes?segment=films`}
            renderOverlay={(item) =>
              isOwner ? (
                <AccountProfileMediaActions
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
            title="Films"
          />
        ) : activeSegment === 'reviews' ? (
          <AccountReviewsFeed
            currentUserId={auth.user?.id || null}
            emptyMessage="No liked reviews yet"
            hasMore={hasMoreReviews}
            icon="solar:chat-round-bold"
            isLoading={isReviewsLoading}
            isLoadingMore={isReviewsLoadingMore}
            items={reviews}
            loadError={reviewsError}
            onLike={handleLike}
            onLoadMore={() => loadReviews({ append: true })}
            showOwnActions={false}
            title="Reviews"
            watchedItems={watchedItems}
          />
        ) : (
          <AccountPaginatedListGrid
            currentPage={currentPage}
            emptyMessage="No liked lists yet"
            icon="solar:list-broken"
            isLoading={isLikedListsLoading}
            lists={likedLists}
            loadError={likedListsError}
            pageBasePath={`/account/${username}/likes?segment=lists`}
            title="Lists"
          />
        )
      ) : (
        <AccountSectionState message="This profile is private." />
      )}
    </>
  );
}
