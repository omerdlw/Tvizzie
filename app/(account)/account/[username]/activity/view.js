import AccountActivityFeed from '@/features/account/feeds/activity';
import { AccountSectionState } from '@/features/account/shared/section-wrapper';
import AccountAction from '@/features/navigation/actions/account-action';
import { createAccountSectionRegistry, createAccountSectionView } from '../../shared/section-factory';

export const Registry = createAccountSectionRegistry({
  displayName: 'AccountActivityRegistry',
  navDescription: 'Activity Feed',
  navRegistrySource: 'account-activity',
  resolveOverrides: (sectionState, { activeScope = 'user', onScopeChange = () => {} }) => {
    if (!sectionState.canViewProfileCollections && !sectionState.isOwner) {
      return {
        navActionOverride: null,
      };
    }

    return {
      navActionOverride: (
        <AccountAction
          mode="tab-switch"
          activeTab={activeScope}
          tabs={[
            {
              key: 'user',
              label: sectionState.profile?.username || sectionState.username || 'User',
            },
            { key: 'following', label: 'Following' },
          ]}
          onTabChange={onScopeChange}
          followState={sectionState.followState}
          isFollowLoading={sectionState.isFollowLoading}
          isOwner={sectionState.isOwner}
          onFollow={sectionState.handleFollow}
          showProfileFollowAction
        />
      ),
    };
  },
});

export default createAccountSectionView({
  activeSection: 'activity',
  displayName: 'AccountActivityView',
  Registry,
  resolveRegistryProps: (_, { activeScope, onScopeChange }) => ({
    activeScope,
    onScopeChange,
  }),
  skeletonVariant: 'activity',
  renderContent: (
    sectionState,
    {
      activeScope,
      activityFilters,
      currentPage,
      feedError,
      isFeedLoading,
      items,
      onFiltersChange,
      onPageChange,
      totalCount,
    }
  ) =>
    sectionState.canViewProfileCollections ? (
      <AccountActivityFeed
        emptyMessage={activeScope === 'following' ? 'No following activity yet' : 'No activity yet'}
        currentPage={currentPage}
        filters={activityFilters}
        icon="solar:bolt-bold"
        isLoading={isFeedLoading}
        items={items}
        loadError={feedError}
        onFiltersChange={onFiltersChange}
        onPageChange={onPageChange}
        showHeader={false}
        totalCount={totalCount}
        title={
          activeScope === 'following'
            ? 'Following Activity'
            : sectionState.isOwner
              ? 'Your Activity'
              : 'Recent Activity'
        }
      />
    ) : (
      <AccountSectionState message="This profile is private." />
    ),
});
