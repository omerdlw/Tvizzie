import AccountWatchlistFeed from '@/features/account/feeds/watchlist';
import { AccountPageShell } from '@/features/account/shared/layout';
import { buildAccountPageShellProps, useAccountSectionState } from '../shared/section-context';
import Registry from './registry';

export default function WatchlistView({ watchlist, handleRequestRemoveWatchlistItem }) {
  const sectionState = useAccountSectionState();
  const shellProps = buildAccountPageShellProps(sectionState, {
    activeSection: 'watchlist',
    skeletonVariant: 'collection',
  });

  return (
    <AccountPageShell {...shellProps} registry={<Registry />}>
      <AccountWatchlistFeed
        auth={sectionState.auth}
        canShowWatchlistGrid={sectionState.canViewProfileCollections}
        isOwner={sectionState.isOwner}
        onRemoveItem={handleRequestRemoveWatchlistItem}
        watchlist={watchlist}
      />
    </AccountPageShell>
  );
}
