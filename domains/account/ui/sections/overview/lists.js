'use client';

import AccountListCard from '@/domains/account/ui/components/lists/list-card';
import { Button } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';
import {
  AccountInlineSectionState,
  AccountInlineSectionLoading,
} from '@/domains/account/ui/sections/account-section';
import AccountSectionLayout from '@/domains/account/ui/sections/account-section';
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleLists.map((list, index) => {
            return (
              <AccountListCard
                key={`${list?.ownerId || list?.ownerSnapshot?.id || resolvedOwnerUsername || 'owner'}-${list?.id || list?.slug || index}`}
                list={list}
                ownerUsername={resolvedOwnerUsername}
                renderActions={
                  isOwner &&
                  (typeof onDeleteList === 'function' || typeof onEditList === 'function')
                    ? (targetList) => (
                        <div className="flex items-center gap-1">
                          {typeof onEditList === 'function' ? (
                            <Button
                              type="button"
                              aria-label={`Edit ${targetList.title}`}
                              className="center size-7 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                onEditList(targetList);
                              }}
                            >
                              <Icon icon="solar:pen-bold" size={13} />
                            </Button>
                          ) : null}
                          {typeof onDeleteList === 'function' ? (
                            <Button
                              type="button"
                              aria-label={`Delete ${targetList.title}`}
                              className="center size-7 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                onDeleteList(targetList);
                              }}
                            >
                              <Icon icon="solar:trash-bin-trash-bold" size={13} />
                            </Button>
                          ) : null}
                        </div>
                      )
                    : null
                }
              />
            );
          })}
        </div>
      ) : (
        <AccountInlineSectionState>{emptyMessage}</AccountInlineSectionState>
      )}
    </AccountSectionLayout>
  );
}
