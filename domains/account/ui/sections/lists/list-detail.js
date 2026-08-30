'use client';

import { useCallback, useMemo, useState } from 'react';

import { useSelectionHud } from '@/domains/shell/navigation/huds';
import { Button } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';
import { cn } from '@/ui/class-names';
import { AccountPageShell } from '@/domains/account/ui/layouts/account-layout';
import AccountMediaGridPage, {
  ProfileMediaActions,
  getListItemKey,
} from '@/domains/account/ui/components/account-media-grid';
import {
  AccountMediaFilterBar,
  AccountReviewFilterBar,
} from '@/domains/account/ui/filters/content-filter-primitives';
import ReviewAuthFallback from '@/domains/reviews/ui/components/review-auth-fallback';
import AccountSectionLayout, {
  AccountSectionState,
} from '@/domains/account/ui/sections/account-section';
import ListDetailCommentsSection from './list-detail-comments';
import {
  LIST_DETAIL_MEDIA_VISIBILITY_OPTIONS,
  LIST_COMMENT_SORT_OPTIONS,
} from './list-detail-config';
import { useListDetailFilterState } from './use-list-detail-filters';

export default function AccountListDetailFeed({ model = {}, RegistryComponent = null }) {
  const {
    auth,
    canShowList,
    followerCount,
    followingCount,
    followState,
    handleBulkDeleteListItems,
    handleDeleteList,
    handleDeleteRequest,
    handleEditReview,
    handleEditList,
    handleEditProfile,
    handleFollow,
    handleLikeReview,
    handleOpenFollowList,
    handleOpenReviewComposer,
    handleRemoveListItem,
    handleSignInRequest,
    handleToggleLike,
    isFollowLoading,
    isLiked,
    isLikeLoading,
    isListLoading,
    isListItemsLoading,
    isOwner,
    isPageLoading,
    isResolvingProfile,
    isReviewsLoading,
    itemRemoveConfirmation,
    likeCount,
    list,
    listDeleteConfirmation,
    listCount,
    listItems = [],
    likes = [],
    ownReview,
    pendingFollowRequestCount,
    profile,
    resolveError,
    resolvedUserId,
    reviews = [],
    unfollowConfirmation,
    username,
    userProfile,
    watchedItems = [],
    watchlistCount = 0,
    watchlistItems = [],
  } = model;

  const {
    decadeOptions,
    filteredListItems,
    filteredReviews,
    genreOptions,
    hasMediaFilters,
    hasReviewFilters,
    mediaFilters,
    resetMediaFilters,
    resetReviewFilters,
    reviewFilters,
    reviewYearOptions,
    updateMediaFilters,
    updateReviewFilters,
  } = useListDetailFilterState({
    likedItems: likes,
    listItems,
    reviews,
    watchedItems,
    watchlistItems,
  });
  const [mediaPage, setMediaPage] = useState(1);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const hasListItems = listItems.length > 0;

  const handleToggleSelect = useCallback((item) => {
    const key = getListItemKey(item);
    if (!key) return;
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const allKeys = filteredListItems.map(getListItemKey).filter(Boolean);
    setSelectedKeys((prev) => {
      if (prev.size === allKeys.length) {
        return new Set();
      }
      return new Set(allKeys);
    });
  }, [filteredListItems]);

  const handleBulkDelete = useCallback(async () => {
    if (!isOwner || selectedKeys.size === 0 || !list?.id || !auth?.user?.id) return;
    if (typeof handleBulkDeleteListItems === 'function') {
      setIsBulkDeleting(true);
      try {
        await handleBulkDeleteListItems(Array.from(selectedKeys));
        setSelectedKeys(new Set());
        setIsSelectionMode(false);
      } finally {
        setIsBulkDeleting(false);
      }
    }
  }, [auth?.user?.id, handleBulkDeleteListItems, isOwner, list?.id, selectedKeys]);

  const handleCancelSelection = useCallback(() => {
    setSelectedKeys(new Set());
    setIsSelectionMode(false);
  }, []);

  const hudActions = useMemo(
    () => [
      {
        key: 'toggle-all',
        label:
          selectedKeys.size === filteredListItems.length && filteredListItems.length > 0
            ? 'Deselect All'
            : 'Select All',
        icon: 'solar:check-read-linear',
        onClick: handleSelectAll,
      },
      {
        key: 'bulk-delete',
        label: isBulkDeleting ? 'Deleting...' : 'Delete',
        icon: 'solar:trash-bin-trash-bold',
        isDestructive: true,
        disabled: selectedKeys.size === 0 || isBulkDeleting,
        onClick: handleBulkDelete,
      },
    ],
    [
      filteredListItems.length,
      handleBulkDelete,
      handleSelectAll,
      isBulkDeleting,
      selectedKeys.size,
    ],
  );

  useSelectionHud({
    isActive: isSelectionMode,
    count: selectedKeys.size,
    title: selectedKeys.size === 1 ? 'item selected' : 'items selected',
    actions: hudActions,
    onCancel: handleCancelSelection,
  });

  const pageRegistry = RegistryComponent ? (
    <RegistryComponent
      auth={auth}
      followState={followState}
      handleDeleteList={handleDeleteList}
      handleEditList={handleEditList}
      handleEditProfile={handleEditProfile}
      handleFollow={handleFollow}
      handleOpenFollowList={handleOpenFollowList}
      handleSignInRequest={handleSignInRequest}
      handleToggleLike={handleToggleLike}
      handleOpenReviewComposer={handleOpenReviewComposer}
      ownReview={ownReview}
      isFollowLoading={isFollowLoading}
      isLiked={isLiked}
      isLikeLoading={isLikeLoading}
      isOwner={isOwner}
      isPageLoading={isPageLoading}
      isResolvingProfile={isResolvingProfile}
      itemRemoveConfirmation={itemRemoveConfirmation}
      list={list}
      listItemsCount={listItems.length}
      listDeleteConfirmation={listDeleteConfirmation}
      pendingFollowRequestCount={pendingFollowRequestCount}
      profile={profile}
      resolveError={resolveError}
      unfollowConfirmation={unfollowConfirmation}
      username={username}
    />
  ) : null;

  return (
    <AccountPageShell
      activeSection="lists"
      followerCount={followerCount}
      followState={followState}
      isLoading={isPageLoading || isListLoading || (isResolvingProfile && !list)}
      isFollowLoading={isFollowLoading}
      isOwner={isOwner}
      likesCount={likeCount}
      listsCount={listCount}
      onFollow={handleFollow}
      onOpenFollowList={handleOpenFollowList}
      profile={profile}
      registry={pageRegistry}
      resolvedUserId={resolvedUserId}
      skeletonVariant="list-detail"
      username={username}
      watchedCount={profile?.watchedCount || 0}
      watchlistCount={watchlistCount}
    >
      {!canShowList ? (
        <AccountSectionState message="This profile is private." />
      ) : !list ? (
        <AccountSectionState message="This list could not be found." />
      ) : (
        <div className="flex w-full flex-col gap-10 sm:gap-12">
          <AccountMediaGridPage
            currentPage={mediaPage}
            emptyMessage={
              hasMediaFilters && hasListItems ? 'No titles match the current filters.' : undefined
            }
            icon="solar:clapperboard-bold"
            isLoading={isListItemsLoading}
            isSelectionMode={isSelectionMode}
            items={filteredListItems}
            onPageChange={setMediaPage}
            onToggleSelect={handleToggleSelect}
            selectedKeys={selectedKeys}
            showHeader={false}
            title={list?.title || 'List'}
            renderOverlay={(item) =>
              isOwner ? (
                <ProfileMediaActions
                  item={item}
                  onRemoveItem={handleRemoveListItem}
                  removeLabel={`Remove ${item?.title || item?.name || 'item'} from this list`}
                  currentUserId={auth.user?.id}
                />
              ) : null
            }
            toolbar={
              hasListItems && (
                <AccountMediaFilterBar
                  defaultSort="list_order"
                  defaultSortLabel="Default sort: List order"
                  filters={mediaFilters}
                  decadeOptions={decadeOptions}
                  genreOptions={genreOptions}
                  visibilityOptions={LIST_DETAIL_MEDIA_VISIBILITY_OPTIONS}
                  onChange={updateMediaFilters}
                  onReset={hasMediaFilters ? resetMediaFilters : null}
                  action={
                    isOwner && (
                      <Button
                        type="button"
                        onClick={() => {
                          if (isSelectionMode) {
                            setSelectedKeys(new Set());
                            setIsSelectionMode(false);
                          } else {
                            setIsSelectionMode(true);
                          }
                        }}
                        className={cn(
                          'inline-flex min-h-9 items-center gap-1.5 rounded-xl ring-1 ring-inset px-3 text-xs font-medium transition-colors',
                          isSelectionMode
                            ? 'ring-white/10 bg-white/10 text-white hover:bg-white/15'
                            : 'ring-white/5 bg-white/5 text-white/70 hover:ring-white/10 hover:bg-white/10 hover:text-white',
                        )}
                      >
                        <Icon
                          icon={
                            isSelectionMode
                              ? 'solar:close-circle-bold'
                              : 'solar:checklist-minimalistic-bold'
                          }
                          size={15}
                        />
                        <span>{isSelectionMode ? 'Done' : 'Select'}</span>
                      </Button>
                    )
                  }
                />
              )
            }
          />

          <AccountSectionLayout
            contentPaddingClassName=""
            icon="solar:chat-round-line-bold"
            isInitialSection={false}
            revealDelay={0.1}
            summaryLabel={`${reviews.length} ${reviews.length === 1 ? 'Comment' : 'Comments'}`}
            title="Comments"
            showHeader={true}
            toolbarPaddingClassName=""
            toolbar={
              !auth?.user || reviews.length > 0 ? (
                <>
                  {!auth?.user && (
                    <ReviewAuthFallback
                      mode="comment"
                      onSignIn={handleSignInRequest}
                      title={list.title}
                      variant="account-section"
                    />
                  )}
                  {reviews.length > 0 ? (
                    <div>
                      <AccountReviewFilterBar
                        filters={reviewFilters}
                        showRatingFilter={false}
                        sortOptions={LIST_COMMENT_SORT_OPTIONS}
                        visibilityOptions={[]}
                        yearOptions={reviewYearOptions}
                        onChange={updateReviewFilters}
                        onReset={hasReviewFilters ? resetReviewFilters : null}
                      />
                    </div>
                  ) : null}
                </>
              ) : null
            }
          >
            <ListDetailCommentsSection
              auth={auth}
              filteredReviews={filteredReviews}
              isLoading={isReviewsLoading}
              list={list}
              onDeleteRequest={handleDeleteRequest}
              onEditReview={handleEditReview}
              onLikeReview={handleLikeReview}
              reviews={reviews}
              userProfile={userProfile}
            />
          </AccountSectionLayout>
        </div>
      )}
    </AccountPageShell>
  );
}
