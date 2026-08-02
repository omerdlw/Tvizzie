'use client';

import {
  buildAccountPageState,
} from '@/app/(account)/registry';

export const EMPTY_ACCOUNT_REGISTRY_AUTH = Object.freeze({
  isAuthenticated: false,
});

export function noopAccountRegistryHandler() {}

export function buildAccountRegistryState(sectionState = null, overrides = null) {
  const {
    auth = EMPTY_ACCOUNT_REGISTRY_AUTH,
    followState = 'follow',
    handleEditProfile,
    handleFollow,
    handleOpenFollowList,
    handleSignInRequest,
    isFollowLoading = false,
    isOwner = false,
    isPageLoading = false,
    isResolvingProfile = false,
    itemRemoveConfirmation = null,
    listDeleteConfirmation = null,
    pendingFollowRequestCount = 0,
    profile = null,
    resolveError = null,
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
    itemRemoveConfirmation: overrides?.itemRemoveConfirmation ?? itemRemoveConfirmation,
    listDeleteConfirmation: overrides?.listDeleteConfirmation ?? listDeleteConfirmation,
    navActionOverride: overrides?.navActionOverride ?? null,
    navDescription: overrides?.navDescription ?? null,
    navSurface: overrides?.navSurface ?? null,
    navRegistrySource: overrides?.navRegistrySource,
    onDeleteList: overrides?.onDeleteList,
    onEditList: overrides?.onEditList,
    onOpenReviewComposer: overrides?.onOpenReviewComposer,
    ownReview: overrides?.ownReview,
    onSaveSectionOrder: null,
    onToggleLike: overrides?.onToggleLike,
    pendingFollowRequestCount,
    profile,
    resolveError,
    reviewState: overrides?.reviewState,
    showProfileFollowAction: overrides?.showProfileFollowAction ?? true,
    showToolbarFollowActionWithOverride: overrides?.showToolbarFollowActionWithOverride,
    unfollowConfirmation: overrides?.unfollowConfirmation ?? unfollowConfirmation,
    username,
    isLiked: overrides?.isLiked ?? false,
    isLikeLoading: overrides?.isLikeLoading ?? false,
  });
}
