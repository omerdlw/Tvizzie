import AccountLikesFeed from '@/features/account/feeds/likes';
import { AccountPageShell } from '@/features/account/shared/layout';
import { buildAccountPageShellProps, useAccountSectionState } from '../shared/section-context';
import Registry from './registry';

export default function LikesView({
  activeSegment,
  favoriteShowcase,
  handleLike,
  handleRequestRemoveLike,
  handleSegmentChange,
  handleToggleShowcase,
  isLikedListsLoading,
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
  const sectionState = useAccountSectionState();
  const shellProps = buildAccountPageShellProps(sectionState, {
    activeSection: 'likes',
    skeletonVariant: 'collection',
  });

  return (
    <AccountPageShell
      {...shellProps}
      registry={
        <Registry
          activeSegment={activeSegment}
          canShowLikesGrid={sectionState.canViewProfileCollections}
          handleSegmentChange={handleSegmentChange}
        />
      }
    >
      <AccountLikesFeed
        activeSegment={activeSegment}
        auth={sectionState.auth}
        canShowLikesGrid={sectionState.canViewProfileCollections}
        favoriteShowcase={favoriteShowcase}
        handleLike={handleLike}
        handleRequestRemoveLike={handleRequestRemoveLike}
        handleToggleShowcase={handleToggleShowcase}
        isLikedListsLoading={isLikedListsLoading}
        isOwner={sectionState.isOwner}
        isReviewsLoading={isReviewsLoading}
        isShowcaseSaving={isShowcaseSaving}
        likedLists={likedLists}
        likedListsError={likedListsError}
        likes={likes}
        persistShowcase={persistShowcase}
        reviews={reviews}
        reviewsTotalCount={reviewsTotalCount}
        reviewsError={reviewsError}
        showcaseMap={showcaseMap}
        watchedItems={watchedItems}
      />
    </AccountPageShell>
  );
}
