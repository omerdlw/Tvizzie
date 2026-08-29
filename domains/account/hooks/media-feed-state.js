'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  MEDIA_FILTER_QUERY_KEYS,
  buildCollectionBasePath,
  buildManagedQueryString,
  parseMediaFilters,
  parsePageFromSearch,
  toMediaQueryValues,
} from '@/domains/account/ui/filters/filtering';

function parseMediaFeedState(searchString, allowedEyeFlags) {
  const params = new URLSearchParams(searchString);
  return {
    media: parseMediaFilters(params, { allowedEyeFlags }),
    page: parsePageFromSearch(params),
  };
}

export function useAccountMediaFeedState({ allowedEyeFlags }) {
  const pathname = usePathname();
  const searchString = useSearchParams()?.toString?.() || '';
  const collectionRootPath = buildCollectionBasePath(pathname);
  const [viewState, setViewState] = useState(() =>
    parseMediaFeedState(searchString, allowedEyeFlags),
  );

  useEffect(() => {
    setViewState(parseMediaFeedState(searchString, allowedEyeFlags));
  }, [allowedEyeFlags, searchString]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const queryString = buildManagedQueryString(new URLSearchParams(window.location.search), {
      managedKeys: MEDIA_FILTER_QUERY_KEYS,
      resetPage: false,
      values: toMediaQueryValues(viewState.media),
    });
    const params = new URLSearchParams(queryString);
    if (viewState.page > 1) params.set('page', String(viewState.page));
    else params.delete('page');

    const nextUrl = params.toString()
      ? `${collectionRootPath}?${params.toString()}`
      : collectionRootPath;
    if (`${window.location.pathname}${window.location.search}` !== nextUrl) {
      window.history.replaceState({}, '', nextUrl);
    }
  }, [collectionRootPath, viewState]);

  return {
    collectionRootPath,
    updateView: (updates) => setViewState((current) => ({ ...current, ...updates })),
    viewState,
  };
}
