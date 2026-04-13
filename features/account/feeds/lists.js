'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { usePathname, useSearchParams } from 'next/navigation';

import {
  LIST_FILTER_QUERY_KEYS,
  buildCollectionBasePath,
  buildManagedQueryString,
  hasActiveListFilters,
  parseListFilters,
  sortProfileLists,
  toListQueryValues,
} from '@/features/account/filtering';
import { AccountListSortBar } from '@/features/account/shared/content-filters';
import AccountPaginatedListGrid from '@/features/account/lists/grid';
import { AccountSectionState } from '@/features/account/shared/section-wrapper';
import { Button } from '@/ui/elements';
import Icon from '@/ui/icon';

const LISTS_PAGE_ITEMS_PER_PAGE = 18;

function ListCardOwnerActions({ list, onDelete, onEdit }) {
  const handleEditClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onEdit(list);
  };

  const handleDeleteClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onDelete(list);
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        aria-label={`Edit ${list.title}`}
        onClick={handleEditClick}
        className="bg-primary/40 hover:bg-primary/70 flex size-8 items-center justify-center rounded-[12px] border border-black/10 text-black/70 transition-colors hover:border-black/20"
      >
        <Icon icon="solar:pen-bold" size={13} />
      </button>
      <Button
        variant="destructive-icon"
        aria-label={`Delete ${list.title}`}
        onClick={handleDeleteClick}
        className="size-8 rounded-[12px]"
      >
        <Icon icon="solar:trash-bin-trash-bold" size={13} />
      </Button>
    </div>
  );
}

export default function AccountListsFeed({
  canShowLists,
  isOwner,
  lists,
  username,
  onDeleteList,
  onEditList,
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams?.toString?.() || '';
  const initialListFilters = useMemo(() => parseListFilters(new URLSearchParams(searchParamsKey)), [searchParamsKey]);
  const initialPage = useMemo(() => {
    const parsed = Number(new URLSearchParams(searchParamsKey).get('page') || '1');
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
  }, [searchParamsKey]);
  const [listFilters, setListFilters] = useState(initialListFilters);
  const [activePage, setActivePage] = useState(initialPage);
  const collectionRootPath = useMemo(() => buildCollectionBasePath(pathname), [pathname]);
  const sortedLists = useMemo(() => sortProfileLists(lists, listFilters.sort), [listFilters.sort, lists]);
  useEffect(() => {
    setListFilters(initialListFilters);
    setActivePage(initialPage);
  }, [initialListFilters, initialPage, searchParamsKey]);

  const updateUrl = useCallback(
    (nextSort, nextPage) => {
      if (typeof window === 'undefined') {
        return;
      }

      const queryString = buildManagedQueryString(new URLSearchParams(window.location.search), {
        managedKeys: LIST_FILTER_QUERY_KEYS,
        resetPage: false,
        values: toListQueryValues({ sort: nextSort }),
      });
      const params = new URLSearchParams(queryString);

      if (nextPage > 1) {
        params.set('page', String(nextPage));
      } else {
        params.delete('page');
      }

      const nextQuery = params.toString();
      window.history.replaceState({}, '', nextQuery ? `${collectionRootPath}?${nextQuery}` : collectionRootPath);
    },
    [collectionRootPath]
  );

  const handleSortChange = useCallback(
    (nextSort) => {
      setListFilters({ sort: nextSort });
      setActivePage(1);
      updateUrl(nextSort, 1);
    },
    [updateUrl]
  );

  const handleResetFilters = useCallback(() => {
    const defaultSort = parseListFilters(new URLSearchParams()).sort;
    setListFilters({ sort: defaultSort });
    setActivePage(1);
    updateUrl(defaultSort, 1);
  }, [updateUrl]);

  const handlePageChange = useCallback(
    (nextPage) => {
      setActivePage(nextPage);
      updateUrl(listFilters.sort, nextPage);
    },
    [listFilters.sort, updateUrl]
  );

  if (!canShowLists) {
    return <AccountSectionState message="This profile is private." />;
  }

  return (
    <AccountPaginatedListGrid
      currentPage={activePage}
      emptyMessage="No lists yet"
      icon="solar:list-broken"
      itemsPerPage={LISTS_PAGE_ITEMS_PER_PAGE}
      lists={sortedLists}
      onPageChange={handlePageChange}
      ownerUsername={username}
      pageBasePath={collectionRootPath}
      showHeader={false}
      renderActions={(list) =>
        isOwner ? <ListCardOwnerActions list={list} onDelete={onDeleteList} onEdit={onEditList} /> : null
      }
      title="Lists"
      toolbar={
        <AccountListSortBar
          sort={listFilters.sort}
          onChange={handleSortChange}
          onReset={hasActiveListFilters(listFilters) ? handleResetFilters : null}
        />
      }
    />
  );
}
