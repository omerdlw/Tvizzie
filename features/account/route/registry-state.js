'use client';

import AccountBioSurface from '@/features/navigation/surfaces/account-bio-surface';
import { EMPTY_ACCOUNT_REGISTRY_AUTH, buildAccountPageState } from '@/features/account/registry-config';

function buildAccountBioSurface({ isBioSurfaceOpen = false, profile = null, setIsBioSurfaceOpen }) {
  if (!isBioSurfaceOpen || !profile?.description) {
    return undefined;
  }

  return (
    <AccountBioSurface
      title={profile?.displayName || 'About'}
      description={profile.description}
      onClose={() => setIsBioSurfaceOpen(false)}
    />
  );
}

export function buildAccountRegistryState(sectionState = null, overrides = null) {
  const {
    auth = EMPTY_ACCOUNT_REGISTRY_AUTH,
    followState = 'follow',
    handleEditProfile,
    handleFollow,
    handleOpenFollowList,
    handleSignInRequest,
    isBioSurfaceOpen = false,
    isFollowLoading = false,
    isOwner = false,
    isPageLoading = false,
    isResolvingProfile = false,
    itemRemoveConfirmation = null,
    pendingFollowRequestCount = 0,
    profile = null,
    resolveError = null,
    setIsBioSurfaceOpen,
    unfollowConfirmation = null,
    username,
  } = sectionState || {};

  return buildAccountPageState({
    authIsAuthenticated: auth.isAuthenticated,
    authUser: auth.user || null,
    followState,
    handleEditProfile,
    handleFollow,
    handleOpenFollowList,
    handleSignInRequest,
    extraNavActions: overrides?.extraNavActions ?? [],
    isFollowLoading,
    isOwner,
    isPageLoading: overrides?.isPageLoading ?? isPageLoading,
    isResolvingProfile,
    isSectionEditing: false,
    isSectionOrderDirty: false,
    isSectionSaveLoading: false,
    itemRemoveConfirmation,
    listDeleteConfirmation: overrides?.listDeleteConfirmation ?? null,
    navActionOverride: overrides?.navActionOverride ?? null,
    navDescription: overrides?.navDescription ?? null,
    navSurface:
      overrides && Object.hasOwn(overrides, 'navSurface')
        ? overrides.navSurface
        : buildAccountBioSurface({
            isBioSurfaceOpen,
            profile,
            setIsBioSurfaceOpen,
          }),
    navRegistrySource: overrides?.navRegistrySource,
    onDeleteList: overrides?.onDeleteList,
    onEditList: overrides?.onEditList,
    onSaveSectionOrder: null,
    onToggleLike: overrides?.onToggleLike,
    pendingFollowRequestCount,
    profile,
    resolveError,
    reviewState: overrides?.reviewState,
    showProfileFollowAction: overrides?.showProfileFollowAction ?? true,
    showToolbarFollowActionWithOverride: overrides?.showToolbarFollowActionWithOverride,
    unfollowConfirmation,
    username,
    isLiked: overrides?.isLiked ?? false,
    isLikeLoading: overrides?.isLikeLoading ?? false,
  });
}
