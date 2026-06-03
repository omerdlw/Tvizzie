'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { LIST_FILTER_QUERY_KEYS, buildCollectionBasePath, buildManagedQueryString, hasActiveListFilters, parseListFilters, parsePageFromSearch, sortProfileLists, toListQueryValues } from '@/features/account/filtering';
import { AccountListSortBar } from '@/features/account/filters/content-filter-primitives';
import AccountPaginatedListGrid from '@/features/account/lists/grid';
import { AccountSectionState } from '@/features/account/components/section-wrapper';
import { Button } from '@/ui/elements';
import Icon from '@/ui/icon';
const LISTS_PAGE_ITEMS_PER_PAGE = 18;
export default function AccountListsFeed({
  canShowLists,
  isOwner,
  lists,
  username,
  onDeleteList,
  onEditList
}) {
  const pathname = usePathname();
  const searchString = useSearchParams()?.toString?.() || '';
  const collectionRootPath = buildCollectionBasePath(pathname);
  const [viewState, setViewState] = useState({
    sort: parseListFilters(new URLSearchParams(searchString)).sort,
    page: parsePageFromSearch(new URLSearchParams(searchString))
  });
  useEffect(() => {
    setViewState({
      sort: parseListFilters(new URLSearchParams(searchString)).sort,
      page: parsePageFromSearch(new URLSearchParams(searchString))
    });
  }, [searchString]);
  const updateView = updates => {
    setViewState(prev => {
      const next = {
        ...prev,
        ...updates
      };
      if (typeof window !== 'undefined') {
        const qs = buildManagedQueryString(new URLSearchParams(window.location.search), {
          managedKeys: LIST_FILTER_QUERY_KEYS,
          resetPage: false,
          values: toListQueryValues({
            sort: next.sort
          })
        });
        const params = new URLSearchParams(qs);
        if (next.page > 1) params.set('page', String(next.page));else params.delete('page');
        window.history.replaceState({}, '', params.toString() ? `${collectionRootPath}?${params.toString()}` : collectionRootPath);
      }
      return next;
    });
  };
  if (!canShowLists) return <AccountSectionState message="This profile is private." />;
  const hasFilters = hasActiveListFilters({
    sort: viewState.sort
  });
  return <AccountPaginatedListGrid currentPage={viewState.page} emptyMessage="No lists yet" icon="solar:list-broken" itemsPerPage={LISTS_PAGE_ITEMS_PER_PAGE} lists={sortProfileLists(lists, viewState.sort)} onPageChange={page => updateView({
    page
  })} ownerUsername={username} pageBasePath={collectionRootPath} showHeader={false} renderActions={list => isOwner ? <ListCardOwnerActions list={list} onDelete={onDeleteList} onEdit={onEditList} /> : null} title="Lists" toolbar={<AccountListSortBar sort={viewState.sort} onChange={sort => updateView({
    sort,
    page: 1
  })} onReset={lists.length > 0 && hasFilters || hasFilters ? () => updateView({
    sort: parseListFilters(new URLSearchParams()).sort,
    page: 1
  }) : null} />} />;
}
function ListCardOwnerActions({
  list,
  onDelete,
  onEdit
}) {
  return <div className="flex items-center gap-1.5">
      <button type="button" aria-label={`Edit ${list.title}`} onClick={e => {
      e.preventDefault();
      e.stopPropagation();
      onEdit(list);
    }} className="bg-primary/30 hover:bg-primary/60 flex size-8 items-center justify-center border border-black/10 text-black/70 hover:border-black/20">
        <Icon icon="solar:pen-bold" size={13} />
      </button>
      <Button variant="destructive-icon" aria-label={`Delete ${list.title}`} onClick={e => {
      e.preventDefault();
      e.stopPropagation();
      onDelete(list);
    }} className="size-8">
        <Icon icon="solar:trash-bin-trash-bold" size={13} />
      </Button>
    </div>;
}
