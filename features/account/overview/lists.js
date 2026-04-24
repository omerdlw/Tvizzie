'use client';

import AccountListCard from '@/features/account/lists/card';
import Icon from '@/ui/icon';
import AccountInlineSectionState from '../shared/section-state';
import AccountSectionLayout from '../shared/section-wrapper';

const OVERVIEW_LIST_LIMIT = 3;

export default function AccountListsOverview({
  emptyMessage = 'No lists yet',
  icon = 'solar:list-broken',
  items = [],
  isOwner = false,
  onDeleteList = null,
  onEditList = null,
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
              renderActions={
                isOwner && (typeof onDeleteList === 'function' || typeof onEditList === 'function')
                  ? (targetList) => (
                      <div className="flex items-center gap-1.5">
                        {typeof onEditList === 'function' ? (
                          <button
                            type="button"
                            aria-label={`Edit ${targetList.title}`}
                            onClick={() => onEditList(targetList)}
                            className="bg-primary/30 hover:bg-primary/60 flex size-8 items-center justify-center rounded-[10px] border border-black/10 text-black/70 transition-colors hover:border-black/20"
                          >
                            <Icon icon="solar:pen-bold" size={13} />
                          </button>
                        ) : null}
                        {typeof onDeleteList === 'function' ? (
                          <button
                            type="button"
                            aria-label={`Delete ${targetList.title}`}
                            onClick={() => onDeleteList(targetList)}
                            className="bg-primary/30 hover:bg-error flex size-8 items-center justify-center rounded-[10px] border border-black/10 text-black/70 transition-colors hover:border-error hover:text-white"
                          >
                            <Icon icon="solar:trash-bin-trash-bold" size={13} />
                          </button>
                        ) : null}
                      </div>
                    )
                  : null
              }
            />
          ))}
        </div>
      ) : (
        <AccountInlineSectionState>{emptyMessage}</AccountInlineSectionState>
      )}
    </AccountSectionLayout>
  );
}
