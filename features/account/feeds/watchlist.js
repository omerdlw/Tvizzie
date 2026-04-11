'use client';

import AccountMediaGridPage, { AccountProfileMediaActions } from '@/features/account/shared/media-grid';
import { AccountSectionState } from '@/features/account/shared/section-wrapper';

export default function AccountWatchlistFeed({
  auth,
  canShowWatchlistGrid,
  currentPage,
  isOwner,
  watchlist,
  username,
  onRemoveItem,
}) {
  if (!canShowWatchlistGrid) {
    return <AccountSectionState message="This profile is private." />;
  }

  return (
    <AccountMediaGridPage
      currentPage={currentPage}
      emptyMessage="No watchlist yet"
      icon="solar:bookmark-bold"
      items={watchlist}
      pageBasePath={`/account/${username}/watchlist`}
      renderOverlay={(item) =>
        isOwner ? (
          <AccountProfileMediaActions
            media={item}
            onRemoveItem={onRemoveItem}
            removeLabel={`Remove ${item.title || item.name} from watchlist`}
            userId={auth.user?.id || null}
          />
        ) : null
      }
      title="Watchlist"
    />
  );
}
