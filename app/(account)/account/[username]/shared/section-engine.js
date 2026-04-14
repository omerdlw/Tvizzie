'use client';

import { useMemo } from 'react';

import { useAccountSectionPage } from '@/features/account/hooks/section-page';

const EMPTY_ROUTE_DATA = Object.freeze({});

export function useAccountSectionEngine({
  activeListId = '',
  activeTab,
  auth,
  collectionPreviewLimits = null,
  routeData = null,
  selectedList = null,
}) {
  const resolvedRouteData = useMemo(() => {
    if (!routeData || typeof routeData !== 'object') {
      return EMPTY_ROUTE_DATA;
    }

    return routeData;
  }, [routeData]);
  const rawSectionState = useAccountSectionPage({
    activeListId,
    activeTab,
    auth,
    collectionPreviewLimits,
    initialCollections: resolvedRouteData.initialCollections ?? null,
    initialProfile: resolvedRouteData.initialProfile ?? null,
    initialResolvedUserId: resolvedRouteData.initialResolvedUserId ?? null,
    initialResolveError: resolvedRouteData.initialResolveError ?? null,
    selectedList,
    username: resolvedRouteData.username,
  });
  const sectionState = useMemo(
    () => ({
      ...rawSectionState,
      username: resolvedRouteData.username ?? null,
    }),
    [rawSectionState, resolvedRouteData.username]
  );
  const sectionProviderValue = useMemo(() => ({ auth, ...sectionState }), [auth, sectionState]);

  return {
    routeData: resolvedRouteData,
    sectionProviderValue,
    sectionState,
  };
}
