import { AccountPageShell } from '@/features/account/shared/layout';
import AccountReviewFeed from '@/features/account/feeds/reviews';
import { AccountSectionState } from '@/features/account/shared/section-wrapper';
import { buildAccountPageShellProps, useAccountSectionState } from '../shared/section-context';
import Registry from './registry';

export default function ReviewsView({
  feedError,
  hasMore,
  isFeedLoading,
  isLoadingMore,
  likes,
  loadReviews,
  reviews,
  totalReviewCount,
  watchedItems,
  handleDeleteReview,
  handleEditReview,
  handleLike,
}) {
  const sectionState = useAccountSectionState();
  const shellProps = buildAccountPageShellProps(sectionState, {
    activeSection: 'reviews',
    skeletonVariant: 'reviews',
  });

  return (
    <AccountPageShell {...shellProps} registry={<Registry />}>
      {sectionState.canViewProfileCollections ? (
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
      )}
    </AccountPageShell>
  );
}
