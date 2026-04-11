'use client';

import AccountListCard from '@/features/account/lists/card';
import AccountSectionLayout from '../shared/section-wrapper';

const OVERVIEW_LIST_LIMIT = 3;

export default function AccountListsOverview({
  emptyMessage = 'No lists yet',
  icon = 'solar:list-broken',
  items = [],
  ownerUsername = null,
  showSeeMore = false,
  summaryLabel = null,
  title = 'Lists',
  titleHref = null,
  username,
}) {
  const visibleLists = Array.isArray(items) ? items.slice(0, OVERVIEW_LIST_LIMIT) : [];
  const resolvedOwnerUsername = ownerUsername || username || null;

  return (
    <AccountSectionLayout
      icon={icon}
      showSeeMore={showSeeMore}
      summaryLabel={summaryLabel}
      title={title}
      titleHref={titleHref || (username ? `/account/${username}/lists` : null)}
    >
      {visibleLists.length > 0 ? (
        <div className="grid w-full grid-cols-1 gap-x-6 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
          {visibleLists.map((list, index) => (
            <AccountListCard
              key={`${list?.ownerId || list?.ownerSnapshot?.id || resolvedOwnerUsername || 'owner'}-${list?.id || list?.slug || index}`}
              list={list}
              ownerUsername={resolvedOwnerUsername}
            />
          ))}
        </div>
      ) : (
        <div className="border border-black/15 bg-white/40 p-4 text-sm text-black/70 backdrop-blur-sm">
          {emptyMessage}
        </div>
      )}
    </AccountSectionLayout>
  );
}
