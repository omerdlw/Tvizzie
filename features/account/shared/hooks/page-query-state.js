'use client';

import { startTransition, useCallback, useEffect, useState } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { PROFILE_TABS } from '../../utils';

export function useAccountPageQueryState({ activeTabProp }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState(() =>
    activeTabProp && PROFILE_TABS.includes(activeTabProp) ? activeTabProp : 'likes'
  );

  const activeListId = searchParams.get('list') || '';

  useEffect(() => {
    if (activeTabProp && PROFILE_TABS.includes(activeTabProp)) {
      setActiveTab((prev) => (prev === activeTabProp ? prev : activeTabProp));
      return;
    }

    const tabParam = searchParams.get('tab');
    const nextTab = tabParam && PROFILE_TABS.includes(tabParam) ? tabParam : 'likes';

    setActiveTab((prev) => (prev === nextTab ? prev : nextTab));
  }, [activeTabProp, searchParams]);

  const updateQuery = useCallback(
    (nextEntries = {}) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(nextEntries).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      const query = params.toString();

      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        });
      });
    },
    [pathname, router, searchParams]
  );

  const handleTabChange = useCallback(
    (tab) => {
      setActiveTab(tab);
      updateQuery({
        tab: tab === 'likes' ? null : tab,
        list: null,
      });
    },
    [updateQuery]
  );

  return {
    activeListId,
    activeTab,
    handleTabChange,
    updateQuery,
  };
}
