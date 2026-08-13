'use client';

import AccountListCard from '@/domains/account/ui/components/lists/list-card';
import Icon from '@/ui/primitives/icon';
import {
  AccountInlineSectionState,
  AccountInlineSectionLoading,
} from '@/domains/account/ui/sections/account-section';
import AccountSectionLayout from '@/domains/account/ui/sections/account-section';
import { AccountReveal } from '@/app/(account)/motion';
const OVERVIEW_LIST_LIMIT = 6;
export default function AccountListsOverview({
  emptyMessage = 'No lists yet',
  icon = 'solar:list-broken',
  isLoading = false,
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
      {isLoading && visibleLists.length === 0 ? (
        <AccountInlineSectionLoading variant="list" />
      ) : visibleLists.length > 0 ? (
        <div className="grid w-full grid-cols-1 gap-x-6 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
          {visibleLists.map((list, index) => {
            return (
              <AccountReveal
                key={`${list?.ownerId || list?.ownerSnapshot?.id || resolvedOwnerUsername || 'owner'}-${list?.id || list?.slug || index}`}
                deferred
                interactive
                itemIndex={index}
                stage="item.list"
              >
                <AccountListCard
                  list={list}
                  ownerUsername={resolvedOwnerUsername}
                  renderActions={
                    isOwner &&
                    (typeof onDeleteList === 'function' || typeof onEditList === 'function')
                      ? (targetList) => (
                          <div className="flex items-center gap-1.5">
                            {typeof onEditList === 'function' ? (
                              <button
                                type="button"
                                aria-label={`Edit ${targetList.title}`}
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  onEditList(targetList);
                                }}
                                className="bg-primary/30 hover:bg-primary/60 flex size-8 items-center justify-center border border-black/10 text-black/70 hover:border-black/20"
                              >
                                <Icon icon="solar:pen-bold" size={13} />
                              </button>
                            ) : null}
                            {typeof onDeleteList === 'function' ? (
                              <button
                                type="button"
                                aria-label={`Delete ${targetList.title}`}
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  onDeleteList(targetList);
                                }}
                                className="bg-primary/30 hover:bg-error hover:border-error flex size-8 items-center justify-center border border-black/10 text-black/70 hover:text-white"
                              >
                                <Icon icon="solar:trash-bin-trash-bold" size={13} />
                              </button>
                            ) : null}
                          </div>
                        )
                      : null
                  }
                />
              </AccountReveal>
            );
          })}
        </div>
      ) : (
        <AccountInlineSectionState>{emptyMessage}</AccountInlineSectionState>
      )}
    </AccountSectionLayout>
  );
}
