import AccountReviewFeed from '@/features/account/feeds/reviews';
import { AccountSectionState } from '@/features/account/shared/section-wrapper';
import { createAccountSectionRegistry, createAccountSectionView } from '../../shared/section-factory';

export const Registry = createAccountSectionRegistry({
  displayName: 'AccountReviewsRegistry',
  navDescription: 'Reviews',
  navRegistrySource: 'account-reviews',
});

export default createAccountSectionView({
  activeSection: 'reviews',
  displayName: 'AccountReviewsView',
  Registry,
  skeletonVariant: 'reviews',
  renderContent: (
    sectionState,
    {
      feedError,
      hasMore,
      handleDeleteReview,
      handleEditReview,
      handleLike,
      isFeedLoading,
      isLoadingMore,
      likes,
      loadReviews,
      reviews,
      totalReviewCount,
      watchedItems,
    }
  ) =>
    sectionState.canViewProfileCollections ? (
      <AccountReviewFeed
        currentUserId={sectionState.auth.user?.id || null}
        emptyMessage="No reviews yet"
        hasMore={hasMore}
        icon="solar:chat-round-bold"
        isLoading={isFeedLoading}
        isLoadingMore={isLoadingMore}
        items={reviews}
        likes={likes}
        loadError={feedError}
        onDeleteRequest={handleDeleteReview}
        onEdit={handleEditReview}
        onLike={handleLike}
        onLoadMore={() => loadReviews({ append: true })}
        showHeader={false}
        showOwnActions={sectionState.isOwner}
        summaryLabel={Number.isFinite(Number(totalReviewCount)) ? `${Number(totalReviewCount)} Reviews` : null}
        title="Reviews"
        watchedItems={watchedItems}
      />
    ) : (
      <AccountSectionState message="This profile is private." />
    ),
});
