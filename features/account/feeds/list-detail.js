'use client';

import { useEffect, useMemo, useState } from 'react';

import { AccountPageShell } from '@/features/account/profile/layout';
import { AccountSectionReveal } from '@/features/account/profile/layout';
import { AccountProfileMediaActions } from '@/features/account/profile/media-grid';
import { ACCOUNT_ROUTE_SHELL_CLASS } from '@/features/account/utils';
import { AccountSectionState } from '@/features/account/profile/section-wrapper';
import ReviewAuthFallback from '@/features/reviews/parts/review-auth-fallback';
import ReviewHeader from '@/features/reviews/parts/review-header';
import ReviewList from '@/features/reviews/parts/review-list';
import MediaCard from '@/features/shared/media-card';
import { TMDB_IMG } from '@/core/constants';
import { AuthGate } from '@/core/modules/auth';
import { Button } from '@/ui/elements';
import Icon from '@/ui/icon';

const LIST_SECTION_SHELL_CLASS = `${ACCOUNT_ROUTE_SHELL_CLASS} flex flex-col gap-6 px-4 sm:px-8`;
const MOBILE_MEDIA_QUERY = '(max-width: 1023px)';
const MAX_ROWS_PER_PAGE = 8;
const MOBILE_ITEMS_PER_PAGE = 3 * MAX_ROWS_PER_PAGE;
const DESKTOP_ITEMS_PER_PAGE = 6 * MAX_ROWS_PER_PAGE;

function getPaginationItems(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) {
    items.push('start-ellipsis');
  }

  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }

  if (end < totalPages - 1) {
    items.push('end-ellipsis');
  }

  items.push(totalPages);

  return items;
}

function useResponsivePageSize() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
    const handleChange = (event) => setIsMobile(event.matches);

    setIsMobile(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return isMobile ? MOBILE_ITEMS_PER_PAGE : DESKTOP_ITEMS_PER_PAGE;
}

function getPosterUrl(item) {
  if (item?.poster_path_full) {
    return item.poster_path_full;
  }

  if (item?.poster_path) {
    return `${TMDB_IMG}/w342${item.poster_path}`;
  }

  return null;
}

function ListDetailMediaGrid({ isOwner = false, items = [], onRemoveItem = null }) {
  const itemsPerPage = useResponsivePageSize();
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = items.length ? Math.ceil(items.length / itemsPerPage) : 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * itemsPerPage;
  const visibleItems = useMemo(
    () => items.slice(pageStart, pageStart + itemsPerPage),
    [items, pageStart, itemsPerPage]
  );
  const paginationItems = useMemo(() => getPaginationItems(safeCurrentPage, totalPages), [safeCurrentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  if (items.length === 0) {
    return (
      <div className="border border-black/15 bg-white/40 px-4 py-5 text-sm backdrop-blur-sm">
        No titles in this list yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
        {visibleItems.map((item, index) => {
          const mediaType = item?.entityType || item?.media_type;
          const mediaId = item?.entityId || item?.id;
          const title = item?.title || item?.name || 'Untitled';

          return (
            <MediaCard
              key={`${item.mediaKey || `${mediaType}-${mediaId}`}-${pageStart + index}`}
              href={`/${mediaType}/${mediaId}`}
              className="w-full"
              imageSrc={getPosterUrl(item)}
              imageAlt={title}
              imageSizes="(max-width: 767px) 33vw, (max-width: 1023px) 25vw, 16vw"
              topOverlay={
                isOwner && typeof onRemoveItem === 'function' ? (
                  <AccountProfileMediaActions
                    media={item}
                    onRemoveItem={onRemoveItem}
                    removeLabel={`Remove ${title} from this list`}
                  />
                ) : null
              }
              tooltipText={title}
            />
          );
        })}
      </div>

      {totalPages > 1 ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold tracking-widest text-black/60 uppercase">
            {pageStart + 1}-{Math.min(pageStart + itemsPerPage, items.length)} of {items.length}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
              disabled={safeCurrentPage === 1}
              className="center size-10 rounded-[10px] border border-black/15 bg-white/50 text-xs font-semibold text-black/70 transition disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Go to previous page"
            >
              <Icon size={15} icon="solar:skip-previous-bold" />
            </button>

            {paginationItems.map((item, index) =>
              typeof item === 'number' ? (
                <button
                  type="button"
                  key={item}
                  onClick={() => setCurrentPage(item)}
                  aria-current={item === safeCurrentPage ? 'page' : undefined}
                  className={`center size-10 rounded-[10px] border text-xs font-semibold transition ${
                    item === safeCurrentPage
                      ? 'border-black/30 bg-white/90 text-black shadow-sm'
                      : 'border-black/15 bg-white/50 text-black/70'
                  }`}
                >
                  {item}
                </button>
              ) : (
                <span key={`${item}-${index}`} className="px-1 text-xs text-black/50">
                  ...
                </span>
              )
            )}

            <button
              type="button"
              onClick={() => setCurrentPage((current) => Math.min(totalPages, current + 1))}
              disabled={safeCurrentPage === totalPages}
              className="center size-10 rounded-[10px] border border-black/15 bg-white/50 text-xs font-semibold text-black/70 transition disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Go to next page"
            >
              <Icon size={15} icon="solar:skip-next-bold" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function AccountListDetailFeed({
  auth,
  canShowList,
  followerCount,
  followingCount,
  followState,
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
  isBioSurfaceOpen,
  isFollowLoading,
  isLiked,
  isLikeLoading,
  isOwner,
  isPageLoading,
  isResolvingProfile,
  itemRemoveConfirmation,
  likeCount,
  list,
  listDeleteConfirmation,
  listCount,
  listItems,
  ownReview,
  pendingFollowRequestCount,
  profile,
  ratingStats,
  resolveError,
  resolvedUserId,
  reviews,
  setIsBioSurfaceOpen,
  unfollowConfirmation,
  username,
  userProfile,
  watchlistCount,
  RegistryComponent = null,
}) {
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
      isBioSurfaceOpen={isBioSurfaceOpen}
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
      setIsBioSurfaceOpen={setIsBioSurfaceOpen}
      unfollowConfirmation={unfollowConfirmation}
      username={username}
    />
  ) : null;

  return (
    <AccountPageShell
      activeSection="lists"
      followerCount={followerCount}
      followState={followState}
      followingCount={followingCount}
      isLoading={isPageLoading}
      isFollowLoading={isFollowLoading}
      isOwner={isOwner}
      likesCount={likeCount}
      listsCount={listCount}
      onFollow={handleFollow}
      onOpenFollowList={handleOpenFollowList}
      onReadMore={() => setIsBioSurfaceOpen(true)}
      profile={profile}
      registry={pageRegistry}
      resolvedUserId={resolvedUserId}
      skeletonVariant="list-detail"
      username={username}
      watchedCount={profile?.watchedCount || 0}
      watchlistCount={watchlistCount}
    >
      {canShowList && list ? (
        <>
          <AccountSectionReveal>
            <header className="relative">
              <div className={`${LIST_SECTION_SHELL_CLASS} pt-10 pb-8`}>
                <div className="flex w-full flex-col gap-3">
                  <h1 className="w-full text-3xl font-bold tracking-tight sm:text-4xl">{list.title}</h1>
                  <p className="w-full text-sm leading-6 text-black/70">
                    {String(list?.description || '').trim() || 'No description provided.'}
                  </p>
                </div>
              </div>
            </header>
          </AccountSectionReveal>

          <AccountSectionReveal delay={0.06}>
            <div className={`${LIST_SECTION_SHELL_CLASS} pb-12`}>
              <ListDetailMediaGrid isOwner={isOwner} items={listItems} onRemoveItem={handleRemoveListItem} />
            </div>
          </AccountSectionReveal>

          <AccountSectionReveal delay={0.1}>
            <div className={`${LIST_SECTION_SHELL_CLASS} pt-4 pb-20`}>
              <ReviewHeader ratingStats={ratingStats} totalReviews={reviews.length} />

              {!isOwner && (
                <AuthGate fallback={<ReviewAuthFallback onSignIn={handleSignInRequest} title={list.title} />}>
                  <div className="flex w-full flex-col items-start gap-3 border-y border-black/10 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        {ownReview ? 'Update your list review' : 'Rate or review this list'}
                      </p>
                      <p className="text-xs text-black/70">
                        {ownReview
                          ? 'Open the review modal to edit your score or text.'
                          : 'Share your rating and thoughts from the review modal.'}
                      </p>
                    </div>
                    <Button
                      className="bg-primary/40 inline-flex w-full items-center justify-center gap-2 rounded-[14px] border border-black/10 px-4 py-2 text-[11px] font-semibold tracking-wide text-black/70 uppercase transition ease-in-out hover:bg-black hover:text-white sm:w-auto sm:justify-between"
                      type="button"
                      onClick={handleOpenReviewComposer}
                    >
                      {ownReview ? 'Edit Review' : 'Add Review'}
                    </Button>
                  </div>
                </AuthGate>
              )}
              <ReviewList
                currentUserId={auth.user?.id || null}
                isLoading={false}
                loadError={null}
                onDeleteRequest={handleDeleteRequest}
                onEdit={handleEditReview}
                onLike={handleLikeReview}
                sortedReviews={reviews}
                userProfile={userProfile}
              />
            </div>
          </AccountSectionReveal>
        </>
      ) : canShowList ? (
        <AccountSectionState message="This list could not be found." />
      ) : (
        <AccountSectionState message="This profile is private." />
      )}
    </AccountPageShell>
  );
}
