'use client';

import { createContext, useContext, useMemo } from 'react';

import { useAccountSectionPage } from '@/features/account/hooks/section-page';
import { EMPTY_ACCOUNT_REGISTRY_AUTH, noopAccountRegistryHandler } from '@/features/account/registry-config';

const DEFAULT_ACCOUNT_SECTION_STATE = Object.freeze({
  auth: EMPTY_ACCOUNT_REGISTRY_AUTH,
  canViewProfileCollections: false,
  followerCount: 0,
  followingCount: 0,
  followState: 'follow',
  handleEditProfile: noopAccountRegistryHandler,
  handleFollow: noopAccountRegistryHandler,
  handleOpenFollowList: noopAccountRegistryHandler,
  handleSignInRequest: noopAccountRegistryHandler,
  isBioSurfaceOpen: false,
  isFollowLoading: false,
  isOwner: false,
  isPageLoading: false,
  isResolvingProfile: false,
  itemRemoveConfirmation: null,
  likeCount: 0,
  listCount: 0,
  navDescription: null,
  pendingFollowRequestCount: 0,
  profile: null,
  profileHandle: null,
  resolveError: null,
  resolvedUserId: null,
  setIsBioSurfaceOpen: noopAccountRegistryHandler,
  unfollowConfirmation: null,
  username: null,
  watchlistCount: 0,
});
const EMPTY_ROUTE_DATA = Object.freeze({});

const AccountSectionStateContext = createContext(DEFAULT_ACCOUNT_SECTION_STATE);

export function useAccountSectionEngine({
  activeListId = '',
  activeTab,
  auth,
  collectionPreviewLimits = null,
  routeData = null,
  selectedList = null,
}) {
  const resolvedRouteData = routeData && typeof routeData === 'object' ? routeData : EMPTY_ROUTE_DATA;
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

export function AccountSectionStateProvider({ children, value = null }) {
  const resolvedValue = useMemo(
    () => ({
      ...DEFAULT_ACCOUNT_SECTION_STATE,
      ...(value ?? {}),
      auth: value?.auth || DEFAULT_ACCOUNT_SECTION_STATE.auth,
    }),
    [value]
  );

  return <AccountSectionStateContext.Provider value={resolvedValue}>{children}</AccountSectionStateContext.Provider>;
}

export function useAccountSectionState() {
  return useContext(AccountSectionStateContext);
}

export function buildAccountPageShellProps(sectionState, overrides = null) {
  return {
    activeSection: overrides?.activeSection ?? 'overview',
    followerCount: sectionState.followerCount,
    followState: sectionState.followState,
    followingCount: sectionState.followingCount,
    isLoading: sectionState.isPageLoading,
    isFollowLoading: sectionState.isFollowLoading,
    isOwner: sectionState.isOwner,
    likesCount: sectionState.likeCount,
    listsCount: sectionState.listCount,
    onFollow: sectionState.handleFollow,
    onOpenFollowList: sectionState.handleOpenFollowList,
    onReadMore: () => sectionState.setIsBioSurfaceOpen(true),
    profile: sectionState.profile,
    resolvedUserId: sectionState.resolvedUserId,
    skeletonVariant: overrides?.skeletonVariant ?? 'overview',
    username: sectionState.username,
    watchedCount: sectionState.profile?.watchedCount ?? 0,
    watchlistCount: sectionState.watchlistCount,
  };
}
