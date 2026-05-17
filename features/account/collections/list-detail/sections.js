'use client';

import { AuthGate } from '@/core/modules/auth';
import { Button } from '@/ui/elements';
import AccountMediaFilterBar from '@/features/account/filters/media/bar';
import AccountReviewFilterBar from '@/features/account/filters/reviews/bar';
import { AccountInlineSectionState } from '@/features/account/components/section-wrapper';
import AccountPagination from '@/features/account/components/pagination';
import { AccountSectionReveal } from '@/features/account/components/layout';
import ReviewAuthFallback from '@/features/reviews/components/review-auth-fallback';
import ReviewHeader from '@/features/reviews/components/review-header';
import ReviewList from '@/features/reviews/components/review-list';
import ListDetailMediaGrid from './media-grid';

export function ListDetailHeaderSection({ list, sectionShellClass }) {
  return (
    <AccountSectionReveal index={0}>
      <header>
        <div className={sectionShellClass}>
          <div className="flex w-full flex-col gap-0">
            <h1 className="w-full text-3xl font-bold tracking-tight sm:text-4xl">{list.title}</h1>
            <p className="w-full text-sm leading-6 text-white/70">
              {String(list?.description || '').trim() || 'No description provided.'}
            </p>
          </div>
        </div>
      </header>
    </AccountSectionReveal>
  );
}

export function ListDetailItemsSection({
  auth,
  decadeOptions,
  filteredListItems,
  genreOptions,
  hasListItems,
  hasMediaFilters,
  isOwner,
  listItems,
  mediaFilters,
  onRemoveListItem,
  onResetMediaFilters,
  onUpdateMediaFilters,
  sectionShellClass,
  visibilityOptions,
}) {
  return (
    <AccountSectionReveal index={1}>
      <div>
        <div className={sectionShellClass}>
          {hasListItems ? (
            <div className="account-filter-bar account-detail-full-width-item border-y border-white/10 p-4">
              <AccountMediaFilterBar
                filters={mediaFilters}
                decadeOptions={decadeOptions}
                genreOptions={genreOptions}
                visibilityOptions={visibilityOptions}
                onChange={onUpdateMediaFilters}
                onReset={hasMediaFilters ? onResetMediaFilters : null}
              />
            </div>
          ) : null}

          <div className="px-4 pt-4">
            {hasMediaFilters ? (
              <p className="pb-5 text-xs font-semibold tracking-widest text-white/50 uppercase">
                {filteredListItems.length} of {listItems.length} titles shown
              </p>
            ) : null}

            <ListDetailMediaGrid
              emptyMessage={hasMediaFilters && listItems.length > 0 ? 'No titles match the current filters.' : undefined}
              isOwner={isOwner}
              items={filteredListItems}
              onRemoveItem={onRemoveListItem}
              userId={auth.user?.id || null}
            />
          </div>
        </div>
      </div>
    </AccountSectionReveal>
  );
}

export function ListDetailCommentsSection({
  auth,
  currentReviewPage,
  filteredReviews,
  handleDeleteRequest,
  handleEditReview,
  handleLikeReview,
  handleOpenReviewComposer,
  handleSignInRequest,
  hasListReviews,
  hasReviewFilters,
  isOwner,
  list,
  ownReview,
  reviewFilters,
  reviewSortOptions,
  reviewYearOptions,
  reviews,
  safeCurrentReviewPage,
  sectionShellClass,
  setCurrentReviewPage,
  totalReviewPages,
  updateReviewFilters,
  resetReviewFilters,
  userProfile,
  visibleReviews,
}) {
  return (
    <AccountSectionReveal index={2}>
      <div>
        <div className={sectionShellClass}>
          <div className="account-detail-full-width-item border-y border-white/10 px-4 py-4">
            <ReviewHeader itemLabel="comment" showRatingSummary={false} title="Comments" totalReviews={reviews.length} />
          </div>

          {hasListReviews ? (
            <div className="account-detail-full-width-item border-y border-white/10 p-4">
              <AccountReviewFilterBar
                filters={reviewFilters}
                showRatingFilter={false}
                sortOptions={reviewSortOptions}
                visibilityOptions={[]}
                yearOptions={reviewYearOptions}
                onChange={updateReviewFilters}
                onReset={hasReviewFilters ? resetReviewFilters : null}
              />
            </div>
          ) : null}

          {hasListReviews && hasReviewFilters ? (
            <p className="px-6 pt-6 text-xs font-semibold tracking-widest text-white/50 uppercase">
              {filteredReviews.length} of {reviews.length} comments shown
            </p>
          ) : null}

          {!isOwner && (
            <AuthGate fallback={<ReviewAuthFallback mode="comment" onSignIn={handleSignInRequest} title={list.title} />}>
              <div className="account-detail-full-width-item flex w-full flex-col items-start gap-0 border-y border-white/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{ownReview ? 'Update your comment' : 'Write a comment'}</p>
                  <p className="text-xs text-white/70">
                    {ownReview
                      ? 'Open the comment composer to edit your text.'
                      : 'Share your thoughts from the comment composer.'}
                  </p>
                </div>
                <Button
                  className="bg-primary/30 inline-flex w-full items-center justify-center gap-0 border border-white/10 px-0 py-0 text-xs font-semibold tracking-wide text-white/70 uppercase hover:bg-white hover:text-black sm:w-auto sm:justify-between"
                  type="button"
                  onClick={handleOpenReviewComposer}
                >
                  {ownReview ? 'Edit Comment' : 'Add Comment'}
                </Button>
              </div>
            </AuthGate>
          )}

          {visibleReviews.length === 0 ? (
            <div className="px-6 pt-6">
              <AccountInlineSectionState>
                {hasReviewFilters && reviews.length > 0 ? 'No comments match the current filters.' : 'No comments yet'}
              </AccountInlineSectionState>
            </div>
          ) : (
            <ReviewList
              currentUserId={auth.user?.id || null}
              isLoading={false}
              loadError={null}
              onDeleteRequest={handleDeleteRequest}
              onEdit={handleEditReview}
              onLike={handleLikeReview}
              showTopBorder={false}
              sortedReviews={visibleReviews}
              userProfile={userProfile}
            />
          )}

          {totalReviewPages > 1 ? (
            <div className="px-6 pt-6">
              <AccountPagination
                className="w-full"
                currentPage={safeCurrentReviewPage || currentReviewPage}
                totalPages={totalReviewPages}
                onPageChange={setCurrentReviewPage}
                prevAriaLabel="Go to previous review page"
                nextAriaLabel="Go to next review page"
              />
            </div>
          ) : null}
        </div>
      </div>
    </AccountSectionReveal>
  );
}
