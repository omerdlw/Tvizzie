import AccountWatchedFeed from '@/features/account/feeds/watched';
import { AccountPageShell } from '@/features/account/shared/layout';
import { buildAccountPageShellProps, useAccountSectionState } from '../shared/section-context';
import Registry from './registry';

export default function WatchedView({ loadError, watchedItems, handleRequestRemoveWatchedItem }) {
  const sectionState = useAccountSectionState();
  const shellProps = buildAccountPageShellProps(sectionState, {
    activeSection: 'watched',
    skeletonVariant: 'collection',
  });

  return (
    <AccountPageShell {...shellProps} registry={<Registry />}>
      <AccountWatchedFeed
        auth={sectionState.auth}
        canShowWatchedGrid={sectionState.canViewProfileCollections}
        isOwner={sectionState.isOwner}
        loadError={loadError}
        watchedItems={watchedItems}
        onRemoveItem={handleRequestRemoveWatchedItem}
      />
    </AccountPageShell>
  );
}
