import AccountActivityFeed from '@/features/account/feeds/activity';
import { AccountPageShell } from '@/features/account/shared/layout';
import { AccountSectionState } from '@/features/account/shared/section-wrapper';
import { buildAccountPageShellProps, useAccountSectionState } from '../shared/section-context';
import Registry from './registry';

export default function ActivityView({
  activeScope,
  activityFilters,
  currentPage,
  feedError,
  isFeedLoading,
  items,
  onFiltersChange,
  onPageChange,
  onScopeChange,
  totalCount,
}) {
  const sectionState = useAccountSectionState();
  const shellProps = buildAccountPageShellProps(sectionState, {
    activeSection: 'activity',
    skeletonVariant: 'activity',
  });

  return (
    <AccountPageShell
      {...shellProps}
      registry={
        <Registry
          activeScope={activeScope}
          canShowActivity={sectionState.canViewProfileCollections}
          onScopeChange={onScopeChange}
        />
      }
    >
      {sectionState.canViewProfileCollections ? (
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
          title={activeScope === 'following' ? 'Following Activity' : 'Your Activity'}
          variant="showcase"
        />
      ) : (
        <AccountSectionState message="This profile is private." />
      )}
    </AccountPageShell>
  );
}
