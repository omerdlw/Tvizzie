'use client';

import AccountMediaGridPage, { AccountProfileMediaActions } from '@/features/account/profile/media-grid';
import { AccountSectionState } from '@/features/account/profile/section-wrapper';

export default function AccountWatchedFeed({
  auth,
  canShowWatchedGrid,
  currentPage,
  isOwner,
  loadError,
  watchedItems,
  username,
  onRemoveItem,
}) {
  if (!canShowWatchedGrid) {
    return <AccountSectionState message="This profile is private." />;
  }

  if (loadError) {
    return <AccountSectionState message={loadError} />;
  }

  return (
    <AccountMediaGridPage
      currentPage={currentPage}
      emptyMessage="No watched films yet"
      icon="solar:eye-bold"
      items={watchedItems}
      pageBasePath={`/account/${username}/watched`}
      renderOverlay={(item) =>
        isOwner ? (
          <AccountProfileMediaActions
            media={item}
            onRemoveItem={onRemoveItem}
            removeLabel={`Remove ${item.title || item.name} from watched`}
            userId={auth.user?.id || null}
          />
        ) : null
      }
      title="Watched"
    />
  );
}
