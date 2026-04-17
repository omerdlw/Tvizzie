import AccountLikesFeed from '@/features/account/feeds/likes';
import AccountAction from '@/features/navigation/actions/account-action';
import { createAccountSectionRegistry, createAccountSectionView } from '../../shared/section-factory';

export const Registry = createAccountSectionRegistry({
  displayName: 'AccountLikesRegistry',
  navDescription: 'Likes',
  navRegistrySource: 'account-likes',
  resolveOverrides: (
    sectionState,
    { activeSegment = 'films', canShowLikesGrid = false, handleSegmentChange = () => {} }
  ) => ({
    navActionOverride: canShowLikesGrid ? (
      <AccountAction
        mode="tab-switch"
        activeTab={activeSegment}
        tabs={[
          { key: 'films', label: 'Films' },
          { key: 'reviews', label: 'Reviews' },
          { key: 'lists', label: 'Lists' },
        ]}
        onTabChange={handleSegmentChange}
        followState={sectionState.followState}
        isFollowLoading={sectionState.isFollowLoading}
        isOwner={sectionState.isOwner}
        onFollow={sectionState.handleFollow}
        showProfileFollowAction
      />
    ) : null,
  }),
});

export default createAccountSectionView({
  activeSection: 'likes',
  displayName: 'AccountLikesView',
  Registry,
  resolveRegistryProps: (sectionState, { activeSegment, handleSegmentChange }) => ({
    activeSegment,
    canShowLikesGrid: sectionState.canViewProfileCollections,
    handleSegmentChange,
  }),
  skeletonVariant: 'collection',
  renderContent: (
    sectionState,
    {
      activeSegment,
      favoriteShowcase,
      handleLike,
      handleRequestRemoveLike,
      handleToggleShowcase,
      isLikedListsLoading,
      isReviewsLoading,
      isShowcaseSaving,
      likedLists,
      likedListsError,
      likes,
      persistShowcase,
      reviews,
      reviewsError,
      reviewsTotalCount,
      showcaseMap,
      watchedItems,
    }
  ) => (
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
      reviewsError={reviewsError}
      reviewsTotalCount={reviewsTotalCount}
      showcaseMap={showcaseMap}
      watchedItems={watchedItems}
    />
  ),
});
